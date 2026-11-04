import {ReactNode} from 'react';

type Props = {
  label: string;
  value: string;
  note?: ReactNode;
  tone?: 'muted' | 'good' | 'bad';
  onClick?: () => void;
};

const TONES = {
  muted: 'text-outline',
  good: 'text-secondary',
  bad: 'text-error',
};

/** A dashboard figure with a short note under it */
const KpiCard = ({label, value, note, tone = 'muted', onClick}: Props) => {
  const body = (
    <>
      <p className="text-label-caps uppercase text-outline">{label}</p>
      <p className="mt-1 font-serif text-headline-sm text-burgundy">{value}</p>
      {note && (
        <p className={`mt-1 text-technical-data ${TONES[tone]}`}>{note}</p>
      )}
    </>
  );
  return onClick ? (
    <button
      type="button"
      onClick={onClick}
      className="panel p-4 text-left transition-colors hover:border-burgundy"
    >
      {body}
    </button>
  ) : (
    <div className="panel p-4">{body}</div>
  );
};

export default KpiCard;
