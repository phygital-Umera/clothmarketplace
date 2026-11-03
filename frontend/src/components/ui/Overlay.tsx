import {ReactNode, useEffect} from 'react';

type OverlayProps = {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  /** `center` for dialogs, `right` for flyout drawers */
  placement?: 'center' | 'right';
  label: string;
};

// Parchment scrim (DESIGN.md: no black shrouds), Esc and scrim click close it
const Overlay = ({
  open,
  onClose,
  children,
  placement = 'center',
  label,
}: OverlayProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const {overflow} = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      className={`fixed inset-0 z-99999 flex bg-scrim backdrop-blur-[8px] ${
        placement === 'right'
          ? 'justify-end'
          : 'items-center justify-center p-4'
      }`}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      {children}
    </div>
  );
};

export default Overlay;
