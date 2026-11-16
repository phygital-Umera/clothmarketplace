import {GenericButton} from '@/components/Forms';
import {CircleAlert} from 'lucide-react';
import {ReactNode} from 'react';

/** Small titled group inside a form panel (Company / Location / ...) */
export const FormGroup = ({
  title,
  description,
  children,
}: {
  title: string;
  /** One plain sentence under the title: what this part is for */
  description?: ReactNode;
  children: ReactNode;
}) => (
  <fieldset>
    <legend className="mb-3 w-full border-b border-ivory-300 pb-1.5 text-label-caps uppercase text-burgundy">
      {title}
    </legend>
    {description && (
      <p className="-mt-1.5 mb-3 text-body-sm text-on-surface-variant">
        {description}
      </p>
    )}
    {children}
  </fieldset>
);

/** Form-level error that does not belong to one field */
export const FormError = ({message}: {message?: string}) =>
  message ? (
    <div
      role="alert"
      className="flex items-start gap-3 border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
    >
      <CircleAlert size={16} className="mt-0.5 shrink-0" />
      {message}
    </div>
  ) : null;

/** Sticky Cancel / Save bar at the bottom of a form */
export const FormFooter = ({
  onCancel,
  saving,
  saveLabel,
}: {
  onCancel: () => void;
  saving: boolean;
  saveLabel: string;
}) => (
  <div className="sticky bottom-0 z-9 border-t border-ivory-300 bg-ivory/95 py-3 backdrop-blur">
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="btn-ghost border-ivory-300 px-3 text-on-surface-variant sm:px-5"
      >
        Cancel
      </button>
      <GenericButton type="submit" loading={saving} className="px-3 sm:px-5">
        {saveLabel}
      </GenericButton>
    </div>
  </div>
);
