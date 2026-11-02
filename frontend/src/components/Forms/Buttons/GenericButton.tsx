import {Loader2} from 'lucide-react';
import React, {ButtonHTMLAttributes, ReactNode} from 'react';

export type ButtonVariant = 'primary' | 'ghost' | 'text' | 'danger' | 'icon';

interface GenericButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'type'> {
  variant?: ButtonVariant;
  type?: 'button' | 'submit' | 'reset';
  /** Shows a spinner and disables the button, so a form cannot submit twice */
  loading?: boolean;
  leftIcon?: ReactNode;
  children?: ReactNode;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: 'btn-primary',
  ghost: 'btn-ghost',
  text: 'btn-text',
  danger: 'btn bg-error text-white hover:bg-on-error-container',
  icon: 'btn-icon disabled:opacity-40',
};

const GenericButton: React.FC<GenericButtonProps> = ({
  variant = 'primary',
  type = 'button',
  loading = false,
  disabled = false,
  leftIcon,
  className = '',
  children,
  ...props
}) => (
  <button
    {...props}
    type={type}
    disabled={disabled || loading}
    aria-busy={loading || undefined}
    className={`${VARIANT_CLASS[variant]} ${className}`}
  >
    {loading ? (
      <Loader2 size={14} className="animate-spin" aria-hidden="true" />
    ) : (
      leftIcon
    )}
    {children}
  </button>
);

export default GenericButton;
