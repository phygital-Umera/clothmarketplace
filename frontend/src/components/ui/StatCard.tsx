/** One dashboard figure; shows "–" while loading */
const StatCard = ({label, value}: {label: string; value?: number}) => (
  <div className="panel p-4">
    <p className="text-label-caps uppercase text-outline">{label}</p>
    <p className="mt-1 font-serif text-headline-sm text-burgundy">
      {value ?? '–'}
    </p>
  </div>
);

export default StatCard;
