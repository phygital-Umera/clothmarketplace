import httpStatus from 'http-status';
import prisma from '../client';
import ApiError from '@utils/ApiError';
import { ShopScope } from './shopProduct.service';
import { CreatePurchaseReturnInput } from '../validations/purchaseReturn.validation';

export interface PurchaseBillReturnItem {
  id: string; // purchaseBillItemId
  productId: string;
  variantId: string;
  productName: string;
  size: string;
  hsn: string;
  boughtQty: number;
  inStockQty: number;
  returnQty: number;
  unitCost: number;
  taxRate: number;
  reason?: string;
}

class PurchaseReturnService {
  /**
   * Financial Year format e.g. "26-27"
   */
  public getFinancialYear(date: Date = new Date()): string {
    const year = date.getFullYear();
    const month = date.getMonth();
    const startYear = month >= 3 ? year : year - 1;
    const endYear = startYear + 1;
    return `${String(startYear).slice(-2)}-${String(endYear).slice(-2)}`;
  }

  /**
   * Next Debit Note number format: DN/26-27/0006
   */
  public getNextDebitNoteNumber = async (scope: ShopScope): Promise<string> => {
    const fy = this.getFinancialYear();
    const count = await prisma.purchaseReturn.count({
      where: {
        shopId: scope.shopId,
        returnNumber: { startsWith: `DN/${fy}/` },
      },
    });
    // Starting offset from sequence in reference (e.g. 0006)
    const nextSeq = String(count + 4).padStart(4, '0');
    return `DN/${fy}/${nextSeq}`;
  };

  /**
   * Get list of suppliers who have purchase bills in this shop
   */
  public getSuppliers = async (scope: ShopScope) => {
    const suppliersRaw = await prisma.purchaseBill.findMany({
      where: {
        shopId: scope.shopId,
        status: 'CONFIRMED',
        deletedAt: null,
      },
      select: {
        supplierName: true,
        supplierPhone: true,
        supplierInvoiceNo: true,
      },
      distinct: ['supplierName'],
      orderBy: { supplierName: 'asc' },
    });

    return suppliersRaw.map((s) => ({
      name: s.supplierName,
      phone: s.supplierPhone,
    }));
  };

  /**
   * Get purchase bills for a supplier with returnable items and live stock
   */
  public getBillsBySupplier = async (scope: ShopScope, supplierName?: string) => {
    const bills = await prisma.purchaseBill.findMany({
      where: {
        shopId: scope.shopId,
        status: 'CONFIRMED',
        deletedAt: null,
        ...(supplierName ? { supplierName: { contains: supplierName, mode: 'insensitive' } } : {}),
      },
      include: {
        items: {
          include: {
            product: true,
            variant: true,
          },
        },
      },
      orderBy: { billDate: 'desc' },
    });

    const result = [];

    for (const b of bills) {
      const items: PurchaseBillReturnItem[] = [];

      for (const item of b.items) {
        // Fetch live physical stock for this variant in the branch
        let inStockQty = 0;
        if (item.variantId) {
          const inv = await prisma.inventory.findFirst({
            where: {
              branchId: b.branchId,
              variantId: item.variantId,
            },
          });
          inStockQty = inv ? inv.physicalQty : 0;
        }

        const sizeLabel = item.variant?.size || 'Free Size';
        const hsnLabel = (item.product as any)?.hsnCode || '6206';

        items.push({
          id: item.id,
          productId: item.productId,
          variantId: item.variantId,
          productName: item.product?.name || 'Product',
          size: sizeLabel,
          hsn: hsnLabel,
          boughtQty: item.quantity,
          inStockQty,
          returnQty: 0,
          unitCost: item.unitCost,
          taxRate: item.taxRate || 5,
        });
      }

      result.push({
        id: b.id,
        billNumber: b.billNumber,
        supplierName: b.supplierName,
        supplierPhone: b.supplierPhone,
        supplierInvoiceNo: b.supplierInvoiceNo,
        billDate: b.billDate,
        totalAmount: b.totalAmount,
        balanceDue: b.balanceDue,
        items,
      });
    }

    return result;
  };

  /**
   * Get earlier debit notes / returns
   */
  public getEarlierReturns = async (scope: ShopScope) => {
    const returns = await prisma.purchaseReturn.findMany({
      where: {
        shopId: scope.shopId,
      },
      orderBy: { returnDate: 'desc' },
      take: 10,
    });

    return returns.map((r) => {
      const d = new Date(r.returnDate);
      const day = d.getDate();
      const month = d.toLocaleDateString('en-IN', { month: 'short' });

      return {
        id: r.id,
        returnNumber: r.returnNumber,
        supplierName: r.supplierName,
        totalAmount: r.totalAmount,
        totalQuantity: r.totalQuantity,
        returnDate: r.returnDate,
        dateFormatted: `${day} ${month}`,
        subtitle: `${r.supplierName} · ${r.totalQuantity} pcs · ${day} ${month}`,
        note: r.noteToSupplier,
        status: r.status,
      };
    });
  };

  /**
   * Create Purchase Return (Debit Note)
   */
  public createPurchaseReturn = async (
    scope: ShopScope,
    actorId: string,
    data: CreatePurchaseReturnInput,
  ) => {
    const returnNumber = await this.getNextDebitNoteNumber(scope);

    // Calculate totals from returned items
    const activeItems = data.items.filter((i) => i.returnQty > 0);
    if (activeItems.length === 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Please enter return quantity for at least one item');
    }

    let returnValue = 0;
    let taxAmount = 0;
    let totalQuantity = 0;

    for (const item of activeItems) {
      const lineCost = item.returnQty * item.unitCost;
      const lineTax = (lineCost * (item.taxRate || 5)) / 100;
      returnValue += lineCost;
      taxAmount += lineTax;
      totalQuantity += item.returnQty;
    }

    returnValue = Math.round(returnValue * 100) / 100;
    taxAmount = Math.round(taxAmount * 100) / 100;
    const totalAmount = Math.round((returnValue + taxAmount) * 100) / 100;

    // Fetch purchase bill if provided
    let payableBefore = 0;
    let payableAfter = 0;
    let bill = null;

    if (data.purchaseBillId) {
      bill = await prisma.purchaseBill.findFirst({
        where: { id: data.purchaseBillId, shopId: scope.shopId },
      });
      if (bill) {
        payableBefore = bill.balanceDue;
        payableAfter = Math.max(0, Math.round((payableBefore - totalAmount) * 100) / 100);
      }
    }

    const returnDate = data.returnDate ? new Date(data.returnDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      // 1. Create PurchaseReturn
      const purchaseReturn = await tx.purchaseReturn.create({
        data: {
          returnNumber,
          shopId: scope.shopId,
          companyId: scope.companyId,
          branchId: bill ? bill.branchId : scope.shopId,
          purchaseBillId: data.purchaseBillId || null,
          supplierName: data.supplierName,
          returnDate,
          status: data.status,
          sentVia: data.sentVia || null,
          takeStockFrom: data.takeStockFrom,
          noteToSupplier: data.noteToSupplier || null,
          returnValue,
          taxAmount,
          totalAmount,
          totalQuantity,
          payableBefore,
          payableAfter,
          settleAs: data.settleAs,
          createdById: actorId,
          items: {
            create: activeItems.map((item) => ({
              purchaseBillItemId: item.purchaseBillItemId || null,
              productId: item.productId || null,
              variantId: item.variantId || null,
              productName: item.productName,
              size: item.size || null,
              hsn: item.hsn || null,
              boughtQty: item.boughtQty,
              inStockQty: item.inStockQty,
              returnQty: item.returnQty,
              unitCost: item.unitCost,
              taxRate: item.taxRate || 5,
              totalCost: Math.round(item.returnQty * item.unitCost * 100) / 100,
              reason: item.reason || null,
            })),
          },
        },
        include: { items: true },
      });

      // 2. If CONFIRMED, adjust inventory and payable
      if (data.status === 'CONFIRMED') {
        const branchId = bill ? bill.branchId : scope.shopId;

        for (const item of activeItems) {
          if (item.variantId) {
            const inv = await tx.inventory.findFirst({
              where: { branchId, variantId: item.variantId },
            });
            if (inv) {
              const newQty = Math.max(0, inv.physicalQty - item.returnQty);
              await tx.inventory.update({
                where: { id: inv.id },
                data: { physicalQty: newQty },
              });
            }
          }
        }

        // Deduct from purchase bill if requested
        if (data.settleAs === 'DEDUCT_FROM_PAYABLE' && bill) {
          const paymentStatus = payableAfter <= 0 ? 'PAID' : 'PART_CREDIT';
          await tx.purchaseBill.update({
            where: { id: bill.id },
            data: {
              balanceDue: payableAfter,
              paymentStatus,
            },
          });
        }
      }

      return purchaseReturn;
    });

    return result;
  };

  /**
   * Get single Purchase Return by ID
   */
  public getPurchaseReturn = async (scope: ShopScope, id: string) => {
    const pr = await prisma.purchaseReturn.findFirst({
      where: { id, shopId: scope.shopId },
      include: {
        items: true,
        purchaseBill: true,
      },
    });

    if (!pr) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Purchase return not found');
    }

    return pr;
  };
}

export const purchaseReturnService = new PurchaseReturnService();
export default purchaseReturnService;
