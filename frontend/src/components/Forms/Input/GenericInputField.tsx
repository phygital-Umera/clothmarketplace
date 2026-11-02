import Field, {describedBy} from '@/components/ui/Field';
import {FieldKind, kindFromLabel} from '@/lib/validation/fieldRules';
import React, {ChangeEvent, InputHTMLAttributes, ReactNode} from 'react';
import {get, RegisterOptions, useFormContext} from 'react-hook-form';

type InputProps = {
  name: string;
  label?: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  /** Overrides / extra react-hook-form rules (zod resolvers usually cover it) */
  rules?: RegisterOptions;
  /** Shown in a box before the input, e.g. "+91" */
  prefix?: ReactNode;
  maxLength?: number;
  /** Field kind from fieldRules; guessed from the label when missing */
  kind?: FieldKind;
  /** Wrapper class, e.g. "md:col-span-2" */
  className?: string;
  /** @deprecated use `rules` */
  validation?: RegisterOptions;
  defaultValue?: string | number;
} & Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'name' | 'type' | 'prefix' | 'className' | 'defaultValue'
>;

const PHONE_KINDS: FieldKind[] = ['phone', 'alternatePhone'];

/** Typing filters per kind: phones and numbers accept digits only */
const sanitize = (value: string, kind: FieldKind, type: string) => {
  if (PHONE_KINDS.includes(kind) || type === 'tel') {
    return value.replace(/\D/g, '').slice(0, 10);
  }
  if (kind === 'pincode') return value.replace(/\D/g, '').slice(0, 6);
  if (kind === 'quantity' || kind === 'displayOrder') {
    return value.replace(/\D/g, '');
  }
  if (kind === 'price') {
    // digits and one dot, at most 2 decimals
    const [whole, ...rest] = value.replace(/[^\d.]/g, '').split('.');
    return rest.length ? `${whole}.${rest.join('').slice(0, 2)}` : whole;
  }
  if (kind === 'code') return value.toUpperCase();
  return value;
};

const INPUT_DEFAULTS: Partial<
  Record<FieldKind, InputHTMLAttributes<HTMLInputElement>>
> = {
  email: {type: 'email', autoComplete: 'email'},
  phone: {type: 'tel', inputMode: 'numeric', autoComplete: 'tel-national'},
  alternatePhone: {type: 'tel', inputMode: 'numeric'},
  pincode: {inputMode: 'numeric', autoComplete: 'postal-code'},
  price: {inputMode: 'decimal'},
  quantity: {inputMode: 'numeric'},
  displayOrder: {inputMode: 'numeric'},
  url: {type: 'url', inputMode: 'url'},
  password: {type: 'password', autoComplete: 'current-password'},
  name: {autoComplete: 'name'},
};

const MAX_LENGTH: Partial<Record<FieldKind, number>> = {
  phone: 10,
  alternatePhone: 10,
  pincode: 6,
  code: 20,
  email: 254,
  gstin: 15,
};

const GenericInputField: React.FC<InputProps> = ({
  name,
  label,
  type,
  placeholder,
  required,
  disabled = false,
  hint,
  rules,
  prefix,
  maxLength,
  kind,
  className = '',
  validation,
  defaultValue,
  id,
  ...inputProps
}) => {
  const {
    register,
    formState: {errors},
  } = useFormContext();

  const resolvedKind = kind ?? (label ? kindFromLabel(label) : 'text');
  const defaults = INPUT_DEFAULTS[resolvedKind] ?? {};
  const inputType = type ?? defaults.type ?? 'text';
  const inputId = id ?? name;
  const error = get(errors, name)?.message as string | undefined;

  const registered = register(name, {
    // Older forms with type="number" expect numbers in their schema
    ...(inputType === 'number' ? {valueAsNumber: true} : {}),
    ...validation,
    ...rules,
  } as RegisterOptions);

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const clean = sanitize(e.target.value, resolvedKind, inputType);
    if (clean !== e.target.value) e.target.value = clean;
    return registered.onChange(e);
  };

  const input = (
    <input
      {...defaults}
      {...inputProps}
      {...registered}
      onChange={onChange}
      id={inputId}
      type={inputType}
      placeholder={placeholder}
      defaultValue={defaultValue}
      disabled={disabled}
      maxLength={maxLength ?? MAX_LENGTH[resolvedKind]}
      aria-invalid={!!error}
      aria-required={required || undefined}
      aria-describedby={describedBy(inputId, error, hint)}
      className={`field-input ${resolvedKind === 'code' ? 'font-medium uppercase tracking-[0.06em]' : ''}`}
    />
  );

  return (
    <Field
      label={label}
      htmlFor={inputId}
      required={required}
      error={error}
      hint={hint}
      className={className}
    >
      {prefix ? (
        <div className="flex">
          <span className="flex items-center border border-r-0 border-ivory-300 bg-ivory-200 px-3 text-technical-data text-on-surface-variant">
            {prefix}
          </span>
          {input}
        </div>
      ) : (
        input
      )}
    </Field>
  );
};

export default GenericInputField;
