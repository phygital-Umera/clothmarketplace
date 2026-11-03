export type Status =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'SUSPENDED'
  | 'BLOCKED'
  | 'PENDING_INVITATION';

// Existing tokens only (DESIGN.md): sage = good, ivory = neutral,
// warning / error = attention, blush = waiting
const STYLES: Record<Status, {label: string; badge: string; dot: string}> = {
  ACTIVE: {label: 'Active', badge: 'badge-active', dot: 'bg-secondary'},
  INACTIVE: {label: 'Inactive', badge: 'badge-inactive', dot: 'bg-outline'},
  SUSPENDED: {
    label: 'Suspended',
    badge:
      'badge rounded-full border border-warning/40 bg-ivory-100 text-warning',
    dot: 'bg-warning',
  },
  BLOCKED: {
    label: 'Blocked',
    badge:
      'badge rounded-full border border-error/30 bg-error-container text-on-error-container',
    dot: 'bg-error',
  },
  PENDING_INVITATION: {
    label: 'Pending Invitation',
    badge: 'badge rounded-full border border-hairline bg-blush text-burgundy',
    dot: 'bg-burgundy',
  },
};

const StatusBadge = ({status}: {status: Status}) => {
  const style = STYLES[status] ?? STYLES.INACTIVE;
  return (
    <span className={style.badge}>
      <span
        className={`h-1.5 w-1.5 rounded-full ${style.dot}`}
        aria-hidden="true"
      />
      {style.label}
    </span>
  );
};

export default StatusBadge;
