/*
 * Calendar-day helpers. "A day" is the server's local day, the same as the
 * shop dashboard. Keys are 'YYYY-MM-DD'.
 */
const pad = (n: number) => String(n).padStart(2, '0');

/** Local 'YYYY-MM-DD' of a moment (default: now) */
export const dayKey = (d = new Date()) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

const parts = (key: string) => {
    const [y, m, d] = key.split('-').map(Number);
    return {y, m, d};
};

/** [start, end) of a local day */
export const dayRange = (key: string) => {
    const {y, m, d} = parts(key);
    return {start: new Date(y, m - 1, d), end: new Date(y, m - 1, d + 1)};
};

/** Value for a Prisma @db.Date column (midnight UTC of that calendar day) */
export const dateOnly = (key: string) => {
    const {y, m, d} = parts(key);
    return new Date(Date.UTC(y, m - 1, d));
};

export const round2 = (v: number) => Math.round(v * 100) / 100;
