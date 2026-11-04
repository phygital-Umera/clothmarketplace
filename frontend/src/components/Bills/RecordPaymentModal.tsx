import {Field} from '@/components/ui';
import FormDialog from '@/components/ui/FormDialog';
import {useRecordPayment} from '@/lib/react-query/queriesAndMutations/bill';
import {BillKind, PaymentMethod} from '@/types/bill';
import {getErrorMessage} from '@/utils/axios';
import {inr} from '@/utils/money';
import {useState} from 'react';

type DueBill = {id: string; billNumber: string; balanceDue: number};

interface Props {
  panel: string;
  kind: BillKind;
  /** Customer (sales) or supplier (purchase) the money is for */
  party: string;
  /** Bills with a balance, oldest first; the first is preselected */
  bills: DueBill[];
  onClose: () => void;
}

const MODES: {value: PaymentMethod; label: string}[] = [
  {value: 'CASH', label: 'Cash'},
  {value: 'UPI', label: 'UPI'},
  {value: 'CARD', label: 'Card'},
];

/** Collect a customer's due, or pay a supplier, against one bill */
export default function RecordPaymentModal({
  panel,
  kind,
  party,
  bills,
  onClose,
}: Props) {
  const isSales = kind === 'sales';
  const record = useRecordPayment(panel, kind);
  const [billId, setBillId] = useState(bills[0]?.id ?? '');
  const bill = bills.find((b) => b.id === billId);
  const [amount, setAmount] = useState<number | ''>(bill?.balanceDue ?? '');
  const [mode, setMode] = useState<PaymentMethod>('CASH');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = async () => {
    setError('');
    const value = Number(amount);
    if (!bill) return setError('Select a bill.');
    if (!value || value <= 0) return setError('Enter an amount more than 0.');
    if (value > bill.balanceDue)
      return setError(`Amount cannot be more than ${inr(bill.balanceDue)}.`);
    try {
      await record.mutateAsync({
        id: bill.id,
        data: {mode, amount: value, note: note.trim() || undefined},
      });
      onClose();
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to record payment'));
    }
  };

  return (
    <FormDialog
      open
      title={isSales ? `Collect due · ${party}` : `Pay supplier · ${party}`}
      onClose={onClose}
      onSubmit={submit}
      saving={record.isPending}
      error={error}
      saveLabel="Record Payment"
    >
      <Field label="Bill" htmlFor="pay-bill" required>
        <select
          id="pay-bill"
          className="field-input"
          value={billId}
          onChange={(e) => {
            setBillId(e.target.value);
            setAmount(
              bills.find((b) => b.id === e.target.value)?.balanceDue ?? '',
            );
          }}
        >
          {bills.map((b) => (
            <option key={b.id} value={b.id}>
              {b.billNumber} · due {inr(b.balanceDue)}
            </option>
          ))}
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Amount" htmlFor="pay-amount" required>
          <input
            id="pay-amount"
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
        <Field label="Mode" htmlFor="pay-mode" required>
          <select
            id="pay-mode"
            className="field-input"
            value={mode}
            onChange={(e) => setMode(e.target.value as PaymentMethod)}
          >
            {MODES.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label="Note" htmlFor="pay-note">
        <input
          id="pay-note"
          className="field-input"
          maxLength={300}
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
      </Field>
    </FormDialog>
  );
}
