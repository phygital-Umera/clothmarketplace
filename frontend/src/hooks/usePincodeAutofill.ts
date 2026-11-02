import {PincodeNotFoundError} from '@/lib/api/pincode';
import {usePincode} from '@/lib/react-query/queriesAndMutations/company';
import {PATTERNS} from '@/lib/validation/fieldRules';
import {useEffect, useRef} from 'react';
import {Path, PathValue, UseFormReturn} from 'react-hook-form';

type AddressFields = {
  postalCode: string;
  state: string;
  district: string;
  city: string;
};

/**
 * Fills State / District / City when a valid 6-digit pincode is typed into
 * `postalCode` (India Post lookup). Fields stay editable. Returns the hint to
 * show under the Pincode input.
 */
const usePincodeAutofill = <T extends AddressFields>(
  form: UseFormReturn<T>,
  initialPincode = '',
) => {
  const {watch, setValue, setError, clearErrors} = form;
  const postalCode = watch('postalCode' as Path<T>) as string | undefined;
  const valid = PATTERNS.pincode.test(postalCode ?? '');
  const pincode = usePincode(valid ? postalCode : undefined);
  // The pincode the address was last filled from; an edit form starts filled
  const filledFrom = useRef(initialPincode);

  useEffect(() => {
    const details = pincode.data;
    if (!details || details.pincode === filledFrom.current) return;
    filledFrom.current = details.pincode;
    const opts = {shouldDirty: true, shouldValidate: true};
    (['state', 'district', 'city'] as const).forEach((key) =>
      setValue(key as Path<T>, details[key] as PathValue<T, Path<T>>, opts),
    );
  }, [pincode.data, setValue]);

  useEffect(() => {
    if (pincode.error instanceof PincodeNotFoundError) {
      setError('postalCode' as Path<T>, {message: pincode.error.message});
    } else if (!pincode.error) {
      clearErrors('postalCode' as Path<T>);
    }
  }, [pincode.error, setError, clearErrors]);

  /** Call after "save and add another" resets the form */
  const resetAutofill = () => {
    filledFrom.current = '';
  };

  const hint = !valid
    ? undefined
    : pincode.isFetching
      ? 'Finding location…'
      : pincode.error && !(pincode.error instanceof PincodeNotFoundError)
        ? 'Lookup unavailable, enter the address manually'
        : undefined;

  return {hint, resetAutofill};
};

export default usePincodeAutofill;
