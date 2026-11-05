import {Field} from '@/components/ui';
import FormDialog from '@/components/ui/FormDialog';
import {
  useCreateExpense,
  useOpenCounter,
} from '@/lib/react-query/queriesAndMutations/shopOps';
import {PaymentMethod} from '@/types/bill';
import {EXPENSE_CATEGORIES, ExpenseCategory} from '@/types/shopOps';
import {getErrorMessage} from '@/utils/axios';
import {useState} from 'react';

type ModalProps = {panel: string; onClose: () => void};

const amountOf = (v: number | '') => (v === '' ? NaN : Number(v));

/** Start the counter day with the cash already in the drawer */
export function OpenCounterModal({
  panel,
  onClose,
  defaultCash,
}: ModalProps & {defaultCash?: number | null}) {
  const open = useOpenCounter(panel);
  // Prefilled with the float kept at the last day close, when known
  const [cash, setCash] = useState<number | ''>(defaultCash ?? '');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const value = amountOf(cash);
    if (Number.isNaN(value) || value < 0)
      return setError('Enter the opening cash (0 or more).');
    try {
      await open.mutateAsync(value);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to open counter'));
    }
  };

  return (
    <FormDialog
      open
      title="Open counter"
      onClose={onClose}
      onSubmit={submit}
      saving={open.isPending}
      error={error}
      saveLabel="Open Counter"
    >
      <Field
        label="Opening cash in drawer"
        htmlFor="counter-cash"
        required
        hint="Cash in drawer = opening cash + cash received − cash refunds, expenses and supplier payments."
      >
        <input
          id="counter-cash"
          type="number"
          min={0}
          step="0.01"
          autoFocus
          className="field-input"
          value={cash}
          onChange={(e) =>
            setCash(e.target.value === '' ? '' : Number(e.target.value))
          }
        />
      </Field>
    </FormDialog>
  );
}

/** Shop running expense; cash expenses come out of the drawer */
export function ExpenseModal({panel, onClose}: ModalProps) {
  const create = useCreateExpense(panel);
  const [category, setCategory] = useState<ExpenseCategory | ''>('');
  const [amount, setAmount] = useState<number | ''>('');
  const [mode, setMode] = useState<PaymentMethod>('CASH');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const value = amountOf(amount);
    if (!category) return setError('Select a category.');
    if (Number.isNaN(value) || value <= 0)
      return setError('Enter an amount more than 0.');
    try {
      await create.mutateAsync({
        category,
        amount: value,
        mode,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to add expense'));
    }
  };

  return (
    <FormDialog
      open
      title="Add expense"
      onClose={onClose}
      onSubmit={submit}
      saving={create.isPending}
      error={error}
      saveLabel="Add Expense"
    >
      <Field label="Category" htmlFor="exp-category" required>
        <select
          id="exp-category"
          className="field-input"
          value={category}
          onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
        >
          <option value="">Select category</option>
          {EXPENSE_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" htmlFor="exp-amount" required>
          <input
            id="exp-amount"
            type="number"
            min={0}
            step="0.01"
            className="field-input"
            value={amount}
            onChange={(e) =>
              setAmount(e.target.value === '' ? '' : Number(e.target.value))
            }
          />
        </Field>
        <Field label="Paid by" htmlFor="exp-mode" required>
          <select
            id="exp-mode"
            className="field-input"
            value={mode}
            onChange={(e) => setMode(e.target.value as PaymentMethod)}
          >
            <option value="CASH">Cash (from drawer)</option>
            <option value="UPI">UPI</option>
            <option value="CARD">Card</option>
          </select>
        </Field>
      </div>
      <Field label="Notes" htmlFor="exp-notes">
        <input
          id="exp-notes"
          className="field-input"
          maxLength={300}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Field>
    </FormDialog>
  );
}
