import {
  ConfirmDialog,
  GenericButton,
  GenericDropdown,
  GenericFileUpload,
  GenericInputField,
  GenericPasswordField,
} from '@/components/Forms';
import usePincodeAutofill from '@/hooks/usePincodeAutofill';
import {
  COMPANY_FIELDS,
  companySchema,
  CompanySchema,
  editCompanySchema,
  EMPTY_COMPANY,
} from '@/lib/validation/companySchema';
import {applyServerErrors} from '@/lib/validation/fieldRules';
import {CompanyPayload} from '@/types/company';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {CircleAlert} from 'lucide-react';
import {ReactNode, useRef, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';

type SubmitIntent = 'save' | 'saveAndAdd';

type CompanyFormProps = {
  mode: 'create' | 'edit';
  defaultValues?: CompanySchema;
  existingLogo?: string | null;
  /** Edit only: the admin already has a password */
  hasAdminLogin?: boolean;
  /** "Add Admin" page: the admin's details first, their business below */
  adminFirst?: boolean;
  onSubmit: (payload: CompanyPayload, intent: SubmitIntent) => Promise<unknown>;
  onCancel: () => void;
};

const Group = ({title, children}: {title: string; children: ReactNode}) => (
  <fieldset>
    <legend className="mb-3 w-full border-b border-ivory-300 pb-1.5 text-label-caps uppercase text-burgundy">
      {title}
    </legend>
    {children}
  </fieldset>
);

const CompanyForm = ({
  mode,
  defaultValues = EMPTY_COMPANY,
  existingLogo,
  hasAdminLogin,
  adminFirst = false,
  onSubmit,
  onCancel,
}: CompanyFormProps) => {
  const [logo, setLogo] = useState<File | null>(null);
  const [removeLogo, setRemoveLogo] = useState(false);
  const [intent, setIntent] = useState<SubmitIntent>('save');
  const [formError, setFormError] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  // Belt and braces against double submits, on top of the disabled buttons
  const submitting = useRef(false);

  const form = useForm<CompanySchema>({
    resolver: zodResolver(
      mode === 'create' ? companySchema : editCompanySchema,
    ),
    defaultValues,
    mode: 'onTouched',
  });
  const {
    handleSubmit,
    setError,
    reset,
    formState: {isSubmitting, isDirty},
  } = form;

  const {hint: pincodeHint, resetAutofill} = usePincodeAutofill(
    form,
    defaultValues.postalCode,
  );

  const submit = handleSubmit(async (values) => {
    if (submitting.current) return;
    submitting.current = true;
    setFormError('');
    try {
      await onSubmit({values, logo, removeLogo}, intent);
      if (intent === 'saveAndAdd') {
        reset(EMPTY_COMPANY);
        resetAutofill();
        setLogo(null);
        window.scrollTo({top: 0, behavior: 'smooth'});
      }
    } catch (error) {
      // 400 field errors go under the matching field
      if (!applyServerErrors(error, setError, COMPANY_FIELDS)) {
        setFormError(getErrorMessage(error, 'Could not save the company'));
      }
    } finally {
      submitting.current = false;
    }
  });

  const adminGroup = (
    <Group title={adminFirst ? 'Admin' : 'Administrator'}>
      <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-3">
        <GenericInputField
          name="adminName"
          label="Full Name"
          kind="name"
          required
          autoFocus={mode === 'create' && adminFirst}
          placeholder="Priya Sharma"
        />
        <GenericInputField
          name="adminEmail"
          label="Email"
          kind="email"
          required
          placeholder="priya@aarvitextiles.in"
        />
        <GenericInputField
          name="adminPhone"
          label="Phone Number"
          kind="phone"
          prefix="+91"
          required
          placeholder="91234 56789"
        />
        <GenericPasswordField
          name="adminPassword"
          label="Password"
          required={mode === 'create'}
          hint={
            mode === 'create'
              ? 'Share it with the admin.'
              : hasAdminLogin
                ? 'Leave blank to keep the current password.'
                : 'No login yet. Set a password to create one.'
          }
        />
        <GenericDropdown
          name="status"
          label="Status"
          required
          placeholder="Select status"
          options={[
            {value: 'ACTIVE', label: 'Active'},
            {value: 'INACTIVE', label: 'Inactive'},
          ]}
        />
      </div>
    </Group>
  );

  const handleCancel = () =>
    isDirty || logo || removeLogo ? setConfirmLeave(true) : onCancel();

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="space-y-4">
        {formError && (
          <div
            role="alert"
            className="flex items-start gap-3 border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
          >
            <CircleAlert size={16} className="mt-0.5 shrink-0" />
            {formError}
          </div>
        )}

        <div className="panel grid gap-4 p-4 md:grid-cols-[7.5rem_1fr] md:gap-5">
          <div className="w-28 md:w-full">
            <GenericFileUpload
              label="Logo"
              file={logo}
              onFileChange={(file) => {
                setLogo(file);
                if (file) setRemoveLogo(false);
              }}
              existingUrl={removeLogo ? null : existingLogo}
              onRemoveExisting={() => setRemoveLogo(true)}
            />
          </div>

          <div className="space-y-5">
            {adminFirst && adminGroup}
            <Group title={adminFirst ? 'Business' : 'Company'}>
              <div className="grid gap-x-4 gap-y-3 md:grid-cols-3">
                <GenericInputField
                  name="name"
                  label="Company Name"
                  kind="text"
                  required
                  autoFocus={mode === 'create' && !adminFirst}
                  placeholder="Aarvi Textiles Pvt. Ltd."
                />
                <GenericInputField
                  name="email"
                  label="Company Email"
                  kind="email"
                  required
                  placeholder="contact@aarvitextiles.in"
                />
                <GenericInputField
                  name="contactNumber"
                  label="Contact Number"
                  kind="phone"
                  prefix="+91"
                  required
                  placeholder="98765 43210"
                />
              </div>
            </Group>

            <Group title="Location">
              <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
                <GenericInputField
                  name="postalCode"
                  label="Pincode"
                  kind="pincode"
                  required
                  placeholder="400093"
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
                  placeholder="Plot 14, MIDC Industrial Area"
                  className="sm:col-span-2 md:col-span-4"
                />
              </div>
            </Group>
            {!adminFirst && adminGroup}
          </div>
        </div>

        {/* Footer: sticks to the bottom so the actions stay reachable */}
        <div className="sticky bottom-0 z-9 border-t border-ivory-300 bg-ivory/95 py-3 backdrop-blur">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleCancel}
              className="btn-ghost border-ivory-300 px-3 text-on-surface-variant sm:px-5"
            >
              Cancel
            </button>
            <div className="flex gap-2">
              {mode === 'create' && (
                <GenericButton
                  type="submit"
                  variant="ghost"
                  disabled={isSubmitting}
                  loading={isSubmitting && intent === 'saveAndAdd'}
                  onClick={() => setIntent('saveAndAdd')}
                  className="px-3 sm:px-5"
                >
                  <span className="sm:hidden">Save &amp; New</span>
                  <span className="hidden sm:inline">
                    Save &amp; Add Another
                  </span>
                </GenericButton>
              )}
              <GenericButton
                type="submit"
                disabled={isSubmitting}
                loading={isSubmitting && intent === 'save'}
                onClick={() => setIntent('save')}
                className="px-3 sm:px-5"
              >
                {mode === 'edit'
                  ? 'Save Changes'
                  : adminFirst
                    ? 'Save Admin'
                    : 'Save Company'}
              </GenericButton>
            </div>
          </div>
        </div>

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

export default CompanyForm;
