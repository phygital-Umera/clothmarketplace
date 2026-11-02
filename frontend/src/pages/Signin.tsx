import {Field} from '@/components/ui';
import {useAuthContext} from '@/context/AuthContext';
import {useLoginUser} from '@/lib/react-query/queriesAndMutations/auth';
import {signInValidationSchema} from '@/lib/validation/authSchemas';
import {zodResolver} from '@hookform/resolvers/zod';
import {landingFor} from '@/lib/roles';
import {Link, useNavigate} from '@tanstack/react-router';
import {CircleAlert, Eye, EyeOff, Loader2} from 'lucide-react';
import {useState} from 'react';
import {useForm} from 'react-hook-form';
import {z} from 'zod';

type SignInValues = z.infer<typeof signInValidationSchema>;

const Signin = () => {
  const {login} = useAuthContext();
  const navigate = useNavigate();
  const {mutateAsync, error} = useLoginUser();
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    formState: {errors, isSubmitting},
  } = useForm<SignInValues>({
    resolver: zodResolver(signInValidationSchema),
    defaultValues: {identifier: '', password: ''},
  });

  const onSubmit = handleSubmit(async (values) => {
    try {
      const res = await mutateAsync(values);
      login({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
      });
      // The backend decides the role; each role lands on its own start page
      const landing = landingFor(res.data.user.role);
      navigate({to: landing.to, search: landing.search as never});
    } catch {
      // shown below via `error`
    }
  });

  return (
    <div>
      <p className="text-label-caps uppercase text-outline">Cloth Pro</p>
      <h1 className="mt-2 font-serif text-headline-lg-mobile text-burgundy">
        Sign in
      </h1>
      <p className="mt-1 text-body-md text-on-surface-variant">
        Use the email or mobile number registered to your account.
      </p>

      <form onSubmit={onSubmit} noValidate className="mt-8 space-y-5">
        {error && (
          <div
            role="alert"
            className="flex items-start gap-3 border border-error/30 bg-error-container px-4 py-3 text-body-sm text-on-error-container"
          >
            <CircleAlert size={16} className="mt-0.5 shrink-0" />
            {error.message}
          </div>
        )}

        <Field
          label="Email or mobile number"
          htmlFor="identifier"
          required
          error={errors.identifier?.message}
        >
          <input
            id="identifier"
            {...register('identifier')}
            autoComplete="username"
            autoFocus
            aria-invalid={!!errors.identifier}
            placeholder="you@example.com or 98765 43210"
            className="field-input"
          />
        </Field>

        <div>
          <Field
            label="Password"
            htmlFor="password"
            required
            error={errors.password?.message}
          >
            <div className="relative">
              <input
                id="password"
                {...register('password')}
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                aria-invalid={!!errors.password}
                placeholder="••••••••"
                className="field-input pr-11"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-2 text-outline hover:text-burgundy"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </Field>
          <Link
            to="/forgot-password"
            className="mt-2 inline-block text-body-sm text-burgundy underline-offset-4 hover:underline"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="btn-primary w-full"
        >
          {isSubmitting && <Loader2 size={14} className="animate-spin" />}
          Sign in
        </button>
      </form>

      <p className="mt-6 text-body-sm text-on-surface-variant">
        Shopping with us?{' '}
        <Link
          to="/signup"
          className="text-burgundy underline-offset-4 hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
};

export default Signin;
