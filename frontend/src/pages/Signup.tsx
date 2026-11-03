import {GenericInputField, GenericPasswordField} from '@/components/Forms';
import {useAuthContext} from '@/context/AuthContext';
import {loginUser} from '@/lib/api/Auth/auth';
import {useRegisterUser} from '@/lib/react-query/queriesAndMutations/auth';
import {homeFor} from '@/lib/roles';
import {applyServerErrors, field} from '@/lib/validation/fieldRules';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {Link, useNavigate} from '@tanstack/react-router';
import {CircleAlert, Loader2} from 'lucide-react';
import {useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';

// Same rules as backend/src/validations/user.validation.ts (registerUserSchema)
const signUpSchema = z
  .object({
    fullname: field({label: 'Full Name', kind: 'name'}),
    email: field({label: 'Email Address', kind: 'email'}),
    phoneNumber: field({label: 'Phone Number', kind: 'phone'}),
    password: field({label: 'Password', kind: 'password'}),
    confirmPassword: z.string().min(1, 'Confirm Password is required'),
    acceptTerms: z
      .boolean()
      .refine((v) => v, 'You must accept the terms and conditions'),
  })
  .refine((v) => v.password === v.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type SignUpValues = z.infer<typeof signUpSchema>;

const FIELDS = ['fullname', 'email', 'phoneNumber', 'password'];

/** Public customer sign-up; the backend always creates a CUSTOMER account */
const Signup = () => {
  const {login} = useAuthContext();
  const navigate = useNavigate();
  const {mutateAsync} = useRegisterUser();
  const [formError, setFormError] = useState('');

  const form = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullname: '',
      email: '',
      phoneNumber: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
    },
    mode: 'onTouched',
  });
  const {
    register,
    handleSubmit,
    setError,
    formState: {errors, isSubmitting},
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setFormError('');
    try {
      await mutateAsync(values);
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) {
        setFormError(getErrorMessage(error, 'Could not create the account'));
      }
      return;
    }
    // Account created: sign straight in
    try {
      const res = await loginUser({
        identifier: values.phoneNumber,
        password: values.password,
      });
      login({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      });
      navigate({to: homeFor(res.data.user.role)});
    } catch {
      navigate({to: '/signin'});
    }
  });

  return (
    <div>
      <p className="text-label-caps uppercase text-outline">Cloth Pro</p>
      <h1 className="mt-2 font-serif text-headline-lg-mobile text-burgundy">
        Create an account
      </h1>

      <FormProvider {...form}>
        <form onSubmit={onSubmit} noValidate className="mt-6 space-y-4">
          {formError && (
            <div
              role="alert"
              className="flex items-start gap-3 border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
            >
              <CircleAlert size={16} className="mt-0.5 shrink-0" />
              {formError}
            </div>
          )}

          <GenericInputField
            name="fullname"
            label="Full Name"
            kind="name"
            required
            autoFocus
          />
          <GenericInputField
            name="email"
            label="Email Address"
            kind="email"
            required
          />
          <GenericInputField
            name="phoneNumber"
            label="Phone Number"
            kind="phone"
            prefix="+91"
            required
          />
          <GenericPasswordField name="password" label="Password" required />
          <GenericPasswordField
            name="confirmPassword"
            label="Confirm Password"
            required
          />

          <div>
            <label className="flex items-start gap-2 text-body-sm text-espresso">
              <input
                type="checkbox"
                {...register('acceptTerms')}
                aria-invalid={!!errors.acceptTerms}
                className="mt-1 h-4 w-4 accent-burgundy"
              />
              I accept the terms and conditions
            </label>
            {errors.acceptTerms && (
              <p role="alert" className="field-error">
                {errors.acceptTerms.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary w-full"
          >
            {isSubmitting && <Loader2 size={14} className="animate-spin" />}
            Create account
          </button>
        </form>
      </FormProvider>

      <p className="mt-6 text-body-sm text-on-surface-variant">
        Already have an account?{' '}
        <Link
          to="/signin"
          className="text-burgundy underline-offset-4 hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
};

export default Signup;
