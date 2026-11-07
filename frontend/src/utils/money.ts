/** ₹20,640 / ₹1,199.50 (Indian digit grouping) */
export const inr = (n: number) => {
  const abs = Math.abs(n);
  // Whole rupees stay whole (₹20,640); paise always show two digits (₹80.30, not ₹80.3)
  const paise = Math.round(abs * 100) % 100 !== 0;
  return `${n < 0 ? '−' : ''}₹${abs.toLocaleString('en-IN', {minimumFractionDigits: paise ? 2 : 0, maximumFractionDigits: 2})}`;
};

/** Large amounts in lakh / crore for KPI tiles: ₹9.8 L, ₹1.2 Cr */
export const inrShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${+(abs / 1e7).toFixed(1)} Cr`;
  if (abs >= 1e5) return `${sign}₹${+(abs / 1e5).toFixed(1)} L`;
  return inr(n);
};
