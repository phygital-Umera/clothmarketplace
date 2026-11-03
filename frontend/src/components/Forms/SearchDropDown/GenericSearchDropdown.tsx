import Field, {describedBy} from '@/components/ui/Field';
import {ChevronDown, Loader2, X} from 'lucide-react';
import React, {KeyboardEvent, useEffect, useId, useRef, useState} from 'react';
import {Controller, get, useFormContext} from 'react-hook-form';
import useDependsOn from '../DropDown/useDependsOn';

interface Option {
  value: string;
  label: string;
}

interface GenericSearchDropdownProps {
  name: string;
  label?: string;
  options: Option[];
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  hint?: string;
  /** Parent field(s); this field is cleared when the user changes them */
  dependsOn?: string | string[];
  loading?: boolean;
  className?: string;
  /** Initial value when the form has none */
  defaultOption?: string;
}

/** Searchable single select (combobox) for long lists: companies, categories */
const GenericSearchDropdown: React.FC<GenericSearchDropdownProps> = ({
  name,
  label,
  options = [],
  placeholder,
  required,
  disabled = false,
  hint,
  dependsOn,
  loading = false,
  className = '',
  defaultOption = '',
}) => {
  const {control, formState} = useFormContext();
  useDependsOn(name, dependsOn);
  const error = get(formState.errors, name)?.message as string | undefined;
  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const [query, setQuery] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);

  const filtered = query
    ? options.filter((o) => o.label.toLowerCase().includes(query.toLowerCase()))
    : options;

  // Close when clicking outside
  useEffect(() => {
    const onMouseDown = (e: MouseEvent) => {
      if (!wrapperRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, []);

  useEffect(() => {
    if (highlighted < 0) return;
    const el = listRef.current?.children[highlighted] as
      | HTMLElement
      | undefined;
    el?.scrollIntoView({block: 'nearest'});
  }, [highlighted]);

  return (
    <Controller
      name={name}
      control={control}
      defaultValue={defaultOption}
      render={({field}) => {
        const selected = options.find((o) => o.value === field.value);
        const select = (option: Option) => {
          field.onChange(option.value);
          setQuery('');
          setIsOpen(false);
          setHighlighted(-1);
        };

        const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault();
            setIsOpen(true);
            const step = e.key === 'ArrowDown' ? 1 : -1;
            setHighlighted((i) =>
              filtered.length
                ? (i + step + filtered.length) % filtered.length
                : -1,
            );
          } else if (e.key === 'Enter' && isOpen && filtered[highlighted]) {
            e.preventDefault();
            select(filtered[highlighted]);
          } else if (e.key === 'Escape' && isOpen) {
            e.stopPropagation();
            setIsOpen(false);
            setQuery('');
          }
        };

        return (
          <Field
            label={label}
            htmlFor={name}
            required={required}
            error={error}
            hint={hint}
            className={className}
          >
            <div ref={wrapperRef} className="relative">
              <input
                id={name}
                ref={field.ref}
                role="combobox"
                autoComplete="off"
                aria-expanded={isOpen}
                aria-controls={listId}
                aria-autocomplete="list"
                aria-activedescendant={
                  isOpen && highlighted >= 0
                    ? `${listId}-${highlighted}`
                    : undefined
                }
                aria-invalid={!!error}
                aria-required={required || undefined}
                aria-describedby={describedBy(name, error, hint)}
                value={isOpen ? query : (selected?.label ?? '')}
                placeholder={
                  isOpen && selected
                    ? selected.label
                    : (placeholder ?? `Search ${label?.toLowerCase() ?? ''}`)
                }
                disabled={disabled || loading}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setIsOpen(true);
                  setHighlighted(0);
                }}
                onFocus={() => setIsOpen(true)}
                onClick={() => setIsOpen(true)}
                onBlur={field.onBlur}
                onKeyDown={onKeyDown}
                className="field-input pr-14"
              />
              <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1 text-outline">
                {selected && !disabled && (
                  <button
                    type="button"
                    tabIndex={-1}
                    aria-label={`Clear ${label ?? 'selection'}`}
                    onClick={() => field.onChange('')}
                    className="p-1 hover:text-burgundy"
                  >
                    <X size={14} />
                  </button>
                )}
                {loading ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <ChevronDown size={16} className="pointer-events-none" />
                )}
              </span>

              {isOpen && (
                <ul
                  id={listId}
                  ref={listRef}
                  role="listbox"
                  className="absolute z-99 mt-1 max-h-60 w-full overflow-y-auto border border-ivory-300 bg-white"
                >
                  {filtered.length ? (
                    filtered.map((option, i) => (
                      <li
                        key={option.value}
                        id={`${listId}-${i}`}
                        role="option"
                        aria-selected={option.value === field.value}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          select(option);
                        }}
                        onMouseEnter={() => setHighlighted(i)}
                        className={`cursor-pointer px-3.5 py-2 text-body-md ${
                          i === highlighted ? 'bg-blush/20 text-burgundy' : ''
                        } ${option.value === field.value ? 'font-medium' : ''}`}
                      >
                        {option.label}
                      </li>
                    ))
                  ) : (
                    <li className="px-3.5 py-2 text-body-sm text-outline">
                      No matches
                    </li>
                  )}
                </ul>
              )}
            </div>
          </Field>
        );
      }}
    />
  );
};

export default GenericSearchDropdown;
