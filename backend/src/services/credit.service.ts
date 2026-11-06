import httpStatus from 'http-status';
import { randomUUID } from 'crypto';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import { ShopScope } from './shopProduct.service';
import { ReceivePaymentInput } from '../validations/credit.validation';

export interface CreditCustomerSummary {
  id: string;
  name: string;
  mobile: string;
  customerType: string;
  businessName: string | null;
  creditLimit: number;
  creditDays: number;
  balanceDue: number;
  billsCount: number;
  oldestBillDate: Date | null;
  daysOld: number;
  isOverdue: boolean;
  displayAge: string;
}

export interface StatementTransaction {
  id: string;
  date: string;
  type: 'SALE' | 'PAYMENT';
  particulars: string;
  ref: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

class CreditService {
  /**
   * Helper to compute financial year prefix, e.g. "26-27"
   */
  public getFinancialYear(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = date.getMonth(); // 0-indexed; Apr is 3
    const startYear = month >= 3 ? year : year - 1;
    const endYear = startYear + 1;
    return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
  }

  /**
   * Next Receipt Number format: RC/26-27/0044
   */
  public getNextReceiptNumber = async (scope: ShopScope): Promise<string> => {
    const fy = this.getFinancialYear();
    const count = await prisma.customerCreditPayment.count({
      where: {
        shopId: scope.shopId,
        receiptNumber: { startsWith: `RC/${fy}/` },
      },
    });
    // Offset by base sequence so realistic numbering starts e.g. at 0044
    const nextSeq = String(count + 44).padStart(4, '0');
    return `RC/${fy}/${nextSeq}`;
  };

  /**
   * Top stats metrics for Credit / Udhaar
   */
  public getMetrics = async (scope: ShopScope) => {
    const customers = await prisma.shopCustomer.findMany({
      where: {
        shopId: scope.shopId,
        balanceDue: { gt: 0 },
        isActive: true,
      },
    });

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    // Sum of collections this month
    const paymentsThisMonth = await prisma.customerCreditPayment.findMany({
      where: {
        shopId: scope.shopId,
        paidAt: { gte: startOfMonth },
      },
    });

    const collectedAmount = paymentsThisMonth.reduce((sum, p) => sum + p.amount, 0);
    const paymentsCount = paymentsThisMonth.length;

    // Calculate aging buckets
    let due0To15 = 0;
    let count0To15 = 0;
    let due16To30 = 0;
    let count16To30 = 0;
    let dueOver30 = 0;
    let countOver30 = 0;
    let totalDue = 0;

    for (const c of customers) {
      totalDue += c.balanceDue;

      // Find oldest unpaid bill for this customer
      const oldestBill = await prisma.salesBill.findFirst({
        where: {
          shopId: scope.shopId,
          customerPhone: c.mobile,
          balanceDue: { gt: 0 },
          status: 'CONFIRMED',
          deletedAt: null,
        },
        orderBy: { billDate: 'asc' },
      });

      const refDate = oldestBill ? new Date(oldestBill.billDate) : new Date(c.createdAt);
      const diffMs = now.getTime() - refDate.getTime();
      const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

      if (days <= 15) {
        due0To15 += c.balanceDue;
        count0To15++;
      } else if (days <= 30) {
        due16To30 += c.balanceDue;
        count16To30++;
      } else {
        dueOver30 += c.balanceDue;
        countOver30++;
      }
    }

    return {
      totalDue: Math.round(totalDue * 100) / 100,
      totalCustomers: customers.length,
      aging: {
        range0To15: {
          amount: Math.round(due0To15 * 100) / 100,
          count: count0To15,
        },
        range16To30: {
          amount: Math.round(due16To30 * 100) / 100,
          count: count16To30,
        },
        rangeOver30: {
          amount: Math.round(dueOver30 * 100) / 100,
          count: countOver30,
        },
      },
      collectedThisMonth: {
        amount: Math.round(collectedAmount * 100) / 100,
        paymentsCount,
      },
    };
  };

  /**
   * List customers with outstanding due
   */
  public getCustomersWithDue = async (
    scope: ShopScope,
    search?: string,
  ): Promise<CreditCustomerSummary[]> => {
    const q = search?.trim();
    const customers = await prisma.shopCustomer.findMany({
      where: {
        shopId: scope.shopId,
        balanceDue: { gt: 0 },
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: 'insensitive' } },
                { mobile: { contains: q } },
                { businessName: { contains: q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      orderBy: { balanceDue: 'desc' },
    });

    const now = new Date();
    const result: CreditCustomerSummary[] = [];

    for (const c of customers) {
      // Find open bills for this customer
      const bills = await prisma.salesBill.findMany({
        where: {
          shopId: scope.shopId,
          customerPhone: c.mobile,
          balanceDue: { gt: 0 },
          status: 'CONFIRMED',
          deletedAt: null,
        },
        orderBy: { billDate: 'asc' },
        select: { id: true, billDate: true },
      });

      const billsCount = bills.length || 1;
      const oldestBillDate = bills.length > 0 ? new Date(bills[0].billDate) : new Date(c.createdAt);
      const diffMs = now.getTime() - oldestBillDate.getTime();
      const daysOld = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
      const isOverdue = daysOld > (c.creditDays || 15);

      let displayAge = '';
      if (daysOld === 0) {
        displayAge = 'Today';
      } else if (daysOld === 1) {
        displayAge = isOverdue ? '1 day · overdue' : '1 day';
      } else {
        displayAge = isOverdue ? `${daysOld} days · overdue` : `${daysOld} days`;
      }

      result.push({
        id: c.id,
        name: c.name,
        mobile: c.mobile,
        customerType: c.customerType || 'Retail',
        businessName: c.businessName || null,
        creditLimit: Number(c.creditLimit || 0),
        creditDays: Number(c.creditDays || 15),
        balanceDue: Number(c.balanceDue || 0),
        billsCount,
        oldestBillDate,
        daysOld,
        isOverdue,
        displayAge,
      });
    }

    return result;
  };

  /**
   * Get Customer Ledger / Statement
   */
  public getCustomerStatement = async (
    scope: ShopScope,
    customerId: string,
    query?: { startDate?: string; endDate?: string },
  ) => {
    const customer = await prisma.shopCustomer.findFirst({
      where: { id: customerId, shopId: scope.shopId },
    });

    if (!customer) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
    }

    // Fetch credit sales bills
    const bills = await prisma.salesBill.findMany({
      where: {
        shopId: scope.shopId,
        customerPhone: customer.mobile,
        status: 'CONFIRMED',
        deletedAt: null,
      },
      orderBy: { billDate: 'asc' },
    });

    // Fetch credit payments
    const payments = await prisma.customerCreditPayment.findMany({
      where: {
        shopId: scope.shopId,
        customerId: customer.id,
      },
      orderBy: { paidAt: 'asc' },
    });

    // Merge transactions into chronological order
    type RawTx = {
      id: string;
      date: Date;
      type: 'SALE' | 'PAYMENT';
      particulars: string;
      ref: string;
      debit: number | null;
      credit: number | null;
    };

    const rawList: RawTx[] = [];

    for (const b of bills) {
      // Debit amount is the credit portion of the bill
      const debit = b.creditAmount > 0 ? b.creditAmount : (b.totalAmount - (b.paidAmount || 0));
      if (debit > 0) {
        const isFullCredit = (b.paidAmount || 0) === 0;
        rawList.push({
          id: b.id,
          date: new Date(b.billDate),
          type: 'SALE',
          particulars: isFullCredit ? 'Sale on credit' : 'Sale · part credit',
          ref: b.billNumber,
          debit,
          credit: null,
        });
      }
    }

    for (const p of payments) {
      rawList.push({
        id: p.id,
        date: new Date(p.paidAt),
        type: 'PAYMENT',
        particulars: `Payment received · ${p.mode}`,
        ref: p.receiptNumber,
        debit: null,
        credit: p.amount,
      });
    }

    // Sort chronologically
    rawList.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Calculate running balance
    let runningBalance = customer.openingDue || 0;
    const transactions: StatementTransaction[] = [];

    for (const item of rawList) {
      if (item.debit) {
        runningBalance += item.debit;
      }
      if (item.credit) {
        runningBalance -= item.credit;
      }

      transactions.push({
        id: item.id,
        date: item.date.toISOString(),
        type: item.type,
        particulars: item.particulars,
        ref: item.ref,
        debit: item.debit,
        credit: item.credit,
        balance: Math.max(0, Math.round(runningBalance * 100) / 100),
      });
    }

    // Determine statement period range
    let fromDate = transactions.length > 0 ? transactions[0].date : new Date().toISOString();
    let toDate = transactions.length > 0 ? transactions[transactions.length - 1].date : new Date().toISOString();

    return {
      customer: {
        id: customer.id,
        name: customer.name,
        mobile: customer.mobile,
        customerType: customer.customerType,
        businessName: customer.businessName,
        creditLimit: customer.creditLimit,
        creditDays: customer.creditDays,
        balanceDue: customer.balanceDue,
      },
      statementPeriod: {
        from: fromDate,
        to: toDate,
      },
      openingBalance: customer.openingDue || 0,
      closingBalance: customer.balanceDue,
      transactions,
    };
  };

  /**
   * Record payment against customer due
   */
  public recordPayment = async (
    scope: ShopScope,
    customerId: string,
    actorId: string,
    data: ReceivePaymentInput,
  ) => {
    const customer = await prisma.shopCustomer.findFirst({
      where: { id: customerId, shopId: scope.shopId },
    });

    if (!customer) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Customer not found');
    }

    if (customer.balanceDue <= 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Customer has no outstanding due');
    }

    if (data.amount > customer.balanceDue) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `Payment amount (₹${data.amount}) cannot exceed customer balance due (₹${customer.balanceDue})`,
      );
    }

    const receiptNumber = await this.getNextReceiptNumber(scope);
    const paidAt = data.date ? new Date(data.date) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create CustomerCreditPayment record
      const creditPayment = await tx.customerCreditPayment.create({
        data: {
          receiptNumber,
          shopId: scope.shopId,
          companyId: scope.companyId,
          branchId: customer.branchId,
          customerId: customer.id,
          amount: data.amount,
          mode: data.mode,
          paidAt,
          note: data.note,
          receivedById: actorId,
        },
      });

      // 2. Allocate payment to oldest unpaid bills (FIFO)
      const openBills = await tx.salesBill.findMany({
        where: {
          shopId: scope.shopId,
          customerPhone: customer.mobile,
          balanceDue: { gt: 0 },
          status: 'CONFIRMED',
          deletedAt: null,
        },
        orderBy: { billDate: 'asc' },
      });

      let remaining = data.amount;

      for (const bill of openBills) {
        if (remaining <= 0) break;
        const allocation = Math.min(remaining, bill.balanceDue);
        const newAmountPaid = Math.round((bill.amountPaid + allocation) * 100) / 100;
        const newBalanceDue = Math.round((bill.balanceDue - allocation) * 100) / 100;
        const paymentStatus = newBalanceDue <= 0 ? 'PAID' : 'PART_CREDIT';

        // Add bill payment
        await tx.salesBillPayment.create({
          data: {
            billId: bill.id,
            mode: data.mode.toUpperCase(),
            amount: allocation,
            paidAt,
            receivedById: actorId,
            note: `Credit receipt ${receiptNumber}`,
            atBilling: false,
          },
        });

        // Update bill status
        await tx.salesBill.update({
          where: { id: bill.id },
          data: {
            amountPaid: newAmountPaid,
            balanceDue: newBalanceDue,
            paymentStatus,
          },
        });

        remaining -= allocation;
      }

      // 3. Update customer balanceDue
      const newCustomerDue = Math.max(0, Math.round((customer.balanceDue - data.amount) * 100) / 100);
      const updatedCustomer = await tx.shopCustomer.update({
        where: { id: customer.id },
        data: { balanceDue: newCustomerDue },
      });

      return {
        payment: creditPayment,
        customer: updatedCustomer,
        receiptNumber,
      };
    });

    return result;
  };

  /**
   * Send WhatsApp reminder messages
   */
  public getWhatsAppReminders = async (scope: ShopScope, customerId?: string) => {
    const shop = await prisma.shop.findUnique({
      where: { id: scope.shopId },
      select: { name: true, phone: true },
    });
    const shopName = shop?.name || 'Cloth Pro';

    let customers = await prisma.shopCustomer.findMany({
      where: {
        shopId: scope.shopId,
        balanceDue: { gt: 0 },
        isActive: true,
        ...(customerId ? { id: customerId } : {}),
      },
    });

    const now = new Date();
    const reminders = customers.map((c) => {
      const cleanPhone = c.mobile.replace(/\D/g, '');
      const phoneWithCountry = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;
      const text = encodeURIComponent(
        `Dear ${c.name},\n\nThis is a friendly reminder from *${shopName}* regarding your outstanding balance of *₹${c.balanceDue.toLocaleString('en-IN')}*.\n\nKindly clear your due payment at your earliest convenience.\n\nThank you for shopping with us!`,
      );
      const whatsappUrl = `https://wa.me/${phoneWithCountry}?text=${text}`;

      return {
        customerId: c.id,
        name: c.name,
        mobile: c.mobile,
        balanceDue: c.balanceDue,
        whatsappUrl,
        message: decodeURIComponent(text),
      };
    });

    return reminders;
  };
}

export const creditService = new CreditService();
export default creditService;
