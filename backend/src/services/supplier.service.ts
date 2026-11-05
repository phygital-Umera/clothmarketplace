import prisma from '../client';
import ApiError from '../utils/ApiError';
import httpStatus from 'http-status';
import { CreateSupplierInput, RecordSupplierPaymentInput } from '../validations/supplier.validation';

export type Scope = {
  companyId: string;
  branchId: string;
  shopId?: string;
};

class SupplierService {
  /**
   * List all suppliers with payables and summary
   */
  public async listSuppliers(scope: Scope, search?: string) {
    let whereClause = `WHERE "branchId" = '${scope.branchId}'`;
    if (search && search.trim()) {
      const q = search.trim().replace(/'/g, "''");
      whereClause += ` AND ("name" ILIKE '%${q}%' OR "gstin" ILIKE '%${q}%' OR "phone" ILIKE '%${q}%' OR "city" ILIKE '%${q}%')`;
    }

    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "Supplier"
      ${whereClause}
      ORDER BY "payable" DESC, "name" ASC
    `);

    let totalPayable = 0;
    for (const r of rows) {
      totalPayable += Number(r.payable || 0);
    }

    return {
      items: rows.map((r) => ({
        id: r.id,
        name: r.name,
        contactPerson: r.contactPerson,
        phone: r.phone,
        email: r.email,
        gstin: r.gstin,
        city: r.city,
        state: r.state,
        address: r.address,
        paymentTerms: r.paymentTerms || 'Net 30',
        openingBalance: Number(r.openingBalance || 0),
        payable: Number(r.payable || 0),
        isOverdue: Boolean(r.isOverdue),
        nextDue: r.nextDue || `${r.city || ''} · ${r.paymentTerms || 'Net 30'}`.trim(),
        createdAt: r.createdAt,
      })),
      totalPayable: Math.round(totalPayable * 100) / 100,
      suppliersCount: rows.length,
    };
  }

  /**
   * Get supplier ledger, open bills, and statement
   */
  public async getSupplierLedger(scope: Scope, supplierId: string) {
    const suppliers: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "Supplier" WHERE "id" = $1 AND "branchId" = $2 LIMIT 1
    `, supplierId, scope.branchId);

    if (!suppliers.length) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Supplier not found');
    }
    const supplier = suppliers[0];

    // Find purchase bills for this supplier
    const bills: any[] = await prisma.$queryRawUnsafe(`
      SELECT "id", "billNumber", "billDate", "totalAmount", "amountPaid", "balanceDue", "paymentStatus"
      FROM "PurchaseBill"
      WHERE "branchId" = $1 AND "supplierName" ILIKE $2
      ORDER BY "billDate" ASC
    `, scope.branchId, `%${supplier.name.trim()}%`);

    // Find payments for this supplier
    const payments: any[] = await prisma.$queryRawUnsafe(`
      SELECT "id", "receiptNumber", "amount", "paymentMode", "paymentDate", "billNumber", "utrChequeNo", "paidFrom"
      FROM "SupplierPayment"
      WHERE "branchId" = $1 AND ("supplierId" = $2 OR "supplierName" ILIKE $3)
      ORDER BY "paymentDate" ASC
    `, scope.branchId, supplier.id, `%${supplier.name.trim()}%`);

    // Find purchase returns / debit notes for this supplier
    const returns: any[] = await prisma.$queryRawUnsafe(`
      SELECT "id", "returnNumber", "returnDate", "totalAmount", "sentVia", "noteToSupplier"
      FROM "PurchaseReturn"
      WHERE "branchId" = $1 AND "supplierName" ILIKE $2
      ORDER BY "returnDate" ASC
    `, scope.branchId, `%${supplier.name.trim()}%`);

    // Build timeline events
    type EventItem = {
      id: string;
      rawDate: Date;
      dateFormatted: string;
      particulars: string;
      ref: string;
      credit: number | null;
      debit: number | null;
    };

    const events: EventItem[] = [];

    // Opening balance
    const openingDate = new Date(supplier.createdAt || '2026-10-01T00:00:00Z');
    events.push({
      id: `open-${supplier.id}`,
      rawDate: new Date('2026-10-01T00:00:00Z'),
      dateFormatted: '01 Oct',
      particulars: 'Opening balance',
      ref: '—',
      credit: supplier.openingBalance > 0 ? supplier.openingBalance : null,
      debit: null,
    });

    const formatDateShort = (d: Date | string) => {
      const date = new Date(d);
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      return `${day} ${months[date.getMonth()]}`;
    };

    for (const b of bills) {
      events.push({
        id: `bill-${b.id}`,
        rawDate: new Date(b.billDate),
        dateFormatted: formatDateShort(b.billDate),
        particulars: 'Purchase',
        ref: b.billNumber,
        credit: Number(b.totalAmount),
        debit: null,
      });
    }

    for (const p of payments) {
      const modeLabel = (p.paymentMode || 'NEFT').replace(' / RTGS', '').trim();
      events.push({
        id: `pay-${p.id}`,
        rawDate: new Date(p.paymentDate),
        dateFormatted: formatDateShort(p.paymentDate),
        particulars: `Payment · ${modeLabel}`,
        ref: p.receiptNumber,
        credit: null,
        debit: Number(p.amount),
      });
    }

    for (const r of returns) {
      events.push({
        id: `ret-${r.id}`,
        rawDate: new Date(r.returnDate),
        dateFormatted: formatDateShort(r.returnDate),
        particulars: 'Purchase return · debit note',
        ref: r.returnNumber,
        credit: null,
        debit: Number(r.totalAmount),
      });
    }

    // Sort events chronologically
    events.sort((a, b) => a.rawDate.getTime() - b.rawDate.getTime());

    // Calculate running balances
    let runningBalance = 0;
    const ledger = events.map((ev) => {
      if (ev.credit) runningBalance += ev.credit;
      if (ev.debit) runningBalance -= ev.debit;
      return {
        id: ev.id,
        date: ev.dateFormatted,
        rawDate: ev.rawDate.toISOString(),
        particulars: ev.particulars,
        ref: ev.ref,
        credit: ev.credit,
        debit: ev.debit,
        balance: Math.max(0, runningBalance),
      };
    });

    // Statement period
    const startDate = events[0]?.dateFormatted || '01 Oct';
    const endDate = events[events.length - 1]?.dateFormatted || '03 Nov';
    const statementPeriod = `Statement ${startDate} – ${endDate} 2026`;

    // Open bills for payment dropdown
    const openBills = bills
      .filter((b) => Number(b.balanceDue) > 0)
      .map((b) => ({
        id: b.id,
        billNumber: b.billNumber,
        balanceDue: Number(b.balanceDue),
        totalAmount: Number(b.totalAmount),
        label: `${b.billNumber} (₹${Number(b.balanceDue).toLocaleString('en-IN')})`,
      }));

    const nextReceiptNumber = await this.getNextReceiptNumber(scope.branchId);

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
        payable: Number(supplier.payable),
        isOverdue: Boolean(supplier.isOverdue),
        nextDue: supplier.nextDue,
      },
      ledger,
      openBills,
      nextReceiptNumber,
      statementPeriod,
    };
  }

  /**
   * Generate next payment receipt number
   */
  public async getNextReceiptNumber(branchId: string) {
    const res: any[] = await prisma.$queryRawUnsafe(`
      SELECT count(*) as count FROM "SupplierPayment" WHERE "branchId" = $1
    `, branchId);
    const count = parseInt(res[0]?.count ?? '0', 10) + 19;
    return `PY/26-27/${String(count).padStart(4, '0')}`;
  }

  /**
   * Create new supplier
   */
  public async createSupplier(scope: Scope, input: CreateSupplierInput) {
    const id = `sup-${Date.now()}`;
    const nextDue = `${input.city || ''} · ${input.paymentTerms || 'Net 30'}`.trim();

    await prisma.$executeRawUnsafe(`
      INSERT INTO "Supplier" (
        "id", "name", "contactPerson", "phone", "email", "gstin", "city", "state", "address",
        "paymentTerms", "openingBalance", "payable", "isOverdue", "nextDue",
        "companyId", "branchId", "shopId", "createdAt", "updatedAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, false, $13, $14, $15, $16, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
      )
      ON CONFLICT ("branchId", "name") DO UPDATE SET
        "contactPerson" = EXCLUDED."contactPerson",
        "phone" = EXCLUDED."phone",
        "gstin" = EXCLUDED."gstin",
        "paymentTerms" = EXCLUDED."paymentTerms",
        "payable" = "Supplier"."payable" + EXCLUDED."payable",
        "updatedAt" = CURRENT_TIMESTAMP
    `, id, input.name.trim(), input.contactPerson || null, input.phone || null, input.email || null,
       input.gstin || null, input.city || null, input.state || null, input.address || null,
       input.paymentTerms || 'Net 30', input.openingBalance || 0, input.openingBalance || 0,
       nextDue, scope.companyId, scope.branchId, scope.shopId || null);

    const created: any[] = await prisma.$queryRawUnsafe(`
      SELECT * FROM "Supplier" WHERE "branchId" = $1 AND "name" = $2 LIMIT 1
    `, scope.branchId, input.name.trim());

    return created[0];
  }

  /**
   * Record supplier payment
   */
  public async recordPayment(scope: Scope, actorId: string, input: RecordSupplierPaymentInput) {
    const id = `pay-${Date.now()}`;
    const receiptNumber = await this.getNextReceiptNumber(scope.branchId);
    const payDate = input.paymentDate ? new Date(input.paymentDate) : new Date();

    // 1. Insert payment record
    await prisma.$executeRawUnsafe(`
      INSERT INTO "SupplierPayment" (
        "id", "receiptNumber", "supplierId", "supplierName", "billId", "billNumber",
        "amount", "paymentMode", "paidFrom", "paymentDate", "utrChequeNo", "tdsDeducted", "notes",
        "companyId", "branchId", "shopId", "createdById", "createdAt"
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::timestamp, $11, $12, $13, $14, $15, $16, $17, CURRENT_TIMESTAMP
      )
    `, id, receiptNumber, input.supplierId, input.supplierName || '', input.billId || null, input.billNumber || null,
       input.amount, input.paymentMode || 'NEFT / RTGS', input.paidFrom || 'Bank - HDFC current a/c (**4417)',
       payDate.toISOString(), input.utrChequeNo || null, input.tdsDeducted || 0, input.notes || null,
       scope.companyId, scope.branchId, scope.shopId || null, actorId);

    // 2. Update Supplier payable
    await prisma.$executeRawUnsafe(`
      UPDATE "Supplier"
      SET "payable" = GREATEST(0, "payable" - $1),
          "isOverdue" = CASE WHEN ("payable" - $1) <= 0 THEN false ELSE "isOverdue" END,
          "updatedAt" = CURRENT_TIMESTAMP
      WHERE "id" = $2
    `, input.amount, input.supplierId);

    // 3. Update PurchaseBill balance if bill specified
    if (input.billNumber || input.billId) {
      await prisma.$executeRawUnsafe(`
        UPDATE "PurchaseBill"
        SET "amountPaid" = "amountPaid" + $1,
            "balanceDue" = GREATEST(0, "balanceDue" - $1),
            "paymentStatus" = CASE WHEN ("balanceDue" - $1) <= 0 THEN 'PAID'::"BillPaymentStatus" ELSE 'PART_CREDIT'::"BillPaymentStatus" END,
            "updatedAt" = CURRENT_TIMESTAMP
        WHERE "branchId" = $2 AND ("id" = $3 OR "billNumber" = $4)
      `, input.amount, scope.branchId, input.billId || '', input.billNumber || '');
    }

    // Retrieve updated supplier balance
    const updated: any[] = await prisma.$queryRawUnsafe(`
      SELECT "payable" FROM "Supplier" WHERE "id" = $1 LIMIT 1
    `, input.supplierId);

    const newBalance = updated[0]?.payable ? Number(updated[0].payable) : 0;

    return {
      success: true,
      receiptNumber,
      amount: input.amount,
      newBalance,
      message: `Payment of ₹${input.amount.toLocaleString('en-IN')} recorded successfully against ${receiptNumber}`,
    };
  }
}

export default new SupplierService();
