import {getErrorMessage} from '@/utils/axios';
import {Loader2} from 'lucide-react';
import {ReactNode} from 'react';

type EditorPanelProps = {
  title: string;
  loading?: boolean;
  error?: unknown;
  onCancel: () => void;
  children: ReactNode;
};

/** Frame for an add / edit form shown above its list */
const EditorPanel = ({
  title,
  loading,
  error,
  onCancel,
  children,
}: EditorPanelProps) => (
  <section className="mb-6">
    <h2 className="mb-2 font-serif text-headline-sm text-burgundy">{title}</h2>
    {loading ? (
      <div className="flex items-center gap-2 py-8 text-on-surface-variant">
        <Loader2 size={16} className="animate-spin" /> Loading…
      </div>
    ) : error ? (
      <div className="panel px-6 py-8 text-center">
        <p className="text-body-sm text-on-surface-variant">
          {getErrorMessage(error, 'It may have been removed.')}
        </p>
        <button type="button" onClick={onCancel} className="btn-ghost mt-4">
          Close
        </button>
      </div>
    ) : (
      children
    )}
  </section>
);

export default EditorPanel;
