import {PaymentStatus} from '@/types/bill';

type Status = PaymentStatus | 'RETURN';

const STYLES: Record<Status, string> = {
  PAID: 'border-hairline bg-sage text-espresso',
  PART_CREDIT: 'border-amber-200 bg-amber-50 text-amber-800',
  CREDIT: 'border-amber-200 bg-amber-50 text-amber-800',
  RETURN: 'border-blush bg-blush/40 text-burgundy',
};

const LABELS: Record<Status, string> = {
  PAID: 'Paid',
  PART_CREDIT: 'Part credit',
  CREDIT: 'Credit',
  RETURN: 'Return',
};

/** Paid / part credit / credit pill for bills, and Return for credit notes */
export default function PaymentStatusBadge({status}: {status: Status}) {
  return (
    <span
      className={`badge whitespace-nowrap rounded-full border px-2 py-0.5 ${STYLES[status]}`}
    >
      <span
        className="h-1.5 w-1.5 rounded-full bg-current"
        aria-hidden="true"
      />
      {LABELS[status]}
    </span>
  );
}
