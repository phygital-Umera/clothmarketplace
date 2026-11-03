import {Controller, get, useFormContext} from 'react-hook-form';

type Option = {value: string; label: string};

type GenericCheckboxGroupProps = {
  name: string;
  label: string;
  options: readonly Option[];
  hint?: string;
  className?: string;
};

/** Multi-select as checkboxes; the field value is a string[] */
const GenericCheckboxGroup = ({
  name,
  label,
  options,
  hint,
  className = '',
}: GenericCheckboxGroupProps) => {
  const {
    control,
    formState: {errors},
  } = useFormContext();
  const error = get(errors, name)?.message as string | undefined;

  return (
    <fieldset className={className}>
      <legend className="field-label">{label}</legend>
      <Controller
        name={name}
        control={control}
        render={({field}) => {
          const value: string[] = field.value ?? [];
          const toggle = (option: string) =>
            field.onChange(
              value.includes(option)
                ? value.filter((v) => v !== option)
                : [...value, option],
            );
          return (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              {options.map((option) => (
                <label
                  key={option.value}
                  className="flex items-center gap-2 text-body-sm text-espresso"
                >
                  <input
                    type="checkbox"
                    checked={value.includes(option.value)}
                    onChange={() => toggle(option.value)}
                    onBlur={field.onBlur}
                    className="h-4 w-4 accent-burgundy"
                  />
                  {option.label}
                </label>
              ))}
            </div>
          );
        }}
      />
      {error ? (
        <p role="alert" className="field-error">
          {error}
        </p>
      ) : (
        hint && <p className="field-hint">{hint}</p>
      )}
    </fieldset>
  );
};

export default GenericCheckboxGroup;
