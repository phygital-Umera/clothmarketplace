import {KeyboardEvent, useRef} from 'react';

export type Tab<V> = {value: V; label: string; count?: number};

type GenericTabsProps<V> = {
  tabs: Tab<V>[];
  value: V;
  onChange: (value: V) => void;
  /** underline: status filters / role tabs; vertical: settings sections */
  variant?: 'underline' | 'vertical';
  /** Accessible name, e.g. "Filter by status" */
  label: string;
  className?: string;
};

/**
 * Tab list with roving focus: Tab enters the list once, arrow keys move
 * between tabs (Left/Right, or Up/Down when vertical), Home/End jump.
 */
const GenericTabs = <V,>({
  tabs,
  value,
  onChange,
  variant = 'underline',
  label,
  className = '',
}: GenericTabsProps<V>) => {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const vertical = variant === 'vertical';
  const activeIndex = Math.max(
    0,
    tabs.findIndex((t) => t.value === value),
  );

  const move = (index: number) => {
    const next = (index + tabs.length) % tabs.length;
    refs.current[next]?.focus();
    onChange(tabs[next].value);
  };

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const keys: Record<string, () => void> = {
      [vertical ? 'ArrowDown' : 'ArrowRight']: () => move(index + 1),
      [vertical ? 'ArrowUp' : 'ArrowLeft']: () => move(index - 1),
      Home: () => move(0),
      End: () => move(tabs.length - 1),
    };
    if (keys[e.key]) {
      e.preventDefault();
      keys[e.key]();
    }
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      aria-orientation={vertical ? 'vertical' : 'horizontal'}
      className={`flex ${vertical ? 'flex-col' : 'overflow-x-auto'} ${className}`}
    >
      {tabs.map((tab, i) => {
        const active = i === activeIndex;
        return (
          <button
            key={String(tab.value ?? tab.label)}
            ref={(el) => (refs.current[i] = el)}
            type="button"
            role="tab"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(tab.value)}
            onKeyDown={(e) => onKeyDown(e, i)}
            className={`flex items-center gap-2 whitespace-nowrap px-3 py-2 text-label-caps uppercase transition-colors ${
              vertical ? 'border-l-2 text-left' : 'border-b-2'
            } ${
              active
                ? 'border-burgundy text-burgundy'
                : 'border-transparent text-on-surface-variant hover:text-burgundy'
            }`}
          >
            {tab.label}
            {'count' in tab && (
              <span
                className={`min-w-6 px-1.5 py-0.5 text-technical-data ${
                  active ? 'bg-burgundy text-ivory' : 'bg-ivory-200'
                }`}
              >
                {tab.count ?? '–'}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
};

export default GenericTabs;
