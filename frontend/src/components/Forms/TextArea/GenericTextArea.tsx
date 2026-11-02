import Field, {describedBy} from '@/components/ui/Field';
import React from 'react';
import {get, RegisterOptions, useFormContext, useWatch} from 'react-hook-form';

interface TextAreaProps {
  name: string;
  label?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  rows?: number;
  /** Also shows a "12 / 500" counter */
  maxLength?: number;
  rules?: RegisterOptions;
  className?: string;
  /** @deprecated use `rules` */
  validation?: RegisterOptions;
}

const GenericTextArea: React.FC<TextAreaProps> = ({
  name,
  label,
  placeholder,
  required,
  disabled = false,
  hint,
  rows = 3,
  maxLength,
  rules,
  className = '',
  validation,
}) => {
  const {
    register,
    control,
    formState: {errors},
  } = useFormContext();
  const value = useWatch({control, name, disabled: !maxLength}) as
    | string
    | undefined;
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
      <textarea
        id={name}
        rows={rows}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxLength}
        aria-invalid={!!error}
        aria-required={required || undefined}
        aria-describedby={describedBy(name, error, hint)}
        className="field-input resize-y"
        {...register(name, {...validation, ...rules} as RegisterOptions)}
      />
      {maxLength && (
        <p className="mt-1 text-right text-technical-data text-outline">
          {value?.length ?? 0} / {maxLength}
        </p>
      )}
    </Field>
  );
};

export default GenericTextArea;
