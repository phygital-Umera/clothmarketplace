import {GenericPasswordField} from '@/components/Forms';
import {useResetPassword} from '@/lib/react-query/queriesAndMutations/auth';
import {applyServerErrors, field} from '@/lib/validation/fieldRules';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {Link, useSearch} from '@tanstack/react-router';
import {CircleAlert, CircleCheck, Loader2} from 'lucide-react';
import {useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';

const schema = z
  .object({
    newPassword: field({label: 'New Password', kind: 'password'}),
    confirmPassword: z.string().min(1, 'Confirm Password is required'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

/** Opened from the emailed link: /reset-password?token=... */
const ResetPassword = () => {
  const {token = ''} = useSearch({from: '/_auth/reset-password'});
  const {mutateAsync, isSuccess} = useResetPassword();
  const [formError, setFormError] = useState('');
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {newPassword: '', confirmPassword: ''},
    mode: 'onTouched',
  });
  const {
    handleSubmit,
    setError,
    formState: {isSubmitting},
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError('');
    try {
      await mutateAsync({token, ...values});
    } catch (error) {
      if (!applyServerErrors(error, setError, ['newPassword'])) {
        setFormError(getErrorMessage(error, 'Could not reset the password'));
      }
    }
  });

  return (
    <div>
      <p className="text-label-caps uppercase text-outline">Cloth Pro</p>
      <h1 className="mt-2 font-serif text-headline-lg-mobile text-burgundy">
        Choose a new password
      </h1>

      {isSuccess ? (
        <div className="mt-6 space-y-4">
          <div className="flex items-start gap-3 border border-hairline bg-ivory-100 px-4 py-3 text-body-sm text-espresso">
            <CircleCheck size={16} className="mt-0.5 shrink-0 text-secondary" />
            Your password has been reset. You can sign in now.
          </div>
          <Link to="/signin" className="btn-primary w-full">
            Sign in
          </Link>
        </div>
      ) : !token ? (
        <p className="mt-6 text-body-md text-on-surface-variant">
          This reset link is incomplete. Request a new one from{' '}
          <Link to="/forgot-password" className="text-burgundy underline">
            Forgot password
          </Link>
          .
        </p>
      ) : (
        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
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
              name="newPassword"
              label="New Password"
              required
              autoFocus
            />
            <GenericPasswordField
              name="confirmPassword"
              label="Confirm Password"
              required
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Reset password
            </button>
          </form>
        </FormProvider>
      )}
    </div>
  );
};

export default ResetPassword;
