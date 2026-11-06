import {z} from 'zod';

/*
 * Field rules by kind / label. One place that decides how a field is
 * validated and what the error says, so every module behaves the same.
 *
 * KEEP IN SYNC with frontend/src/lib/validation/fieldRules.ts: same kinds,
 * same patterns, same messages. The frontend copy is for the user; this one
 * is the real protection.
 */

export type FieldKind =
    | 'text'
    | 'name'
    | 'email'
    | 'phone'
    | 'alternatePhone'
    | 'pincode'
    | 'code'
    | 'slug'
    | 'url'
    | 'gstin'
    | 'price'
    | 'quantity'
    | 'displayOrder'
    | 'password';

export type FieldRuleOptions = {
    label: string;
    /** Explicit kind wins; otherwise it is guessed from the label */
    kind?: FieldKind;
    required?: boolean;
    /** Max length for `text` fields */
    max?: number;
};

// Order matters: the first match wins
const KIND_BY_LABEL: [RegExp, FieldKind][] = [
    [/alternate\s+(phone|mobile|contact)/i, 'alternatePhone'],
    [/phone|mobile|contact\s+(no|number)/i, 'phone'],
    [/e-?mail/i, 'email'],
    [/pin\s*code|postal\s*code/i, 'pincode'],
    [/\bgst/i, 'gstin'],
    [/\bslug\b/i, 'slug'],
    [/website|\burl\b/i, 'url'],
    [/password/i, 'password'],
    [/\bcode\b/i, 'code'],
    [/price|amount|\bmrp\b/i, 'price'],
    [/stock|quantity|threshold/i, 'quantity'],
    [/display\s+order/i, 'displayOrder'],
    [/\bname\b/i, 'name'],
];

export const kindFromLabel = (label: string): FieldKind =>
    KIND_BY_LABEL.find(([pattern]) => pattern.test(label))?.[1] ?? 'text';

export const PATTERNS = {
    name: /^[\p{L} .'-]+$/u,
    phone: /^[6-9]\d{9}$/,
    pincode: /^\d{6}$/,
    code: /^[A-Z0-9-]{2,20}$/,
    slug: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    url: /^https?:\/\/[^\s.]+\.[^\s]{2,}$/i,
    gstin: /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/,
    twoDecimals: /^\d+(\.\d{1,2})?$/,
};

const emptyToUndefined = (value: unknown) =>
    typeof value === 'string' && value.trim() === '' ? undefined : value;

/**
 * "QA   Fashions" -> "QA Fashions": runs of spaces/tabs inside names and text
 * become one space, so the same name can't be saved twice with different
 * spacing. Line breaks (addresses, notes) are kept.
 */
export const collapseSpaces = (value: unknown) =>
    typeof value === 'string' ? value.replace(/[ \t]{2,}/g, ' ') : value;

const toNumber = (value: unknown) => {
    const v = emptyToUndefined(value);
    return typeof v === 'string' ? Number(v) : v;
};

const stringRule = (kind: FieldKind, label: string, max: number) => {
    const invalid = `Enter a valid ${label}`;
    const base = z.string({required_error: `${label} is required`}).trim();

    switch (kind) {
        case 'name':
            return base
                .min(2, `${label} must be at least 2 characters`)
                .max(100, `${label} must be at most 100 characters`)
                .regex(PATTERNS.name, `${label} can only contain letters, spaces, . ' -`);
        case 'email':
            return base.toLowerCase().max(254, `${label} is too long`).email(invalid);
        case 'phone':
        case 'alternatePhone':
            return base.regex(PATTERNS.phone, invalid);
        case 'pincode':
            return base.regex(PATTERNS.pincode, `${label} must be exactly 6 digits`);
        case 'code':
            return base
                .toUpperCase()
                .regex(PATTERNS.code, `${label} must be 2-20 letters, numbers or dashes`);
        case 'slug':
            return base.regex(
                PATTERNS.slug,
                `${label} can only use a-z, 0-9 and dashes, not at the start or end`,
            );
        case 'url':
            return base.regex(PATTERNS.url, invalid);
        case 'gstin':
            return base.toUpperCase().regex(PATTERNS.gstin, invalid);
        case 'password':
            // No strength rules: any non-empty password is accepted
            return base.max(128, `${label} must be at most 128 characters`);
        default:
            return base.max(max, `${label} must be at most ${max} characters`);
    }
};

const numberRule = (kind: FieldKind, label: string) => {
    const base = z
        .number({
            required_error: `${label} is required`,
            invalid_type_error: `Enter a valid ${label}`,
        })
        .min(0, `${label} cannot be negative`);

    return kind === 'price'
        ? base.refine(
              (v) => PATTERNS.twoDecimals.test(String(v)),
              `${label} can have at most 2 decimals`,
          )
        : base.int(`${label} must be a whole number`);
};

type NumberKind = 'price' | 'quantity' | 'displayOrder';
type StringKind = Exclude<FieldKind, NumberKind>;
type Rule<T> = z.ZodType<T, z.ZodTypeDef, unknown>;

const NUMBER_KINDS: FieldKind[] = ['price', 'quantity', 'displayOrder'];

/**
 * Build the zod rule for one field.
 *   field({label: 'Business Email'})                    -> required email
 *   field({label: 'Company Name', kind: 'text'})        -> required plain text
 *   field({label: 'Alternate Phone', required: false})  -> optional phone
 * Empty strings count as "not given", so optional fields may be sent blank.
 */
export function field(o: FieldRuleOptions & {kind: NumberKind; required?: true}): Rule<number>;
export function field(
    o: FieldRuleOptions & {kind: NumberKind; required: false},
): Rule<number | undefined>;
export function field(o: FieldRuleOptions & {kind?: StringKind; required?: true}): Rule<string>;
export function field(
    o: FieldRuleOptions & {kind?: StringKind; required: false},
): Rule<string | undefined>;
export function field({label, kind, required = true, max = 120}: FieldRuleOptions): z.ZodTypeAny {
    const resolved = kind ?? kindFromLabel(label);
    const isNumber = NUMBER_KINDS.includes(resolved);
    const rule: z.ZodTypeAny = isNumber
        ? numberRule(resolved, label)
        : stringRule(resolved, label, max);
    const prepare = isNumber
        ? toNumber
        : resolved === 'name' || resolved === 'text'
          ? (v: unknown) => emptyToUndefined(collapseSpaces(v))
          : emptyToUndefined;

    return z.preprocess(prepare, required ? rule : rule.optional());
}

/** Adds a '"To" date not before "From" date' check to an object schema */
export const dateRange =
    <T extends Record<string, unknown>>(
        from: keyof T & string,
        to: keyof T & string,
        toLabel = 'To date',
    ) =>
    (values: T, ctx: z.RefinementCtx) => {
        const start = values[from];
        const end = values[to];
        if (start && end && new Date(end as string) < new Date(start as string)) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: [to],
                message: `${toLabel} cannot be before the from date`,
            });
        }
    };

/** Image uploads: checked by multer (middlewares/multer.middleware.ts) */
export const IMAGE_RULE = {
    mimeTypes: ['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'],
    maxBytes: 2 * 1024 * 1024,
};

// Older schemas still use these directly
const password = z.string().min(1, 'Password is required');
const emailSchema = z.string().email('Invalid email format');
const usernameSchema = z.string().min(1, 'Username is required').max(50);
const fullnameSchema = z.string().min(1, 'Full name is required').max(100);
const phoneNumberSchema = z
    .string()
    .regex(PATTERNS.phone, 'Invalid Indian phone number format')
    .length(10, 'Phone number must be exactly 10 digits');

export {password, emailSchema, usernameSchema, fullnameSchema, phoneNumberSchema};
export default {password, emailSchema, usernameSchema, fullnameSchema, phoneNumberSchema, field};
