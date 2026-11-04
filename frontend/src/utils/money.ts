/** ₹20,640 / ₹1,199.50 (Indian digit grouping) */
export const inr = (n: number) =>
  `${n < 0 ? '−' : ''}₹${Math.abs(n).toLocaleString('en-IN', {maximumFractionDigits: 2})}`;

/** Large amounts in lakh / crore for KPI tiles: ₹9.8 L, ₹1.2 Cr */
export const inrShort = (n: number) => {
  const abs = Math.abs(n);
  const sign = n < 0 ? '−' : '';
  if (abs >= 1e7) return `${sign}₹${+(abs / 1e7).toFixed(1)} Cr`;
  if (abs >= 1e5) return `${sign}₹${+(abs / 1e5).toFixed(1)} L`;
  return inr(n);
};
