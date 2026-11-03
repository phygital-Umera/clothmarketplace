import {Loader2} from 'lucide-react';
import {useEffect, useId, useState} from 'react';
import Overlay from './Overlay';

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  tone?: 'danger' | 'default';
  isLoading?: boolean;
  /** Suspend / block / restrict: the user must type why before confirming */
  requireReason?: boolean;
  reasonLabel?: string;
  /** Receives the trimmed reason when `requireReason` is on */
  onConfirm: (reason?: string) => void;
  onCancel: () => void;
};

const MIN_REASON = 5;

const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel,
  tone = 'default',
  isLoading,
  requireReason = false,
  reasonLabel = 'Reason',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) => {
  const reasonId = useId();
  const [reason, setReason] = useState('');
  const [touched, setTouched] = useState(false);

  // Start empty every time the dialog opens
  useEffect(() => {
    if (open) {
      setReason('');
      setTouched(false);
    }
  }, [open]);

  const trimmed = reason.trim();
  const reasonError = !trimmed
    ? `${reasonLabel} is required`
    : trimmed.length < MIN_REASON
      ? `${reasonLabel} must be at least ${MIN_REASON} characters`
      : '';
  const showError = requireReason && touched && !!reasonError;

  const confirm = () => {
    if (requireReason) {
      setTouched(true);
      if (reasonError) return;
      onConfirm(trimmed);
    } else {
      onConfirm();
    }
  };

  return (
    <Overlay open={open} onClose={onCancel} label={title}>
      <div className="w-full max-w-md border border-ivory-300 bg-white p-6">
        <h2 className="font-serif text-headline-sm text-burgundy">{title}</h2>
        <p className="mt-2 text-body-md text-on-surface-variant">{message}</p>

        {requireReason && (
          <div className="mt-4">
            <label htmlFor={reasonId} className="field-label">
              {reasonLabel}
              <span className="ml-1 text-burgundy" aria-hidden="true">
                *
              </span>
            </label>
            <textarea
              id={reasonId}
              rows={3}
              autoFocus
              maxLength={500}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              onBlur={() => setTouched(true)}
              aria-required="true"
              aria-invalid={showError}
              aria-describedby={showError ? `${reasonId}-error` : undefined}
              className="field-input resize-y"
              placeholder="This is saved in the audit log."
            />
            {showError && (
              <p id={`${reasonId}-error`} role="alert" className="field-error">
                {reasonError}
              </p>
            )}
          </div>
        )}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" className="btn-ghost" onClick={onCancel}>
            Keep it
          </button>
          <button
            type="button"
            autoFocus={!requireReason}
            disabled={isLoading}
            onClick={confirm}
            className={
              tone === 'danger'
                ? 'btn bg-error text-white hover:bg-on-error-container'
                : 'btn-primary'
            }
          >
            {isLoading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </Overlay>
  );
};

export default ConfirmDialog;
