import httpStatus from 'http-status';
import {BillPaymentStatus, BillStatus, Prisma} from '@prisma/client';
import prisma from '../client';
import ApiError from '../utils/ApiError';
import {financialYear} from './bill.service';
import {CreateSupplierInput, RecordSupplierPaymentInput} from '../validations/supplier.validation';

export type Scope = {
  companyId: string;
  branchId: string;
  shopId?: string;
};

/*
 * Suppliers belong to a branch (one name per branch). What the branch owes a
 * supplier is worked out from the real records every time:
 *
 *   payable = opening balance not yet paid off
 *           + balance due on confirmed purchase bills from that supplier
 *
 * Purchase returns settled as "deduct from payable" already lower the bill's
 * balance due, so they are counted through the bills.
 */

const round2 = (v: number) => Math.round(v * 100) / 100;
const fmtShort = (d: Date) =>
  d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short', timeZone: 'Asia/Kolkata'});

/** Bill payments use the short codes the cash book reads */
const billMode = (mode: string) => {
  const m = mode.toLowerCase();
  if (m.includes('cash')) return 'CASH';
  if (m.includes('upi')) return 'UPI';
  if (m.includes('card')) return 'CARD';
  if (m.includes('cheque')) return 'CHEQUE';
  return 'BANK';
};

const billsOf = (scope: Scope, name: string) =>
  ({
    branchId: scope.branchId,
    supplierName: {equals: name.trim(), mode: 'insensitive'},
    status: BillStatus.CONFIRMED,
    deletedAt: null,
  }) satisfies Prisma.PurchaseBillWhereInput;

class SupplierService {
  private async findSupplier(scope: Scope, id: string) {
    const supplier = await prisma.supplier.findFirst({where: {id, branchId: scope.branchId}});
    if (!supplier) throw new ApiError(httpStatus.NOT_FOUND, 'Supplier not found');
    return supplier;
  }

  /** Opening balance minus payments made on account (not against a bill) */
  private async openingLeft(supplier: {id: string; openingBalance: number}) {
    const onAccount = await prisma.supplierPayment.aggregate({
      where: {supplierId: supplier.id, billId: null},
      _sum: {amount: true},
    });
    return Math.max(0, round2(supplier.openingBalance - (onAccount._sum.amount ?? 0)));
  }

  private async payableOf(scope: Scope, supplier: {id: string; name: string; openingBalance: number}) {
    const bills = await prisma.purchaseBill.aggregate({
      where: billsOf(scope, supplier.name),
      _sum: {balanceDue: true},
    });
    return round2((await this.openingLeft(supplier)) + (bills._sum.balanceDue ?? 0));
  }

  public async listSuppliers(scope: Scope, search?: string) {
    const q = search?.trim();
    const rows = await prisma.supplier.findMany({
      where: {
        branchId: scope.branchId,
        ...(q
          ? {
              OR: (['name', 'gstin', 'phone', 'city'] as const).map((f) => ({
                [f]: {contains: q, mode: 'insensitive' as const},
              })),
            }
          : {}),
      },
      orderBy: {name: 'asc'},
    });

    const items = await Promise.all(
      rows.map(async (r) => {
        const payable = await this.payableOf(scope, r);
        const days = parseInt(r.paymentTerms.replace(/\D/g, ''), 10) || 0;
        const oldestOpen = await prisma.purchaseBill.findFirst({
          where: {...billsOf(scope, r.name), balanceDue: {gt: 0}},
          orderBy: {billDate: 'asc'},
          select: {billDate: true},
        });
        const dueDate = oldestOpen
          ? new Date(oldestOpen.billDate.getTime() + days * 86_400_000)
          : null;
        return {
          id: r.id,
          name: r.name,
          contactPerson: r.contactPerson,
          phone: r.phone,
          email: r.email,
          gstin: r.gstin,
          city: r.city,
          state: r.state,
          address: r.address,
          paymentTerms: r.paymentTerms,
          openingBalance: r.openingBalance,
          payable,
          isOverdue: !!dueDate && payable > 0 && dueDate.getTime() < Date.now(),
          nextDue: dueDate && payable > 0 ? `Due ${fmtShort(dueDate)}` : r.paymentTerms,
          createdAt: r.createdAt,
        };
      }),
    );
    items.sort((a, b) => b.payable - a.payable || a.name.localeCompare(b.name));

    return {
      items,
      totalPayable: round2(items.reduce((t, s) => t + s.payable, 0)),
      suppliersCount: items.length,
    };
  }

  public async getSupplierLedger(scope: Scope, supplierId: string) {
    const supplier = await this.findSupplier(scope, supplierId);

    const [bills, onAccount, returns] = await Promise.all([
      prisma.purchaseBill.findMany({
        where: billsOf(scope, supplier.name),
        orderBy: {billDate: 'asc'},
        include: {payments: {orderBy: {paidAt: 'asc'}}},
      }),
      prisma.supplierPayment.findMany({
        where: {supplierId: supplier.id, billId: null},
        orderBy: {paymentDate: 'asc'},
      }),
      prisma.purchaseReturn.findMany({
        where: {
          branchId: scope.branchId,
          supplierName: {equals: supplier.name, mode: 'insensitive'},
          status: 'CONFIRMED',
          settleAs: 'DEDUCT_FROM_PAYABLE',
        },
        orderBy: {returnDate: 'asc'},
      }),
    ]);

    type Event = {id: string; at: Date; particulars: string; ref: string; credit: number | null; debit: number | null};
    const events: Event[] = [];
    if (supplier.openingBalance > 0) {
      events.push({
        id: `open-${supplier.id}`,
        at: supplier.createdAt,
        particulars: 'Opening balance',
        ref: '—',
        credit: supplier.openingBalance,
        debit: null,
      });
    }
    for (const b of bills) {
      events.push({id: `bill-${b.id}`, at: b.billDate, particulars: 'Purchase', ref: b.billNumber, credit: b.totalAmount, debit: null});
      for (const p of b.payments) {
        events.push({
          id: `bpay-${p.id}`,
          at: p.paidAt,
          particulars: `Payment · ${p.mode}`,
          ref: p.note?.match(/PY\/\S+/)?.[0] ?? b.billNumber,
          credit: null,
          debit: p.amount,
        });
      }
    }
    for (const p of onAccount) {
      events.push({id: `pay-${p.id}`, at: p.paymentDate, particulars: `Payment · ${p.paymentMode}`, ref: p.receiptNumber, credit: null, debit: p.amount});
    }
    for (const r of returns) {
      events.push({id: `ret-${r.id}`, at: r.returnDate, particulars: 'Purchase return · debit note', ref: r.returnNumber, credit: null, debit: r.totalAmount});
    }
    events.sort((a, b) => a.at.getTime() - b.at.getTime());

    let running = 0;
    const ledger = events.map((ev) => {
      running = round2(running + (ev.credit ?? 0) - (ev.debit ?? 0));
      return {
        id: ev.id,
        date: fmtShort(ev.at),
        rawDate: ev.at.toISOString(),
        particulars: ev.particulars,
        ref: ev.ref,
        credit: ev.credit,
        debit: ev.debit,
        balance: Math.max(0, running),
      };
    });

    const first = events[0]?.at ?? new Date();
    const last = events[events.length - 1]?.at ?? new Date();
    const payable = await this.payableOf(scope, supplier);

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        gstin: supplier.gstin,
        state: supplier.state,
        city: supplier.city,
        paymentTerms: supplier.paymentTerms,
        payable,
        isOverdue: false,
        nextDue: supplier.paymentTerms,
      },
      ledger,
      openBills: bills
        .filter((b) => b.balanceDue > 0)
        .map((b) => ({
          id: b.id,
          billNumber: b.billNumber,
          balanceDue: b.balanceDue,
          totalAmount: b.totalAmount,
          label: `${b.billNumber} (₹${b.balanceDue.toLocaleString('en-IN')})`,
        })),
      nextReceiptNumber: await this.getNextReceiptNumber(scope.branchId),
      statementPeriod: `Statement ${fmtShort(first)} – ${fmtShort(last)} ${last.getFullYear()}`,
    };
  }

  /** PY/26-27/0001, numbered per branch and financial year */
  public async getNextReceiptNumber(branchId: string, tx: Prisma.TransactionClient = prisma) {
    const prefix = `PY/${financialYear()}/`;
    const last = await tx.supplierPayment.findFirst({
      where: {branchId, receiptNumber: {startsWith: prefix}},
      orderBy: {receiptNumber: 'desc'},
      select: {receiptNumber: true},
    });
    const next = (parseInt(last?.receiptNumber.slice(prefix.length) ?? '0', 10) || 0) + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  public async createSupplier(scope: Scope, input: CreateSupplierInput) {
    const taken = await prisma.supplier.findFirst({
      where: {branchId: scope.branchId, name: {equals: input.name, mode: 'insensitive'}},
      select: {id: true},
    });
    if (taken) {
      const message = 'A supplier with this name already exists';
      throw new ApiError(httpStatus.CONFLICT, message, [{field: 'name', message}]);
    }
    return prisma.supplier.create({
      data: {
        ...input,
        payable: input.openingBalance,
        companyId: scope.companyId,
        branchId: scope.branchId,
        shopId: scope.shopId ?? null,
      },
    });
  }

  public async recordPayment(scope: Scope, actorId: string, input: RecordSupplierPaymentInput) {
    const supplier = await this.findSupplier(scope, input.supplierId);
    const paidAt = input.paymentDate ? new Date(input.paymentDate) : new Date();

    const receiptNumber = await prisma.$transaction(async (tx) => {
      const receipt = await this.getNextReceiptNumber(scope.branchId, tx);
      let bill: {id: string; billNumber: string; amountPaid: number; balanceDue: number} | null = null;

      if (input.billId || input.billNumber) {
        bill = await tx.purchaseBill.findFirst({
          where: {
            ...billsOf(scope, supplier.name),
            ...(input.billId ? {id: input.billId} : {billNumber: input.billNumber}),
          },
          select: {id: true, billNumber: true, amountPaid: true, balanceDue: true},
        });
        if (!bill) throw new ApiError(httpStatus.NOT_FOUND, 'Bill not found for this supplier');
        if (input.amount > bill.balanceDue) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            `Amount cannot be more than the bill's balance due (₹${bill.balanceDue})`,
          );
        }
        const amountPaid = round2(bill.amountPaid + input.amount);
        const balanceDue = round2(bill.balanceDue - input.amount);
        await tx.purchaseBill.update({
          where: {id: bill.id},
          data: {
            amountPaid,
            balanceDue,
            paymentStatus: balanceDue <= 0 ? BillPaymentStatus.PAID : BillPaymentStatus.PART_CREDIT,
            payments: {
              create: {
                mode: billMode(input.paymentMode),
                amount: input.amount,
                paidAt,
                paidById: actorId,
                note: `Receipt ${receipt}`,
                atBilling: false,
              },
            },
          },
        });
      } else {
        const left = await this.openingLeft(supplier);
        if (input.amount > left) {
          throw new ApiError(
            httpStatus.BAD_REQUEST,
            left > 0
              ? `Choose a bill, or pay at most the opening balance left (₹${left})`
              : 'Choose the bill this payment is for',
          );
        }
      }

      await tx.supplierPayment.create({
        data: {
          receiptNumber: receipt,
          supplierId: supplier.id,
          supplierName: supplier.name,
          billId: bill?.id ?? null,
          billNumber: bill?.billNumber ?? null,
          amount: input.amount,
          paymentMode: input.paymentMode,
          paidFrom: input.paidFrom ?? null,
          paymentDate: paidAt,
          utrChequeNo: input.utrChequeNo ?? null,
          tdsDeducted: input.tdsDeducted,
          notes: input.notes ?? null,
          companyId: scope.companyId,
          branchId: scope.branchId,
          shopId: scope.shopId ?? null,
          createdById: actorId,
        },
      });
      return receipt;
    });

    const newBalance = await this.payableOf(scope, supplier);
    await prisma.supplier.update({where: {id: supplier.id}, data: {payable: newBalance}});
    return {
      success: true,
      receiptNumber,
      amount: input.amount,
      newBalance,
      message: `Payment of ₹${input.amount.toLocaleString('en-IN')} recorded against ${receiptNumber}`,
    };
  }
}

export default new SupplierService();
