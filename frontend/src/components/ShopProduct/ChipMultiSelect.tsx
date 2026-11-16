import {Check, Loader2} from 'lucide-react';
import {Controller, get, useFormContext} from 'react-hook-form';

type ChipOption = {id: string; name: string; hexCode?: string};

/** Multi-select as toggle chips (optional color swatch); value is string[] */
const ChipMultiSelect = ({
  name,
  label,
  options,
  loading,
  required,
  hint,
  emptyHint,
}: {
  name: string;
  label: string;
  options: ChipOption[];
  loading?: boolean;
  required?: boolean;
  /** Short help under the label */
  hint?: string;
  /** Shown when the master has no entries yet */
  emptyHint: string;
}) => {
  const {
    control,
    formState: {errors},
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;

  return (
    <fieldset>
      <legend className="field-label">
        {label}
        {required && <span className="text-error"> *</span>}
      </legend>
      {hint && <p className="field-hint -mt-1 mb-2">{hint}</p>}
      <Controller
        name={name}
        control={control}
        render={({field}) => {
          const value: string[] = field.value ?? [];
          const toggle = (id: string) =>
            field.onChange(
              value.includes(id)
                ? value.filter((v) => v !== id)
                : [...value, id],
            );
          if (loading) {
            return (
              <p className="flex items-center gap-2 text-body-sm text-outline">
                <Loader2 size={14} className="animate-spin" /> Loading…
              </p>
            );
          }
          if (!options.length) {
            return <p className="field-hint">{emptyHint}</p>;
          }
          return (
            <div className="flex flex-wrap gap-2">
              {options.map((o) => {
                const on = value.includes(o.id);
                return (
                  <button
                    key={o.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggle(o.id)}
                    onBlur={field.onBlur}
                    className={`inline-flex items-center gap-2 border px-3 py-1.5 text-body-sm transition ${
                      on
                        ? 'border-burgundy bg-burgundy text-ivory'
                        : 'border-ivory-300 bg-white text-espresso hover:border-burgundy/50'
                    }`}
                  >
                    {o.hexCode && (
                      <span
                        aria-hidden
                        className="h-3.5 w-3.5 rounded-full border border-hairline"
                        style={{backgroundColor: o.hexCode}}
                      />
                    )}
                    {o.name}
                    {on && <Check size={12} />}
                  </button>
                );
              })}
            </div>
          );
        }}
      />
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
    </fieldset>
  );
};

export default ChipMultiSelect;
