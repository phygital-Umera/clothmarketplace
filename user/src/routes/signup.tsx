import {useState} from 'react';
import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {Heart, Package, RotateCcw} from 'lucide-react';
import {useAuth} from '@/lib/auth';
import {api, errorMessage, fieldErrors} from '@/lib/api';
import {btn, input, label} from '@/components/ui';
import {FieldError} from '@/components/account';
import {AUTH_PHOTOS, AuthShell, FormAlert, PasswordInput} from '@/components/AuthShell';
import {safeRedirect} from './signin';

export const Route = createFileRoute('/signup')({
  validateSearch: (s: Record<string, unknown>): {redirect?: string} => ({redirect: safeRedirect(s.redirect)}),
  component: SignUp,
});

const EMPTY = {fullname: '', email: '', phoneNumber: '', password: '', confirmPassword: ''};

const PERKS = [
  {icon: Package, title: 'Track every order', text: 'Live updates from packing to your door'},
  {icon: RotateCcw, title: 'Easy returns', text: '7-day returns and free size exchange'},
  {icon: Heart, title: 'Save a wishlist', text: 'Keep what you love for later'},
];

function SignUp() {
  const {redirect} = Route.useSearch();
  const {signIn} = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState(EMPTY);
  const [terms, setTerms] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof EMPTY) => (v: string) => setForm((f) => ({...f, [k]: v}));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setErrors({});
    if (form.password && form.password !== form.confirmPassword) return setErrors({confirmPassword: 'Passwords do not match'});
    setBusy(true);
    try {
      await api.post('/users/register', {...form, acceptTerms: terms});
      await signIn(form.phoneNumber, form.password);
      navigate({to: redirect ?? '/'});
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length) setError(errorMessage(err, 'Could not create your account'));
    } finally {
      setBusy(false);
    }
  };

  const field = (k: 'fullname' | 'email' | 'phoneNumber', text: string, type: string, auto: string, extra?: object) => (
    <div>
      <label className={label} htmlFor={k}>
        {text}
      </label>
      <input id={k} type={type} value={form[k]} onChange={(e) => set(k)(e.target.value)} autoComplete={auto} className={input} aria-invalid={!!errors[k]} {...extra} />
      <FieldError msg={errors[k]} />
    </div>
  );

  return (
    <AuthShell
      photo={AUTH_PHOTOS.signup}
      aside={
        <>
          <p className="font-serif text-3xl leading-tight">Why join Cloth Pro?</p>
          <ul className="mt-4 space-y-3">
            {PERKS.map((p) => (
              <li key={p.title} className="flex gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/15">
                  <p.icon size={16} />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{p.title}</span>
                  <span className="block text-xs text-white/75">{p.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </>
      }
    >
      <h1 className="font-serif text-4xl">Create your account</h1>
      <p className="mt-1 text-sm text-ink-soft">It takes less than a minute.</p>
      {/* On phones the picture panel is hidden, so the perks show here */}
      <ul className="mt-4 grid grid-cols-2 gap-2 lg:hidden">
        {PERKS.map((p) => (
          <li key={p.title} className="flex items-center gap-2 rounded bg-canvas p-2 text-xs">
            <p.icon size={14} className="shrink-0 text-brand" /> {p.title}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        {field('fullname', 'Full name', 'text', 'name')}
        <div className="grid gap-4 sm:grid-cols-2">
          {field('phoneNumber', 'Mobile number', 'tel', 'tel', {inputMode: 'numeric', maxLength: 10})}
          {field('email', 'Email', 'email', 'email')}
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <PasswordInput id="password" text="Password" value={form.password} onChange={set('password')} autoComplete="new-password" invalid={!!errors.password} />
            <FieldError msg={errors.password} />
          </div>
          <div>
            <PasswordInput id="confirmPassword" text="Confirm password" value={form.confirmPassword} onChange={set('confirmPassword')} autoComplete="new-password" invalid={!!errors.confirmPassword} />
            <FieldError msg={errors.confirmPassword} />
          </div>
        </div>
        <label className="flex items-start gap-2 text-sm text-ink-soft">
          <input type="checkbox" checked={terms} onChange={(e) => setTerms(e.target.checked)} className="mt-0.5 h-5 w-5 shrink-0 accent-brand" />
          I agree to the terms of use and privacy policy
        </label>
        <FieldError msg={errors.acceptTerms} />
        {error && <FormAlert>{error}</FormAlert>}
        <button className={`${btn.primary} w-full py-3`} disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-ink-soft">
        Already have an account?{' '}
        <Link to="/signin" search={{redirect}} className="font-semibold text-brand hover:underline">
          Sign in
        </Link>
      </p>
    </AuthShell>
  );
}
