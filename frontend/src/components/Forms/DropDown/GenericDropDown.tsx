import Field, {describedBy} from '@/components/ui/Field';
import {ChevronDown, Loader2} from 'lucide-react';
import React from 'react';
import {Control, Controller, get, useFormContext} from 'react-hook-form';
import useDependsOn from './useDependsOn';

export interface Option {
  value: string;
  label: string;
}

interface GenericDropdownProps {
  name: string;
  label?: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  /** Parent field(s); this field is cleared when the user changes them */
  dependsOn?: string | string[];
  /** Options are still loading (e.g. from the API) */
  loading?: boolean;
  className?: string;
  /** @deprecated use `placeholder` */
  defaultOption?: string;
  /** @deprecated the form context is used automatically */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  control?: Control<any>;
}

/** Single select on a native <select>: accessible and phone-friendly */
const GenericDropdown: React.FC<GenericDropdownProps> = ({
  name,
  label,
  options,
  placeholder,
  required,
  disabled = false,
  hint,
  dependsOn,
  loading = false,
  className = '',
  defaultOption,
  control,
}) => {
  const form = useFormContext();
  useDependsOn(name, dependsOn);
  const error = get(form.formState.errors, name)?.message as string | undefined;
  const prompt =
    placeholder ?? defaultOption ?? `Select ${label?.toLowerCase() ?? ''}`;

  return (
    <Controller
      name={name}
      control={control ?? form.control}
      render={({field}) => {
        const value = (field.value as string | undefined) ?? '';
        // Keep a saved value selectable even if it is not in the list
        const list =
          value && !options.some((o) => o.value === value)
            ? [{value, label: value}, ...options]
            : options;

        return (
          <Field
            label={label}
            htmlFor={name}
            required={required}
            error={error}
            hint={hint}
            className={className}
          >
            <div className="relative">
              <select
                id={name}
                name={field.name}
                ref={field.ref}
                value={value}
                onChange={(e) => field.onChange(e.target.value)}
                onBlur={field.onBlur}
                disabled={disabled || loading}
                aria-invalid={!!error}
                aria-required={required || undefined}
                aria-describedby={describedBy(name, error, hint)}
                aria-busy={loading || undefined}
                className="field-input appearance-none pr-9"
              >
                <option value="">{loading ? 'Loading…' : prompt}</option>
                {list.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              {loading ? (
                <Loader2
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-outline"
                />
              ) : (
                <ChevronDown
                  size={16}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-outline"
                />
              )}
            </div>
          </Field>
        );
      }}
    />
  );
};

export {GenericDropdown};
export default GenericDropdown;
