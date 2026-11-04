import {Bill, BillStatus} from '@/types/bill';

const STYLES: Record<BillStatus, string> = {
  DRAFT: 'bg-amber-50 text-amber-800 border-amber-200',
  CONFIRMED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  CANCELLED: 'bg-rose-50 text-rose-800 border-rose-200',
};

export default function BillStatusBadge({status}: {status: BillStatus}) {
  return (
    <span
      className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STYLES[status]}`}
    >
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

type SalesState = 'PAID' | 'PART_CREDIT' | 'CREDIT' | 'EDITED' | BillStatus;

const SALES_STYLES: Record<SalesState, {label: string; cls: string}> = {
  PAID: {label: 'Paid', cls: STYLES.CONFIRMED},
  PART_CREDIT: {
    label: 'Part credit',
    cls: 'bg-orange-50 text-orange-800 border-orange-200',
  },
  CREDIT: {label: 'Credit', cls: 'bg-amber-50 text-amber-800 border-amber-200'},
  EDITED: {label: 'Edited', cls: 'bg-sky-50 text-sky-800 border-sky-200'},
  DRAFT: {label: 'Draft', cls: STYLES.DRAFT},
  CONFIRMED: {label: 'Confirmed', cls: STYLES.CONFIRMED},
  CANCELLED: {label: 'Cancelled', cls: STYLES.CANCELLED},
};

/** Sales bill state for branch views: cancelled / draft, then edited, then payment */
export const salesStateOf = (b: Bill): SalesState => {
  if (b.status !== 'CONFIRMED') return b.status;
  if (b.editCount) return 'EDITED';
  if (!b.creditAmount) return 'PAID';
  return (b.paidAmount ?? 0) > 0 ? 'PART_CREDIT' : 'CREDIT';
};

export const salesStateLabel = (b: Bill) => SALES_STYLES[salesStateOf(b)].label;

export function SalesStateBadge({bill}: {bill: Bill}) {
  const {label, cls} = SALES_STYLES[salesStateOf(bill)];
  return (
    <span
      className={`whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}
