import {useId} from 'react';
import {Controller, useFormContext} from 'react-hook-form';

type SwitchControlProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  id?: string;
};

/** On/off toggle (role="switch"); sharp edges like the rest of the system */
export const SwitchControl = ({
  checked,
  onChange,
  label,
  description,
  disabled,
  id,
}: SwitchControlProps) => {
  const autoId = useId();
  const switchId = id ?? autoId;

  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <label htmlFor={switchId} className="text-body-md text-espresso">
          {label}
        </label>
        {description && (
          <p id={`${switchId}-description`} className="field-hint mt-0">
            {description}
          </p>
        )}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? `${switchId}-description` : undefined}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-6 w-11 shrink-0 items-center border transition-colors focus-visible:outline focus-visible:outline-1 focus-visible:outline-offset-2 focus-visible:outline-burgundy disabled:cursor-not-allowed disabled:opacity-50 ${
          checked
            ? 'border-burgundy bg-burgundy'
            : 'border-ivory-300 bg-ivory-200'
        }`}
      >
        <span
          aria-hidden="true"
          className={`h-4 w-4 bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
};

type GenericSwitchProps = Omit<SwitchControlProps, 'checked' | 'onChange'> & {
  name: string;
};

/** Switch bound to a boolean field of the surrounding react-hook-form */
const GenericSwitch = ({name, ...props}: GenericSwitchProps) => {
  const {control} = useFormContext();
  return (
    <Controller
      name={name}
      control={control}
      render={({field}) => (
        <SwitchControl
          {...props}
          id={props.id ?? name}
          checked={!!field.value}
          onChange={field.onChange}
        />
      )}
    />
  );
};

export default GenericSwitch;
