import {
  ConfirmDialog,
  GenericCheckboxGroup,
  GenericDropdown,
  GenericInputField,
  GenericPasswordField,
  GenericTextArea,
} from '@/components/Forms';
import {FormError, FormFooter, FormGroup} from '@/components/ui/FormLayout';
import usePincodeAutofill from '@/hooks/usePincodeAutofill';
import {applyServerErrors} from '@/lib/validation/fieldRules';
import {
  BRANCH_FIELDS,
  branchSchema,
  BranchValues,
  EMPTY_BRANCH,
} from '@/lib/validation/orgSchemas';
import {WEEK_DAYS} from '@/types/org';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';

const DAY_OPTIONS = WEEK_DAYS.map((d) => ({
  value: d,
  label: d.charAt(0) + d.slice(1, 3).toLowerCase(),
}));

type BranchFormProps = {
  mode: 'create' | 'edit';
  defaultValues?: BranchValues;
  /** Edit only: the branch already has an admin login */
  hasAdmin?: boolean;
  onSubmit: (values: BranchValues) => Promise<unknown>;
  onCancel: () => void;
};

/** Add / edit a branch and (optionally) its branch admin login */
const BranchForm = ({
  mode,
  defaultValues = EMPTY_BRANCH,
  hasAdmin,
  onSubmit,
  onCancel,
}: BranchFormProps) => {
  const [formError, setFormError] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const form = useForm<BranchValues>({
    resolver: zodResolver(branchSchema),
    defaultValues,
    mode: 'onTouched',
  });
  const {
    handleSubmit,
    setError,
    formState: {isSubmitting, isDirty},
  } = form;
  const {hint: pincodeHint} = usePincodeAutofill(
    form,
    defaultValues.postalCode,
  );

  const submit = handleSubmit(async (values) => {
    setFormError('');
    try {
      await onSubmit(values);
    } catch (error) {
      if (!applyServerErrors(error, setError, BRANCH_FIELDS)) {
        setFormError(getErrorMessage(error, 'Could not save the branch'));
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />

        <div className="panel space-y-5 p-4 md:p-5">
          <FormGroup title="Branch">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
              <GenericInputField
                name="name"
                label="Branch Name"
                kind="text"
                required
                autoFocus={mode === 'create'}
                placeholder="Miraj Main Store"
              />
              <GenericInputField
                name="email"
                label="Branch Email"
                kind="email"
              />
              <GenericInputField
                name="phone"
                label="Contact Phone"
                kind="phone"
                prefix="+91"
              />
              <GenericInputField
                name="alternatePhone"
                label="Alternate Phone"
                kind="alternatePhone"
                prefix="+91"
              />
            </div>
          </FormGroup>

          <FormGroup title="Location">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
              <GenericInputField
                name="postalCode"
                label="Pincode"
                kind="pincode"
                required
                hint={pincodeHint}
              />
              <GenericInputField
                name="state"
                label="State"
                kind="text"
                required
              />
              <GenericInputField
                name="district"
                label="District"
                kind="text"
                required
              />
              <GenericInputField
                name="city"
                label="City"
                kind="text"
                required
              />
              <GenericInputField
                name="address"
                label="Address"
                kind="text"
                required
                maxLength={500}
                className="sm:col-span-2 md:col-span-4"
              />
            </div>
          </FormGroup>

          <FormGroup title="Hours">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
              <GenericInputField
                name="openingTime"
                label="Opening Time"
                type="time"
              />
              <GenericInputField
                name="closingTime"
                label="Closing Time"
                type="time"
              />
              <GenericCheckboxGroup
                name="weeklyHolidays"
                label="Weekly Holidays"
                options={DAY_OPTIONS}
                className="sm:col-span-2"
              />
            </div>
          </FormGroup>

          <FormGroup title="Admin (optional)">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
              <GenericInputField
                name="adminName"
                label="Full Name"
                kind="name"
                placeholder="Rahul Patil"
              />
              <GenericInputField name="adminEmail" label="Email" kind="email" />
              <GenericInputField
                name="adminPhone"
                label="Phone Number"
                kind="phone"
                prefix="+91"
              />
              <GenericPasswordField
                name="adminPassword"
                label="Password"
                hint={
                  hasAdmin
                    ? 'Leave blank to keep the current password.'
                    : 'They must change it at first sign-in.'
                }
              />
            </div>
          </FormGroup>

          <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
            {/* On edit, status changes use Activate / Deactivate (with a reason) */}
            {mode === 'create' && (
              <GenericDropdown
                name="status"
                label="Status"
                required
                options={[
                  {value: 'ACTIVE', label: 'Active'},
                  {value: 'INACTIVE', label: 'Inactive'},
                ]}
              />
            )}
            <GenericTextArea
              name="notes"
              label="Notes"
              rows={1}
              maxLength={500}
              className={
                mode === 'create'
                  ? 'sm:col-span-1 md:col-span-3'
                  : 'sm:col-span-2 md:col-span-4'
              }
            />
          </div>
        </div>

        <FormFooter
          onCancel={() => (isDirty ? setConfirmLeave(true) : onCancel())}
          saving={isSubmitting}
          saveLabel={mode === 'create' ? 'Save Branch' : 'Save Changes'}
        />

        <ConfirmDialog
          open={confirmLeave}
          title="Discard changes?"
          message="You have unsaved changes on this form. Leaving now will lose them."
          confirmLabel="Discard"
          tone="danger"
          onConfirm={onCancel}
          onCancel={() => setConfirmLeave(false)}
        />
      </form>
    </FormProvider>
  );
};

export default BranchForm;
