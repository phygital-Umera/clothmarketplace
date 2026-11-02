import {GenericInputField} from '@/components/Forms';
import {useRequestResetPassword} from '@/lib/react-query/queriesAndMutations/auth';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {Link} from '@tanstack/react-router';
import {CircleAlert, Loader2, MailCheck} from 'lucide-react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';

const schema = z.object({
  identifier: z.string().trim().min(1, 'Email or mobile number is required'),
});

/** Asks for a reset link. The reply is the same whether or not the account exists. */
const ForgotPassword = () => {
  const {mutateAsync, isSuccess, data, error} = useRequestResetPassword();
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: {identifier: ''},
  });
  const {
    handleSubmit,
    formState: {isSubmitting},
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    await mutateAsync(values).catch(() => undefined);
  });

  return (
    <div>
      <p className="text-label-caps uppercase text-outline">Cloth Pro</p>
      <h1 className="mt-2 font-serif text-headline-lg-mobile text-burgundy">
        Forgot password
      </h1>

      {isSuccess ? (
        <div className="mt-6 flex items-start gap-3 border border-hairline bg-ivory-100 px-4 py-3 text-body-sm text-espresso">
          <MailCheck size={16} className="mt-0.5 shrink-0 text-burgundy" />
          {data?.message}
        </div>
      ) : (
        <FormProvider {...form}>
          <form onSubmit={onSubmit} noValidate className="mt-6 space-y-5">
            {error && (
              <div
                role="alert"
                className="flex items-start gap-3 border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
              >
                <CircleAlert size={16} className="mt-0.5 shrink-0" />
                {getErrorMessage(error, 'Could not send the reset link')}
              </div>
            )}
            <GenericInputField
              name="identifier"
              label="Email or mobile number"
              kind="text"
              required
              autoFocus
              hint="We email a reset link to the address on the account."
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary w-full"
            >
              {isSubmitting && <Loader2 size={14} className="animate-spin" />}
              Send reset link
            </button>
          </form>
        </FormProvider>
      )}

      <p className="mt-6 text-body-sm text-on-surface-variant">
        <Link
          to="/signin"
          className="text-burgundy underline-offset-4 hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
};

export default ForgotPassword;
