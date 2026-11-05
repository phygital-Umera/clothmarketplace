import {z} from 'zod';
import {field} from './custom.validation';
import {positive, text} from './shopOps.validation';
import cashBookValidation from './cashBook.validation';

// Branch admin: day close review of every shop counter and the bank deposit

const dayQuerySchema = z.object({
    date: cashBookValidation.dayKeySchema.optional(),
});

const resolveDifferenceSchema = z.object({
    sessionId: z.string().uuid('Select a counter day'),
    reason: field({label: 'Reason', kind: 'text', max: 200}),
    action: field({label: 'Action', kind: 'text', max: 120}),
    note: text('Note', 300),
});

const bankDepositSchema = z.object({
    amount: positive('Amount'),
    bank: field({label: 'Bank', kind: 'text', max: 120}),
    depositSlipUtr: text('Deposit slip / UTR', 60),
    slipUrl: text('Slip URL', 500),
    date: cashBookValidation.dayKeySchema,
});

export default {dayQuerySchema, resolveDifferenceSchema, bankDepositSchema};
