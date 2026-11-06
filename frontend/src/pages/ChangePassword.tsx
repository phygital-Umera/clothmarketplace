import {GenericPasswordField} from '@/components/Forms';
import {PageHeader} from '@/components/ui';
import {useAuthContext} from '@/context/AuthContext';
import {useChangeCurrentPassword} from '@/lib/react-query/queriesAndMutations/auth';
import {AUTH_KEYS} from '@/lib/react-query/queryKeys';
import {applyServerErrors, field} from '@/lib/validation/fieldRules';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {useQueryClient} from '@tanstack/react-query';
import {CircleAlert, Loader2} from 'lucide-react';
import {useEffect, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import toast from 'react-hot-toast';
import {z} from 'zod';

// Same rules as backend changePasswordSchema
const schema = z
  .object({
    currentPassword: z.string().min(1, 'Current Password is required'),
    newPassword: field({label: 'New Password', kind: 'password'}),
    confirmPassword: z.string().min(1, 'Confirm Password is required'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })
  .refine((v) => v.newPassword !== v.currentPassword, {
    message: 'New Password must be different from the current one',
    path: ['newPassword'],
  });

const FIELDS = ['currentPassword', 'newPassword', 'confirmPassword'];

/** For every role; also where a password chosen by someone else is replaced */
const ChangePassword = () => {
  const {login} = useAuthContext();
  const queryClient = useQueryClient();
  const {mutateAsync} = useChangeCurrentPassword();
  const [formError, setFormError] = useState('');

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {currentPassword: '', newPassword: '', confirmPassword: ''},
    mode: 'onTouched',
  });
  const {
    handleSubmit,
    setError,
    reset,
    formState: {isSubmitting},
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError('');
    try {
      const res = await mutateAsync(values);
      // Other devices are signed out; this one gets fresh tokens
      login(res.data);
      await queryClient.invalidateQueries({
        queryKey: [AUTH_KEYS.GET_CURRENT_USER],
      });
      toast.success('Password changed');
      reset();
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) {
        setFormError(getErrorMessage(error, 'Could not change the password'));
      }
    }
  });

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Security'}]}
        title="Change password"
      />

      <FormProvider {...form}>
        <form
          onSubmit={onSubmit}
          noValidate
          className="panel max-w-xl space-y-4 p-4 md:p-5"
        >
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-3 border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
            >
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              {formError}
            </div>
          )}
          <GenericPasswordField
            name="currentPassword"
            label="Current Password"
            autoComplete="current-password"
            required
            autoFocus
          />
          <GenericPasswordField
            name="newPassword"
            label="New Password"
            required
          />
          <GenericPasswordField
            name="confirmPassword"
            label="Confirm Password"
            required
          />
          <button type="submit" disabled={isSubmitting} className="btn-primary">
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Change password
          </button>
        </form>
      </FormProvider>
    </>
  );
};

export default ChangePassword;
