import {CompanyRules} from '@/lib/api/companySettings';
import {
  useCompanyRules,
  useUpdateCompanyRules,
} from '@/lib/react-query/queriesAndMutations/companySettings';
import {getErrorMessage} from '@/utils/axios';
import {useEffect, useState} from 'react';
import toast from 'react-hot-toast';

const FIELDS: {
  key: keyof CompanyRules;
  label: string;
  hint: string;
  prefix?: string;
  suffix?: string;
  step?: string;
}[] = [
  {
    key: 'refundApprovalLimit',
    label: 'Refund approval limit',
    hint: 'Card / UPI refunds above this wait for the branch admin (cash refunds always do)',
    prefix: '₹',
  },
  {
    key: 'discountApprovalPct',
    label: 'High discount',
    hint: 'Bills with a bigger discount are flagged on the branch sales page',
    suffix: '%',
    step: '0.5',
  },
  {
    key: 'lowStockDefault',
    label: 'Low-stock level',
    hint: 'For new items and the "Low stock" filter; each item can have its own',
    suffix: 'pcs',
    step: '1',
  },
  {
    key: 'defaultCreditDays',
    label: 'Default credit days',
    hint: 'For a new credit customer when none are given',
    suffix: 'days',
    step: '1',
  },
  {
    key: 'minMarginPct',
    label: 'Minimum margin',
    hint: 'Products below it are flagged on the branch price list',
    suffix: '%',
    step: '0.5',
  },
];

/** Company Profile → Settings: rules the owner sets for every shop (P4-08) */
const CompanyRulesForm = () => {
  const {data, isPending, isError, error} = useCompanyRules('company-admin');
  const save = useUpdateCompanyRules();
  const [form, setForm] = useState<Record<keyof CompanyRules, string> | null>(null);

  useEffect(() => {
    if (data) {
      setForm(
        Object.fromEntries(
          Object.entries(data).map(([k, v]) => [k, String(v)]),
        ) as Record<keyof CompanyRules, string>,
      );
    }
  }, [data]);

  if (isError) {
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
    const rules = Object.fromEntries(
      Object.entries(form).map(([k, v]) => [k, Number(v)]),
    ) as unknown as CompanyRules;
    save.mutate(rules, {
      onSuccess: () => toast.success('Settings saved'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not save the settings')),
    });
  };

  return (
    <form onSubmit={submit} noValidate>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 lg:grid-cols-3">
        {FIELDS.map((f) => (
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
                value={form[f.key]}
                onChange={(e) => setForm({...form, [f.key]: e.target.value})}
              />
              {f.suffix && <span className="text-outline">{f.suffix}</span>}
            </div>
            <p className="field-hint">{f.hint}</p>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <button type="submit" className="btn-primary" disabled={save.isPending}>
          {save.isPending ? 'Saving…' : 'Save settings'}
        </button>
      </div>
    </form>
  );
};

export default CompanyRulesForm;
