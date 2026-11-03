import {BillStatus} from '@/types/bill';

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
