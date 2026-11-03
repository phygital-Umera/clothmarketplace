import {GenericButton} from '@/components/Forms';
import {ReactNode} from 'react';
import {FormError} from './FormLayout';
import Overlay from './Overlay';

type FormDialogProps = {
  open: boolean;
  title: string;
  onClose: () => void;
  onSubmit: () => void;
  saving: boolean;
  error?: string;
  saveLabel?: string;
  children: ReactNode;
};

/** Small add / edit form in a dialog (categories, brands...) */
const FormDialog = ({
  open,
  title,
  onClose,
  onSubmit,
  saving,
  error,
  saveLabel = 'Save',
  children,
}: FormDialogProps) => (
  <Overlay open={open} onClose={onClose} label={title}>
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
      noValidate
      className="w-full max-w-lg border border-ivory-300 bg-white p-5"
    >
      <h2 className="mb-4 font-serif text-headline-sm text-burgundy">
        {title}
      </h2>
      <FormError message={error} />
      <div className="mt-3 space-y-3">{children}</div>
      <div className="mt-5 flex justify-end gap-2">
        <button type="button" onClick={onClose} className="btn-ghost">
          Cancel
        </button>
        <GenericButton type="submit" loading={saving}>
          {saveLabel}
        </GenericButton>
      </div>
    </form>
  </Overlay>
);

export default FormDialog;
