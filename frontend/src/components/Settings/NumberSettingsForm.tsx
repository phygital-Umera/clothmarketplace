import {getErrorMessage} from '@/utils/axios';
import {useEffect, useState} from 'react';
import toast from 'react-hot-toast';

export type NumberField<T> = {
  key: keyof T & string;
  label: string;
  hint: string;
  prefix?: string;
  suffix?: string;
  step?: string;
};

type Props<T extends object> = {
  fields: NumberField<T>[];
  data: T | undefined;
  isPending: boolean;
  error: unknown;
  saving: boolean;
  onSave: (values: T, done: {onSuccess: () => void; onError: (e: unknown) => void}) => void;
};

/** A grid of number settings with one Save button (company and store settings, P4-08) */
export default function NumberSettingsForm<T extends object>({
  fields,
  data,
  isPending,
  error,
  saving,
  onSave,
}: Props<T>) {
  const [form, setForm] = useState<Record<string, string> | null>(null);

  useEffect(() => {
    if (data) {
      setForm(Object.fromEntries(Object.entries(data).map(([k, v]) => [k, String(v)])));
    }
  }, [data]);

  if (error) {
    return (
      <p className="text-body-sm text-rose-700">
        {getErrorMessage(error, 'Settings could not be loaded')}
      </p>
    );
  }
  if (isPending || !form) {
    return <p className="text-body-sm text-on-surface-variant">Loading settings…</p>;
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const values = Object.fromEntries(
      fields.map((f) => [f.key, Number(form[f.key])]),
    ) as unknown as T;
    onSave(values, {
      onSuccess: () => toast.success('Settings saved'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not save the settings')),
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {fields.map((f) => (
          <div key={f.key}>
            <label className="field-label" htmlFor={f.key}>
              {f.label}
            </label>
            <div className="flex items-center gap-2">
              {f.prefix && <span className="text-outline">{f.prefix}</span>}
              <input
                id={f.key}
                className="field-input"
                type="number"
                min={0}
                step={f.step ?? '1'}
                value={form[f.key] ?? ''}
                onChange={(e) => setForm({...form, [f.key]: e.target.value})}
              />
              {f.suffix && <span className="text-outline">{f.suffix}</span>}
            </div>
            <p className="field-hint">{f.hint}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" className="btn-primary" disabled={saving}>
          {saving ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
}
