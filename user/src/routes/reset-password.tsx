import {useState} from 'react';
import {createFileRoute, Link, useNavigate} from '@tanstack/react-router';
import {KeyRound} from 'lucide-react';
import {errorMessage, fieldErrors} from '@/lib/api';
import {useAuth} from '@/lib/auth';
import {passwordApi} from '@/lib/queries';
import {btn} from '@/components/ui';
import {FieldError} from '@/components/account';
import {AUTH_PHOTOS, AuthShell, FormAlert, PasswordInput} from '@/components/AuthShell';

export const Route = createFileRoute('/reset-password')({
  validateSearch: (s: Record<string, unknown>): {token?: string} => ({token: typeof s.token === 'string' ? s.token : undefined}),
  component: ResetPassword,
});

function ResetPassword() {
  const {token} = Route.useSearch();
  const {signedIn, signOut} = useAuth();
  const navigate = useNavigate();
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setError('');
    if (pw !== confirm) return setErrors({confirmPassword: 'Passwords do not match'});
    setBusy(true);
    try {
      await passwordApi.reset({token: token!, newPassword: pw, confirmPassword: confirm});
      // The reset signs out every device, this one included
      if (signedIn) signOut();
      navigate({to: '/signin', search: {reset: true}});
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length || fe.token) setError(fe.token ?? errorMessage(err, 'Could not reset your password'));
      setBusy(false);
    }
  };

  return (
    <AuthShell
      photo={AUTH_PHOTOS.reset}
      aside={
        <>
          <p className="font-serif text-3xl leading-tight">Choose a new password</p>
          <p className="mt-2 text-sm text-white/80">After this, you will be signed out on every device and can sign in with the new one.</p>
        </>
      }
    >
      <KeyRound size={36} className="text-brand" />
      <h1 className="mt-3 font-serif text-4xl">Reset password</h1>
      {!token ? (
        <div className="mt-4 space-y-4">
          <FormAlert>This link is incomplete. Open the link from your email again, or ask for a new one.</FormAlert>
          <Link to="/forgot-password" className={btn.primary}>
            Get a new link
          </Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
          <div>
            <PasswordInput id="newPassword" text="New password" value={pw} onChange={setPw} autoComplete="new-password" invalid={!!errors.newPassword} />
            <FieldError msg={errors.newPassword} />
          </div>
          <div>
            <PasswordInput id="confirmPassword" text="Confirm new password" value={confirm} onChange={setConfirm} autoComplete="new-password" invalid={!!errors.confirmPassword} />
            <FieldError msg={errors.confirmPassword} />
          </div>
          {error && (
            <FormAlert>
              {error}{' '}
              {/expired|invalid/i.test(error) && (
                <Link to="/forgot-password" className="font-semibold underline">
                  Get a new link
                </Link>
              )}
            </FormAlert>
          )}
          <button className={`${btn.primary} w-full py-3`} disabled={busy || !pw || !confirm}>
            {busy ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      )}
    </AuthShell>
  );
}
