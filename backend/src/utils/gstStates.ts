/*
 * GST state codes (the first two digits of a GSTIN). Whether a sale is
 * inter-state (IGST) or intra-state (CGST + SGST) is decided by comparing
 * these codes, never by comparing state names as typed.
 */
export const GST_STATES: Record<string, string> = {
    '01': 'Jammu & Kashmir',
    '02': 'Himachal Pradesh',
    '03': 'Punjab',
    '04': 'Chandigarh',
    '05': 'Uttarakhand',
    '06': 'Haryana',
    '07': 'Delhi',
    '08': 'Rajasthan',
    '09': 'Uttar Pradesh',
    '10': 'Bihar',
    '11': 'Sikkim',
    '12': 'Arunachal Pradesh',
    '13': 'Nagaland',
    '14': 'Manipur',
    '15': 'Mizoram',
    '16': 'Tripura',
    '17': 'Meghalaya',
    '18': 'Assam',
    '19': 'West Bengal',
    '20': 'Jharkhand',
    '21': 'Odisha',
    '22': 'Chhattisgarh',
    '23': 'Madhya Pradesh',
    '24': 'Gujarat',
    '26': 'Dadra & Nagar Haveli and Daman & Diu',
    '27': 'Maharashtra',
    '29': 'Karnataka',
    '30': 'Goa',
    '31': 'Lakshadweep',
    '32': 'Kerala',
    '33': 'Tamil Nadu',
    '34': 'Puducherry',
    '35': 'Andaman & Nicobar Islands',
    '36': 'Telangana',
    '37': 'Andhra Pradesh',
    '38': 'Ladakh',
    '97': 'Other Territory',
};

/** The 36 states and union territories, for address forms (store and admin) */
export const STATE_NAMES = Object.entries(GST_STATES)
    .filter(([code]) => code !== '97')
    .map(([, name]) => name);

const norm = (v: string) =>
    v
        .toLowerCase()
        .replace(/&/g, ' and ')
        .replace(/[^a-z]/g, '');

// Other spellings people type
const ALIASES: Record<string, string> = {
    jammukashmir: '01',
    jandk: '01',
    orissa: '21',
    pondicherry: '34',
    newdelhi: '07',
    nctofdelhi: '07',
    daman: '26',
    damananddiu: '26',
    dadranagarhaveli: '26',
    dadraandnagarhaveli: '26',
    andaman: '35',
    andamanandnicobar: '35',
    uttaranchal: '05',
};

const BY_NAME = new Map<string, string>([
    ...Object.entries(GST_STATES).map(([code, name]) => [norm(name), code] as [string, string]),
    ...Object.entries(ALIASES),
]);

/** State code from a GSTIN ("27ABCDE1234F1Z5" -> "27"), or null */
export const stateCodeOfGstin = (gstin?: string | null) => {
    const code = gstin?.trim().slice(0, 2);
    return code && GST_STATES[code] ? code : null;
};

/** State code from a state name as typed ("Tamilnadu", "tamil nadu" -> "33"), or null */
export const stateCodeOfName = (name?: string | null) => {
    if (!name?.trim()) return null;
    return BY_NAME.get(norm(name)) ?? null;
};

export const stateName = (code?: string | null) => (code ? (GST_STATES[code] ?? null) : null);
