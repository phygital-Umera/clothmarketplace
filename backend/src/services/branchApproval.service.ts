import {CreditNoteStatus, ReturnSettlement, ReturnStockTo} from '@prisma/client';
import prisma from '../client';
import creditNoteService, {REFUND_APPROVAL_LIMIT} from './creditNote.service';
import {BranchScope} from './customerDue.service';

export type ApprovalItem = {
    id: string;
    type: 'DISCOUNT' | 'CREDIT' | 'CANCEL_BILL' | 'WRITE_OFF' | 'REFUND';
    title: string;
    description: string;
    shopAndStaff: string;
    amountLabel: string;
    amount: number;
    status: 'PENDING' | 'APPROVED' | 'REJECTED';
    decisionNote?: string;
    decisionDate?: string;
};

/*
 * The branch admin's approval queue, built from real requests. Today the one
 * action the shops hand up to the branch is a refund credit note (any cash
 * refund, or one above the approval limit); deciding here approves or rejects
 * that credit note, which also puts the stock back.
 */

const rupees = (n: number) => `₹${n.toLocaleString('en-IN')}`;

const ago = (d: Date) => {
    const mins = Math.round((Date.now() - d.getTime()) / 60_000);
    if (mins < 60) return `${Math.max(mins, 1)} min ago`;
    if (mins < 24 * 60) return `${Math.round(mins / 60)} h ago`;
    return d.toLocaleDateString('en-IN', {day: '2-digit', month: 'short'});
};

const REASON: Record<string, string> = {
    DEFECTIVE: 'Defective',
    SIZE: 'Size issue',
    COLOUR: 'Colour issue',
    CHANGED_MIND: 'Changed mind',
    OTHER: 'Other',
};

class BranchApprovalService {
    public async getApprovals(scope: BranchScope, tab?: string) {
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const base = {
            companyId: scope.companyId,
            branchId: scope.branchId,
            settlement: ReturnSettlement.REFUND,
            needsApproval: true,
        };
        const pendingWhere = {...base, status: CreditNoteStatus.PENDING_APPROVAL};
        const doneWhere = {
            ...base,
            status: {not: CreditNoteStatus.PENDING_APPROVAL},
            decidedAt: {gte: startOfDay},
        };

        const [pending, doneToday] = await Promise.all([prisma.creditNote.count({where: pendingWhere}), prisma.creditNote.count({where: doneWhere})]);

        const showDone = tab === 'DONE_TODAY';
        // Only refunds exist as approval requests; other tabs are empty
        const notes =
            !tab || tab === 'REFUND' || showDone
                ? await prisma.creditNote.findMany({
                      where: showDone ? doneWhere : pendingWhere,
                      orderBy: {createdAt: 'asc'},
                      include: {
                          shop: {select: {name: true}},
                          createdBy: {select: {fullname: true}},
                          salesBill: {select: {billNumber: true}},
                          items: {select: {productName: true, size: true, quantity: true}},
                      },
                  })
                : [];

        const items: ApprovalItem[] = notes.map((n) => ({
            id: n.id,
            type: 'REFUND',
            title: `${n.noteNumber} · ${n.salesBill.billNumber}`,
            description: [
                n.items.map((i) => `${i.productName ?? 'Item'}${i.size ? ` ${i.size}` : ''} ×${i.quantity}`).join(', '),
                `${REASON[n.reason] ?? n.reason}${n.reasonNote ? ` — ${n.reasonNote}` : ''}`,
                `Refund by ${n.refundMode ?? 'cash'}${n.customerName ? ` to ${n.customerName}` : ''}`,
            ].join(' · '),
            shopAndStaff: `${n.shop.name} · ${n.createdBy.fullname} · ${ago(n.createdAt)}`,
            amountLabel: rupees(n.totalAmount),
            amount: n.totalAmount,
            status:
                n.status === CreditNoteStatus.PENDING_APPROVAL
                    ? 'PENDING'
                    : n.status === CreditNoteStatus.APPROVED
                      ? 'APPROVED'
                      : 'REJECTED',
            decisionNote: n.decisionNote ?? undefined,
            decisionDate: n.decidedAt?.toISOString(),
        }));

        return {
            counts: {pending, discount: 0, credit: 0, cancelBill: 0, writeOff: 0, refund: pending, doneToday},
            items,
            // The rules the system actually enforces
            limitsTable: [
                {
                    action: 'Refund (credit note)',
                    cashierCan: `Card / UPI up to ${rupees(REFUND_APPROVAL_LIMIT)}`,
                    managerCan: `Card / UPI up to ${rupees(REFUND_APPROVAL_LIMIT)}`,
                    aboveThat: 'Branch Admin (and every cash refund)',
                },
            ],
        };
    }

    public async decide(
        scope: BranchScope & {actorId: string},
        id: string,
        decision: 'APPROVE' | 'REJECT',
        note?: string,
    ) {
        await creditNoteService.decide(
            {companyId: scope.companyId, branchId: scope.branchId},
            scope.actorId,
            id,
            {action: decision, stockTo: ReturnStockTo.RESTOCK, note},
        );
        const status = decision === 'APPROVE' ? 'approved' : 'rejected';
        return {success: true, message: `Refund has been ${status}`};
    }
}

export default new BranchApprovalService();
