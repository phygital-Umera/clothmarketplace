import {useState} from 'react';
import {errorMessage, fieldErrors} from '@/lib/api';
import {useSaveAddress} from '@/lib/queries';
import type {Address, AddressInput} from '@/lib/types';
import {btn, input, label} from './ui';

const STATES = [
  'Andhra Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Delhi', 'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh',
  'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Odisha', 'Punjab', 'Rajasthan',
  'Tamil Nadu', 'Telangana', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
];

const EMPTY: AddressInput = {
  recipient: '',
  phone: '',
  postalCode: '',
  address1: '',
  address2: '',
  city: '',
  state: 'Maharashtra',
  label: 'HOME',
  isDefault: true,
};

export default function AddressForm({
  initial,
  onSaved,
  onCancel,
  defaults,
}: {
  initial?: Address;
  onSaved: (a: Address) => void;
  onCancel?: () => void;
  defaults?: Partial<AddressInput>;
}) {
  const [form, setForm] = useState<AddressInput>(
    initial
      ? {...initial, address2: initial.address2 ?? '', district: initial.district ?? undefined}
      : {...EMPTY, ...defaults},
  );
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const save = useSaveAddress();

  const set = (k: keyof AddressInput) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({...f, [k]: e.target.value}));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError('');
    try {
      const saved = await save.mutateAsync({...form, id: initial?.id, address2: form.address2 || undefined});
      onSaved(saved);
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length) setError(errorMessage(err));
    }
  };

  const text = (k: keyof AddressInput, title: string, opts: {span?: boolean; inputMode?: 'numeric' | 'tel'; autoComplete?: string; max?: number} = {}) => (
    <div className={opts.span ? 'sm:col-span-2' : ''}>
      <label className={label} htmlFor={`addr-${k}`}>
        {title}
      </label>
      <input
        id={`addr-${k}`}
        value={(form[k] as string) ?? ''}
        onChange={set(k)}
        inputMode={opts.inputMode}
        autoComplete={opts.autoComplete}
        maxLength={opts.max}
        className={input}
        aria-invalid={!!errors[k]}
      />
      {errors[k] && <p className="mt-1 text-xs text-red-700">{errors[k]}</p>}
    </div>
  );

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        {text('recipient', 'Full name *', {autoComplete: 'name'})}
        {text('phone', 'Mobile *', {inputMode: 'tel', autoComplete: 'tel', max: 10})}
        {text('postalCode', 'Pincode *', {inputMode: 'numeric', autoComplete: 'postal-code', max: 6})}
        {text('address1', 'Flat / house no., building *', {autoComplete: 'address-line1'})}
        {text('address2', 'Area, street, landmark', {span: true, autoComplete: 'address-line2'})}
        {text('city', 'City *', {autoComplete: 'address-level2'})}
        <div>
          <label className={label} htmlFor="addr-state">
            State *
          </label>
          <select id="addr-state" value={form.state} onChange={set('state')} className={input}>
            {STATES.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex gap-1" role="radiogroup" aria-label="Address type">
          {(['HOME', 'WORK', 'OTHER'] as const).map((l) => (
            <button
              type="button"
              key={l}
              role="radio"
              aria-checked={form.label === l}
              onClick={() => setForm((f) => ({...f, label: l}))}
              className={`rounded border px-3 py-1.5 text-xs font-semibold ${form.label === l ? 'border-brand bg-brand text-white' : 'border-line bg-white'}`}
            >
              {l === 'HOME' ? 'Home' : l === 'WORK' ? 'Work' : 'Other'}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({...f, isDefault: e.target.checked}))} className="h-4 w-4 accent-brand" />
          Make this my default address
        </label>
      </div>
      {error && <p className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
      <div className="flex gap-2">
        <button className={btn.primary} disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save address'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel} className={btn.outline}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

export function AddressLines({a}: {a: Address}) {
  return (
    <>
      <p className="text-sm font-semibold text-ink">
        {a.recipient}{' '}
        <span className="ml-1 rounded bg-canvas px-1.5 py-0.5 text-[10px] font-bold uppercase text-ink-soft">{a.label}</span>
        {a.isDefault && <span className="ml-1 rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase text-brand">Default</span>}
      </p>
      <p className="text-sm text-ink-soft">
        {a.address1}
        {a.address2 ? `, ${a.address2}` : ''}
        <br />
        {a.city}, {a.state} {a.postalCode}
        <br />
        +91 {a.phone}
      </p>
    </>
  );
}
