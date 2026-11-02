import {PaymentStatus} from '@/types/order';
import {CheckCircle2, Clock, RotateCcw, XCircle} from 'lucide-react';

interface Props {
  status: PaymentStatus;
  size?: 'sm' | 'md';
}

export default function PaymentStatusBadge({status, size = 'sm'}: Props) {
  const isSmall = size === 'sm';
  const sizeClass = isSmall ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';
  const iconSize = isSmall ? 11 : 13;

  switch (status) {
    case 'PAID':
      return (
        <span
          className={`inline-flex items-center font-semibold rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 ${sizeClass}`}
        >
          <CheckCircle2 size={iconSize} /> Paid
        </span>
      );
    case 'PENDING':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-800 border border-amber-200 ${sizeClass}`}
        >
          <Clock size={iconSize} /> Pending
        </span>
      );
    case 'FAILED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-800 border border-rose-200 ${sizeClass}`}
        >
          <XCircle size={iconSize} /> Failed
        </span>
      );
    case 'REFUNDED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-purple-50 text-purple-800 border border-purple-200 ${sizeClass}`}
        >
          <RotateCcw size={iconSize} /> Refunded
        </span>
      );
    default:
      return (
        <span className={`inline-flex items-center rounded-full bg-gray-50 text-gray-700 ${sizeClass}`}>
          {status}
        </span>
      );
  }
}

