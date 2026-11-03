import {ReactNode} from 'react';
import Overlay from './Overlay';

type DetailItem = {
  label: string;
  value: ReactNode;
  fullWidth?: boolean;
};

type ViewDetailsDialogProps = {
  open: boolean;
  title: string;
  badge?: ReactNode;
  items: DetailItem[];
  onClose: () => void;
  children?: ReactNode;
};

const ViewDetailsDialog = ({
  open,
  title,
  badge,
  items,
  onClose,
  children,
}: ViewDetailsDialogProps) => (
  <Overlay open={open} onClose={onClose} label={title}>
    <div className="w-full max-w-lg border border-ivory-300 bg-white p-5 shadow-lg">
      <div className="mb-4 flex items-center justify-between border-b border-ivory-200 pb-3">
        <div>
          <h2 className="font-serif text-headline-sm text-burgundy">{title}</h2>
        </div>
        {badge && <div>{badge}</div>}
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-3 py-2 text-body-sm">
        {items.map((item, idx) => (
          <div
            key={idx}
            className={item.fullWidth ? 'col-span-2' : 'col-span-1'}
          >
            <p className="text-technical-data uppercase tracking-wider text-outline">
              {item.label}
            </p>
            <div className="mt-0.5 font-medium text-espresso">
              {item.value || <span className="text-outline">None</span>}
            </div>
          </div>
        ))}
      </div>

      {children && <div className="mt-4 border-t border-ivory-200 pt-3">{children}</div>}

      <div className="mt-5 flex justify-end">
        <button type="button" onClick={onClose} className="btn-secondary">
          Close
        </button>
      </div>
    </div>
  </Overlay>
);

export default ViewDetailsDialog;

