import Field, {describedBy} from '@/components/ui/Field';
import {Eye, EyeOff} from 'lucide-react';
import {useState} from 'react';
import {get, useFormContext} from 'react-hook-form';

type GenericPasswordFieldProps = {
  name: string;
  label: string;
  required?: boolean;
  hint?: string;
  placeholder?: string;
  /** "new-password" when choosing one, "current-password" when typing it */
  autoComplete?: 'new-password' | 'current-password';
  autoFocus?: boolean;
  className?: string;
};

/** Password input with a show / hide toggle, for react-hook-form forms */
const GenericPasswordField = ({
  name,
  label,
  required,
  hint,
  placeholder = '••••••••',
  autoComplete = 'new-password',
  autoFocus,
  className = '',
}: GenericPasswordFieldProps) => {
  const {
    register,
    formState: {errors},
  } = useFormContext();
  const [visible, setVisible] = useState(false);
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
      <div className="relative">
        <input
          id={name}
          type={visible ? 'text' : 'password'}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          placeholder={placeholder}
          aria-invalid={!!error}
          aria-required={required || undefined}
          aria-describedby={describedBy(name, error, hint)}
          className="field-input pr-11"
          {...register(name)}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? `Hide ${label}` : `Show ${label}`}
          className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-outline hover:text-burgundy"
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </Field>
  );
};

export default GenericPasswordField;
