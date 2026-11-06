import {BillStatus, Prisma} from '@prisma/client';

/**
 * Keeps ShopCustomer.balanceDue / totalBought in step with sales bills.
 *
 * Credit / Udhaar and the Customers page read those stored totals, so every
 * change to a sales bill passes the bill as it was (`before`) and as it is now
 * (`after`); the difference is applied to the customer with that phone number.
 * A confirmed bill counts; drafts, cancelled and deleted bills count as zero.
 * The first credit or named bill for a new phone number creates the customer.
 */

type BillSnapshot = {
    shopId: string;
    companyId: string;
    branchId: string;
    status: BillStatus;
    deletedAt?: Date | null;
    customerName?: string | null;
    customerPhone?: string | null;
    totalAmount: number;
    balanceDue: number;
} | null;

const round2 = (v: number) => Math.round(v * 100) / 100;

const share = (bill: BillSnapshot) => {
    const phone = bill?.customerPhone?.trim();
    if (!bill || !phone || bill.status !== BillStatus.CONFIRMED || bill.deletedAt) return null;
    return {phone, due: bill.balanceDue, bought: bill.totalAmount};
};

export const syncCustomerFromBill = async (
    tx: Prisma.TransactionClient,
    before: BillSnapshot,
    after: BillSnapshot,
) => {
    const bill = after ?? before;
    if (!bill) return;
    const old = share(before);
    const now = share(after);

    // Per phone: what to add to the customer's due and bought totals
    const deltas = new Map<string, {due: number; bought: number}>();
    const add = (phone: string, due: number, bought: number) => {
        const d = deltas.get(phone) ?? {due: 0, bought: 0};
        deltas.set(phone, {due: d.due + due, bought: d.bought + bought});
    };
    if (old) add(old.phone, -old.due, -old.bought);
    if (now) add(now.phone, now.due, now.bought);

    for (const [phone, d] of deltas) {
        const due = round2(d.due);
        const bought = round2(d.bought);
        if (!due && !bought) continue;

        const customer = await tx.shopCustomer.findFirst({
            where: {shopId: bill.shopId, mobile: phone},
            select: {id: true, balanceDue: true, totalBought: true},
        });
        if (customer) {
            await tx.shopCustomer.update({
                where: {id: customer.id},
                data: {
                    balanceDue: Math.max(0, round2(customer.balanceDue + due)),
                    totalBought: Math.max(0, round2(customer.totalBought + bought)),
                },
            });
        } else if (due > 0 || bought > 0) {
            await tx.shopCustomer.create({
                data: {
                    shopId: bill.shopId,
                    companyId: bill.companyId,
                    branchId: bill.branchId,
                    name: after?.customerName?.trim() || 'Customer',
                    mobile: phone,
                    balanceDue: Math.max(0, due),
                    totalBought: Math.max(0, bought),
                },
            });
        }
    }
};
