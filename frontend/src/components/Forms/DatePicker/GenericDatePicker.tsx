import Field, {describedBy} from '@/components/ui/Field';
import {get, useFormContext} from 'react-hook-form';

type GenericDatePickerProps = {
  name: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  /** yyyy-mm-dd */
  min?: string;
  max?: string;
  className?: string;
};

/** Date field inside a react-hook-form form; value is "yyyy-mm-dd" */
const GenericDatePicker = ({
  name,
  label,
  required,
  disabled,
  hint,
  min,
  max,
  className = '',
}: GenericDatePickerProps) => {
  const {
    register,
    formState: {errors},
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;

  return (
    <Field
      label={label}
      htmlFor={name}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      <input
        id={name}
        type="date"
        min={min}
        max={max}
        disabled={disabled}
        aria-invalid={!!error}
        aria-required={required || undefined}
        aria-describedby={describedBy(name, error, hint)}
        className="field-input"
        {...register(name)}
      />
    </Field>
  );
};

export type DateRange = {from?: string; to?: string};

type DateRangeFilterProps = {
  label?: string;
  value: DateRange;
  onChange: (value: DateRange) => void;
  className?: string;
};

/**
 * From / To filter for list toolbars (not a form field). "To" cannot be set
 * before "From": each input limits the other.
 */
export const GenericDateRangeFilter = ({
  label = 'Date',
  value,
  onChange,
  className = '',
}: DateRangeFilterProps) => (
  <fieldset className={`flex items-center gap-2 ${className}`}>
    <legend className="sr-only">{label} range</legend>
    <input
      type="date"
      aria-label={`${label} from`}
      value={value.from ?? ''}
      max={value.to}
      onChange={(e) => onChange({...value, from: e.target.value || undefined})}
      className="field-input py-2"
    />
    <span className="text-technical-data text-outline" aria-hidden="true">
      to
    </span>
    <input
      type="date"
      aria-label={`${label} to`}
      value={value.to ?? ''}
      min={value.from}
      onChange={(e) => onChange({...value, to: e.target.value || undefined})}
      className="field-input py-2"
    />
  </fieldset>
);

export default GenericDatePicker;
