import {ReactNode} from 'react';

type StatCardProps = {
  label: string;
  value?: number;
  /** Preformatted value (e.g. "₹20,640"); wins over `value` */
  display?: string;
  /** Small line under the value */
  sub?: ReactNode;
};

/** One dashboard figure; shows "–" while loading */
const StatCard = ({label, value, display, sub}: StatCardProps) => (
  <div className="panel min-w-0 p-4">
    <p className="text-label-caps uppercase text-outline">{label}</p>
    <p className="mt-1 truncate font-serif text-headline-sm text-burgundy">
      {display ?? value ?? '–'}
    </p>
    {sub && (
      <div className="mt-0.5 text-technical-data text-on-surface-variant">
        {sub}
      </div>
    )}
  </div>
);

export default StatCard;
