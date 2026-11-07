export const inr = (n: number | null | undefined) =>
  n === null || n === undefined
    ? '—'
    : `₹${n.toLocaleString('en-IN', {minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2})}`;

export const shortDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-IN', {day: 'numeric', month: 'short', year: 'numeric'});

export const dateTime = (iso: string) =>
  new Date(iso).toLocaleString('en-IN', {day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit'});

/** A readable colour for text on top of a product swatch */
export const isDark = (hex: string | null) => {
  if (!hex) return false;
  const h = hex.replace('#', '');
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b < 140;
};

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING: 'Order placed',
  CONFIRMED: 'Confirmed',
  PROCESSING: 'Being prepared',
  PACKED: 'Packed',
  READY_FOR_DISPATCH: 'Ready to ship',
  DISPATCHED: 'Shipped',
  SHIPPED: 'Shipped',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
  RETURNED: 'Returned',
};

export const pluralize = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** "Free" size reads better as "Free size" */
export const sizeText = (size: string | null | undefined) => (!size ? null : size === 'Free' ? 'Free size' : `Size ${size}`);

/** Older updates were saved as "Status updated to OUT_FOR_DELIVERY"; show the readable name */
export const historyText = (comment: string | null, status: string) => {
  const m = comment?.match(/^Status updated to ([A-Za-z_ ]+)$/);
  return m ? ORDER_STATUS_LABEL[m[1].trim().toUpperCase().replace(/ /g, '_')] ?? comment : comment || ORDER_STATUS_LABEL[status];
};
