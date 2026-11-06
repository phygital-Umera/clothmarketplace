import {useController, useFormContext} from 'react-hook-form';
import {
  AccessLevel,
  SHOP_MODULES,
  levelOf,
  withLevel,
} from '@/lib/shopModules';

const LEVELS: {value: AccessLevel; label: string}[] = [
  {value: 'none', label: 'No access'},
  {value: 'view', label: 'View'},
  {value: 'edit', label: 'Edit'},
];

/**
 * What an employee can open in their shop: per module No access / View
 * (read only) / Edit (view and change). Writes the form's `permissions`.
 */
const ModuleAccessField = ({name = 'permissions'}: {name?: string}) => {
  const {control} = useFormContext();
  const {field} = useController({control, name});
  const permissions: string[] = field.value ?? [];

  const setAll = (level: AccessLevel) =>
    field.onChange(SHOP_MODULES.reduce((p, m) => withLevel(p, m.key, level), permissions));

  return (
    <fieldset className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <legend className="field-label">Module access</legend>
        <div className="flex gap-1 text-[11px]">
          {LEVELS.map((l) => (
            <button
              key={l.value}
              type="button"
              onClick={() => setAll(l.value)}
              className="rounded border border-ivory-300 px-2 py-0.5 text-on-surface-variant hover:bg-ivory-100"
            >
              All {l.label.toLowerCase()}
            </button>
          ))}
        </div>
      </div>
      <div className="divide-y divide-ivory-200 rounded border border-ivory-300">
        {SHOP_MODULES.map((m) => {
          const level = levelOf(permissions, m.key);
          return (
            <div
              key={m.key}
              className="flex flex-col gap-2 px-3 py-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-espresso">{m.label}</p>
                <p className="text-[11px] text-on-surface-variant">{m.hint}</p>
              </div>
              <div
                className="inline-flex shrink-0 overflow-hidden rounded border border-ivory-300"
                role="radiogroup"
                aria-label={`${m.label} access`}
              >
                {LEVELS.map((l) => (
                  <button
                    key={l.value}
                    type="button"
                    role="radio"
                    aria-checked={level === l.value}
                    onClick={() => field.onChange(withLevel(permissions, m.key, l.value))}
                    className={`px-3 py-1 text-xs font-semibold transition ${
                      level === l.value
                        ? l.value === 'none'
                          ? 'bg-ivory-200 text-espresso'
                          : 'bg-burgundy-deep text-white'
                        : 'bg-white text-on-surface-variant hover:bg-ivory-100'
                    }`}
                  >
                    {l.label}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-[11px] text-on-surface-variant">
        View = can open and read. Edit = can also add and change. Changes apply on the
        employee's next click.
      </p>
    </fieldset>
  );
};

export default ModuleAccessField;
