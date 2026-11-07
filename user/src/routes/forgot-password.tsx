import {useState} from 'react';
import {createFileRoute, Link} from '@tanstack/react-router';
import {ArrowLeft, MailCheck} from 'lucide-react';
import {errorMessage} from '@/lib/api';
import {passwordApi} from '@/lib/queries';
import {btn, input, label} from '@/components/ui';
import {AUTH_PHOTOS, AuthShell, FormAlert} from '@/components/AuthShell';

export const Route = createFileRoute('/forgot-password')({component: ForgotPassword});

function ForgotPassword() {
  const [id, setId] = useState('');
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await passwordApi.forgot(id.trim());
      setSent(true);
    } catch (err) {
      setError(errorMessage(err, 'Could not send the link. Try again in a minute.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthShell
      photo={AUTH_PHOTOS.reset}
      aside={
        <>
          <p className="font-serif text-3xl leading-tight">It happens to everyone</p>
          <p className="mt-2 text-sm text-white/80">We will email you a link to choose a new password. It works for 30 minutes.</p>
        </>
      }
    >
      <Link to="/signin" className="inline-flex items-center gap-1 py-2 text-sm text-ink-soft hover:text-brand">
        <ArrowLeft size={15} /> Back to sign in
      </Link>
      {sent ? (
        <div className="mt-8 text-center" role="status">
          <MailCheck size={44} className="mx-auto text-ok" />
          <h1 className="mt-3 font-serif text-3xl">Check your email</h1>
          <p className="mt-2 text-sm text-ink-soft">
            If an account matches <b className="text-ink">{id.trim()}</b>, we have sent a reset link to its email address. Look in spam too.
          </p>
          <button onClick={() => setSent(false)} className={`${btn.ghost} mt-5`}>
            Use a different email or number
          </button>
        </div>
      ) : (
        <>
          <h1 className="mt-6 font-serif text-4xl">Forgot password?</h1>
          <p className="mt-1 text-sm text-ink-soft">Enter the mobile number or email you shop with.</p>
          <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
            <div>
              <label className={label} htmlFor="id">
                Mobile number or email
              </label>
              <input id="id" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" className={input} autoFocus />
            </div>
            {error && <FormAlert>{error}</FormAlert>}
            <button className={`${btn.primary} w-full py-3`} disabled={busy || !id.trim()}>
              {busy ? 'Sending…' : 'Send reset link'}
            </button>
          </form>
          <p className="mt-6 text-sm text-ink-soft">
            The link goes to the email on your account. No email saved? Write to us from the{' '}
            <Link to="/help" className="font-semibold text-brand hover:underline">
              help page
            </Link>
            .
          </p>
        </>
      )}
    </AuthShell>
  );
}
