import {PageHeader} from '@/components/ui';
import {GST_RATES, GstRule} from '@/lib/api/gst';
import {useGstRule, useUpdateGstRule} from '@/lib/react-query/queriesAndMutations/gst';
import {getErrorMessage} from '@/utils/axios';
import {Loader2} from 'lucide-react';
import {useEffect, useState} from 'react';
import toast from 'react-hot-toast';

const inr = (v: number) => `₹${v.toLocaleString('en-IN')}`;

/**
 * D-18: the shop's GST price rule and the slabs its products may use.
 * Products set to "Auto" follow the rule; the POS and the store apply it.
 */
const GstSettingsPage = () => {
  const {data: rule, isPending, isError, error, refetch} = useGstRule();
  const save = useUpdateGstRule();
  const [form, setForm] = useState<GstRule | null>(null);
  const [flat, setFlat] = useState(false);

  useEffect(() => {
    if (rule) {
      setForm({
        threshold: rule.threshold,
        rateUpTo: rule.rateUpTo,
        rateAbove: rule.rateAbove,
        slabs: rule.slabs,
      });
      setFlat(rule.threshold <= 0);
    }
  }, [rule]);

  if (isPending || !form) {
    return isError ? (
      <div className="panel px-6 py-12 text-center">
        <p className="font-serif text-headline-sm text-burgundy">
          GST settings not available
        </p>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          {getErrorMessage(error, 'Something went wrong.')}
        </p>
        <button onClick={() => refetch()} className="btn-ghost mt-4">
          Try again
        </button>
      </div>
    ) : (
      <div className="flex items-center gap-2 py-16 text-on-surface-variant">
        <Loader2 size={16} className="animate-spin" /> Loading GST settings…
      </div>
    );
  }

  const toggleSlab = (rate: number) =>
    setForm((f) =>
      f && {
        ...f,
        slabs: f.slabs.includes(rate)
          ? f.slabs.filter((s) => s !== rate)
          : [...f.slabs, rate].sort((a, b) => a - b),
      },
    );

  const missing =
    !form.slabs.includes(form.rateUpTo) ||
    (!flat && !form.slabs.includes(form.rateAbove));

  const submit = () => {
    const body: GstRule = flat
      ? {...form, threshold: 0, rateAbove: form.rateUpTo}
      : form;
    save.mutate(body, {
      onSuccess: () => toast.success('GST settings saved'),
      onError: (err) => toast.error(getErrorMessage(err, 'Could not save')),
    });
  };

  const example = flat
    ? `Every piece: ${form.rateUpTo}% GST.`
    : `A piece that sells for ${inr(Math.round(form.threshold * (1 + form.rateUpTo / 100)))} (incl. GST) or less: ${form.rateUpTo}%. Above that: ${form.rateAbove}%.`;

  const rateSelect = (
    value: number,
    onChange: (v: number) => void,
    id: string,
  ) => (
    <select
      id={id}
      className="field-input"
      value={String(value)}
      onChange={(e) => onChange(Number(e.target.value))}
    >
      {form.slabs.map((s) => (
        <option key={s} value={s}>
          {s}%
        </option>
      ))}
    </select>
  );

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Settings'}, {label: 'GST'}]}
        title="GST settings"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="panel p-4 md:p-5">
          <h2 className="mb-3 border-b border-ivory-300 pb-1.5 text-label-caps uppercase text-burgundy">
            Price rule
          </h2>
          <p className="mb-3 text-body-sm text-on-surface-variant">
            Products set to <b>Auto</b> get their GST from this rule, worked
            out on the price of each piece after discount. Confirm the numbers
            with your CA.
          </p>

          <label className="mb-3 flex items-center gap-2 text-body-sm text-espresso">
            <input
              type="checkbox"
              checked={flat}
              onChange={(e) => setFlat(e.target.checked)}
            />
            One rate for every price
          </label>

          {flat ? (
            <div>
              <label className="field-label" htmlFor="rateUpTo">
                GST rate
              </label>
              {rateSelect(
                form.rateUpTo,
                (v) => setForm({...form, rateUpTo: v}),
                'rateUpTo',
              )}
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label className="field-label" htmlFor="threshold">
                  Price limit (before GST)
                </label>
                <input
                  id="threshold"
                  className="field-input"
                  type="number"
                  min={1}
                  step="1"
                  value={form.threshold || ''}
                  onChange={(e) =>
                    setForm({...form, threshold: Number(e.target.value) || 0})
                  }
                />
                <p className="field-hint">Per piece</p>
              </div>
              <div>
                <label className="field-label" htmlFor="rateUpTo">
                  Up to the limit
                </label>
                {rateSelect(
                  form.rateUpTo,
                  (v) => setForm({...form, rateUpTo: v}),
                  'rateUpTo',
                )}
              </div>
              <div>
                <label className="field-label" htmlFor="rateAbove">
                  Above the limit
                </label>
                {rateSelect(
                  form.rateAbove,
                  (v) => setForm({...form, rateAbove: v}),
                  'rateAbove',
                )}
              </div>
            </div>
          )}
          <p className="mt-3 rounded bg-ivory-100 px-3 py-2 text-body-sm text-espresso">
            {example}
          </p>
        </section>

        <section className="panel p-4 md:p-5">
          <h2 className="mb-3 border-b border-ivory-300 pb-1.5 text-label-caps uppercase text-burgundy">
            GST slabs you use
          </h2>
          <p className="mb-3 text-body-sm text-on-surface-variant">
            The rates offered in the product form and on purchase bills. A
            product with a fixed rate must use one of these.
          </p>
          <div className="flex flex-wrap gap-2">
            {GST_RATES.map((rate) => {
              const on = form.slabs.includes(rate);
              return (
                <button
                  key={rate}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSlab(rate)}
                  className={
                    on
                      ? 'rounded-full border border-burgundy bg-burgundy px-3 py-1 text-body-sm text-white'
                      : 'rounded-full border border-ivory-300 px-3 py-1 text-body-sm text-espresso'
                  }
                >
                  {rate}%
                </button>
              );
            })}
          </div>
          {missing && (
            <p className="field-error mt-2">
              The rule's rates must be among the slabs you use.
            </p>
          )}
        </section>
      </div>

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          className="btn-primary"
          disabled={save.isPending || missing || form.slabs.length === 0}
          onClick={submit}
        >
          {save.isPending ? 'Saving…' : 'Save GST settings'}
        </button>
      </div>
    </>
  );
};

export default GstSettingsPage;
