import {useState} from 'react';
import {createFileRoute, Link, Navigate, useNavigate} from '@tanstack/react-router';
import {useAuth} from '@/lib/auth';
import {errorMessage} from '@/lib/api';
import {btn, input, label} from '@/components/ui';
import {AUTH_PHOTOS, AuthShell, FormAlert, PasswordInput} from '@/components/AuthShell';

export const safeRedirect = (s: unknown) => (typeof s === 'string' && s.startsWith('/') && !s.startsWith('//') ? s : undefined);

export const Route = createFileRoute('/signin')({
  // Only paths inside the store, never another site
  validateSearch: (s: Record<string, unknown>): {redirect?: string; reset?: boolean} => ({
    redirect: safeRedirect(s.redirect),
    reset: s.reset === true || s.reset === 'true' ? true : undefined,
  }),
  component: SignIn,
});

function SignIn() {
  const {redirect, reset} = Route.useSearch();
  const {signIn, signedIn} = useAuth();
  const navigate = useNavigate();
  const [id, setId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  if (signedIn && !busy) return <Navigate to={redirect ?? '/account'} replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await signIn(id, password);
      navigate({to: redirect ?? '/'});
    } catch (err) {
      setError(errorMessage(err, 'Could not sign in'));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      photo={AUTH_PHOTOS.signin}
      aside={
        <>
          <p className="font-serif text-3xl leading-tight">Handpicked from the shops you trust</p>
          <p className="mt-2 text-sm text-white/80">Sarees, lehengas and everyday wear from local stores, delivered to your door.</p>
        </>
      }
    >
      <h1 className="font-serif text-4xl">Welcome back</h1>
      <p className="mt-1 text-sm text-ink-soft">Sign in to track orders, see your wishlist and check out faster.</p>
      {reset && (
        <div className="mt-4">
          <FormAlert tone="ok">Your password was reset. Sign in with the new one.</FormAlert>
        </div>
      )}
      <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
        <div>
          <label className={label} htmlFor="id">
            Mobile number or email
          </label>
          <input id="id" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" className={input} placeholder="98xxxxxxxx or you@example.com" autoFocus />
        </div>
        <PasswordInput id="pw" text="Password" value={password} onChange={setPassword} autoComplete="current-password" />
        <div className="flex justify-end">
          <Link to="/forgot-password" className="text-sm font-medium text-brand hover:underline">
            Forgot password?
          </Link>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        <button className={`${btn.primary} w-full py-3`} disabled={busy || !id.trim() || !password}>
          {busy ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
      <div className="my-6 flex items-center gap-3 text-xs text-ink-faint">
        <span className="h-px flex-1 bg-line" /> New to Cloth Pro? <span className="h-px flex-1 bg-line" />
      </div>
      <Link to="/signup" search={{redirect}} className={`${btn.outline} w-full py-3`}>
        Create an account
      </Link>
      <p className="mt-6 text-center text-xs text-ink-faint">By signing in you agree to our terms of use and privacy policy.</p>
    </AuthShell>
  );
}
