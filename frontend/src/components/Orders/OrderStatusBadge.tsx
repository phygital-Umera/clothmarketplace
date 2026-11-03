import {OrderStatus} from '@/types/order';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Package,
  RotateCcw,
  Sparkles,
  Truck,
  XCircle,
} from 'lucide-react';

interface Props {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export default function OrderStatusBadge({status, size = 'sm'}: Props) {
  const isSmall = size === 'sm';
  const sizeClass = isSmall ? 'text-[11px] px-2 py-0.5 gap-1' : 'text-xs px-2.5 py-1 gap-1.5';
  const iconSize = isSmall ? 12 : 14;

  switch (status) {
    case 'PENDING':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200 ${sizeClass}`}
        >
          <Clock size={iconSize} /> Pending
        </span>
      );
    case 'CONFIRMED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-blue-50 text-blue-700 border border-blue-200 ${sizeClass}`}
        >
          <Sparkles size={iconSize} /> Confirmed
        </span>
      );
    case 'PROCESSING':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 ${sizeClass}`}
        >
          <Package size={iconSize} /> Processing
        </span>
      );
    case 'PACKED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-purple-50 text-purple-700 border border-purple-200 ${sizeClass}`}
        >
          <Package size={iconSize} /> Packed
        </span>
      );
    case 'READY_FOR_DISPATCH':
    case 'DISPATCHED':
    case 'SHIPPED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 ${sizeClass}`}
        >
          <Truck size={iconSize} /> Shipped
        </span>
      );
    case 'OUT_FOR_DELIVERY':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-teal-50 text-teal-800 border border-teal-200 ${sizeClass}`}
        >
          <Truck size={iconSize} /> Out for Delivery
        </span>
      );
    case 'DELIVERED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${sizeClass}`}
        >
          <CheckCircle size={iconSize} /> Delivered
        </span>
      );
    case 'CANCELLED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-rose-50 text-rose-700 border border-rose-200 ${sizeClass}`}
        >
          <XCircle size={iconSize} /> Cancelled
        </span>
      );
    case 'RETURNED':
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-orange-50 text-orange-700 border border-orange-200 ${sizeClass}`}
        >
          <RotateCcw size={iconSize} /> Returned
        </span>
      );
    default:
      return (
        <span
          className={`inline-flex items-center font-medium rounded-full bg-gray-50 text-gray-700 border border-gray-200 ${sizeClass}`}
        >
          <AlertCircle size={iconSize} /> {status}
        </span>
      );
  }
}

