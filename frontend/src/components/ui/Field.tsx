import {ReactNode} from 'react';

type FieldProps = {
  label?: string;
  htmlFor: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

/** ids the control should point at with aria-describedby */
export const describedBy = (id: string, error?: string, hint?: string) =>
  error ? `${id}-error` : hint ? `${id}-hint` : undefined;

const Field = ({
  label,
  htmlFor,
  required,
  error,
  hint,
  className = '',
  children,
}: FieldProps) => (
  <div className={className}>
    {label && (
      <label htmlFor={htmlFor} className="field-label">
        {label}
        {required && (
          <span className="ml-1 text-burgundy" aria-hidden="true">
            *
          </span>
        )}
      </label>
    )}
    {children}
    {error ? (
      <p id={`${htmlFor}-error`} role="alert" className="field-error">
        {error}
      </p>
    ) : (
      hint && (
        <p id={`${htmlFor}-hint`} className="field-hint">
          {hint}
        </p>
      )
    )}
  </div>
);

export default Field;
