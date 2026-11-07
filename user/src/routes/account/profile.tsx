import {useEffect, useState} from 'react';
import {createFileRoute} from '@tanstack/react-router';
import {Eye, EyeOff, Lock, ShieldCheck} from 'lucide-react';
import toast from 'react-hot-toast';
import {errorMessage, fieldErrors} from '@/lib/api';
import {useAuth} from '@/lib/auth';
import {passwordApi, ProfileInput, useProfile, useSaveProfile} from '@/lib/queries';
import {dateTime, shortDate} from '@/lib/format';
import type {Profile} from '@/lib/types';
import {btn, ErrorBox, input, label, Spinner} from '@/components/ui';
import {card, FieldError, PageHead} from '@/components/account';
import {initialsOf} from '../account';

export const Route = createFileRoute('/account/profile')({component: ProfilePage});

const GENDERS: {key: NonNullable<Profile['gender']>; label: string}[] = [
  {key: 'WOMAN', label: 'Woman'},
  {key: 'MAN', label: 'Man'},
  {key: 'OTHER', label: 'Prefer to self-describe'},
];

const toForm = (p: Profile): ProfileInput => ({
  fullname: p.fullname,
  email: p.email ?? '',
  alternatePhone: p.alternatePhone ?? '',
  gender: p.gender,
  dateOfBirth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : '',
});

function ProfilePage() {
  const {data: p, isLoading, error, refetch} = useProfile();
  if (isLoading) return <Spinner />;
  if (error || !p) return <ErrorBox message="Could not load your profile." retry={refetch} />;
  return (
    <div className="space-y-5">
      <PageHead title="My profile" sub="Manage your details and how you sign in" />
      <Details profile={p} />
      <Security profile={p} />
    </div>
  );
}

function Details({profile}: {profile: Profile}) {
  const save = useSaveProfile();
  const [form, setForm] = useState<ProfileInput>(() => toForm(profile));
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => setForm(toForm(profile)), [profile]);
  const dirty = JSON.stringify(form) !== JSON.stringify(toForm(profile));
  const set = <K extends keyof ProfileInput>(k: K, v: ProfileInput[K]) => setForm((f) => ({...f, [k]: v}));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    save.mutate(
      {...form, alternatePhone: form.alternatePhone?.trim() || undefined},
      {
        onError: (err) => {
          const fe = fieldErrors(err);
          setErrors(fe);
          if (!Object.keys(fe).length) toast.error(errorMessage(err));
        },
      },
    );
  };

  const today = new Date().toISOString().slice(0, 10);
  return (
    <form onSubmit={submit} className={card} noValidate>
      <div className="flex flex-wrap items-center gap-4 border-b border-line px-5 py-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-lg font-bold text-white">{initialsOf(profile.fullname)}</span>
        <div>
          <h2 className="font-semibold">Personal details</h2>
          <p className="text-xs text-ink-soft">Member since {shortDate(profile.createdAt)}</p>
        </div>
      </div>
      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div>
          <label className={label} htmlFor="fullname">
            Full name
          </label>
          <input id="fullname" value={form.fullname} onChange={(e) => set('fullname', e.target.value)} autoComplete="name" className={input} aria-invalid={!!errors.fullname} />
          <FieldError msg={errors.fullname} />
        </div>
        <div>
          <label className={label} htmlFor="email">
            Email
          </label>
          <input id="email" type="email" value={form.email} onChange={(e) => set('email', e.target.value)} autoComplete="email" className={input} aria-invalid={!!errors.email} />
          <FieldError msg={errors.email} />
        </div>
        <div>
          <label className={label} htmlFor="phone">
            Mobile number
          </label>
          <input id="phone" value={`+91 ${profile.phoneNumber}`} disabled className={input} />
          <p className="mt-1 text-[11px] text-ink-faint">Used to sign in, so it can't be changed here.</p>
        </div>
        <div>
          <label className={label} htmlFor="alt">
            Alternate mobile <span className="normal-case text-ink-faint">(optional)</span>
          </label>
          <input id="alt" inputMode="numeric" maxLength={10} value={form.alternatePhone} onChange={(e) => set('alternatePhone', e.target.value.replace(/\D/g, ''))} className={input} aria-invalid={!!errors.alternatePhone} />
          <FieldError msg={errors.alternatePhone} />
        </div>
        <div>
          <p className={label}>Gender</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Gender">
            {GENDERS.map((g) => (
              <button
                key={g.key}
                type="button"
                role="radio"
                aria-checked={form.gender === g.key}
                onClick={() => set('gender', form.gender === g.key ? null : g.key)}
                className={`rounded-full border px-3 py-1.5 text-sm ${form.gender === g.key ? 'border-brand bg-brand text-white' : 'border-line hover:border-brand'}`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className={label} htmlFor="dob">
            Date of birth <span className="normal-case text-ink-faint">(for birthday offers)</span>
          </label>
          <input id="dob" type="date" max={today} min="1900-01-01" value={form.dateOfBirth} onChange={(e) => set('dateOfBirth', e.target.value)} className={input} aria-invalid={!!errors.dateOfBirth} />
          <FieldError msg={errors.dateOfBirth} />
        </div>
      </div>
      <div className="flex justify-end gap-2 border-t border-line px-5 py-3">
        <button type="button" onClick={() => setForm(toForm(profile))} className={btn.outline} disabled={!dirty || save.isPending}>
          Discard
        </button>
        <button className={btn.primary} disabled={!dirty || save.isPending}>
          {save.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>
    </form>
  );
}

const EMPTY_PW = {currentPassword: '', newPassword: '', confirmPassword: ''};

/** Rough strength hint; the server enforces the real rule */
const strength = (pw: string) => {
  const score = [pw.length >= 8, /[A-Z]/.test(pw), /[a-z]/.test(pw), /\d/.test(pw), /[^A-Za-z0-9]/.test(pw)].filter(Boolean).length;
  return score <= 2 ? {text: 'Weak', w: 'w-1/3', c: 'bg-red-500'} : score <= 4 ? {text: 'Okay', w: 'w-2/3', c: 'bg-gold'} : {text: 'Strong', w: 'w-full', c: 'bg-ok'};
};

function Security({profile}: {profile: Profile}) {
  const {adoptTokens} = useAuth();
  const [pw, setPw] = useState(EMPTY_PW);
  const [show, setShow] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const s = strength(pw.newPassword);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    setBusy(true);
    try {
      const next = await passwordApi.change(pw);
      if (next?.accessToken) adoptTokens(next);
      setPw(EMPTY_PW);
      toast.success('Password changed');
    } catch (err) {
      const fe = fieldErrors(err);
      setErrors(fe);
      if (!Object.keys(fe).length) toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const field = (k: keyof typeof EMPTY_PW, text: string, auto: string) => (
    <div>
      <label className={label} htmlFor={k}>
        {text}
      </label>
      <input id={k} type={show ? 'text' : 'password'} value={pw[k]} onChange={(e) => setPw((x) => ({...x, [k]: e.target.value}))} autoComplete={auto} className={input} aria-invalid={!!errors[k]} />
      <FieldError msg={errors[k]} />
    </div>
  );

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
      <form onSubmit={submit} className={card} noValidate>
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
          <h2 className="flex items-center gap-2 font-semibold">
            <Lock size={16} /> Change password
          </h2>
          <button type="button" onClick={() => setShow((v) => !v)} className={btn.ghost}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />} {show ? 'Hide' : 'Show'}
          </button>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-3">
          {field('currentPassword', 'Current password', 'current-password')}
          <div>
            {field('newPassword', 'New password', 'new-password')}
            {pw.newPassword && (
              <div className="mt-1.5">
                <div className="h-1 rounded bg-line">
                  <div className={`h-1 rounded ${s.w} ${s.c}`} />
                </div>
                <p className="mt-0.5 text-[11px] text-ink-faint">{s.text}</p>
              </div>
            )}
          </div>
          {field('confirmPassword', 'Confirm new password', 'new-password')}
        </div>
        <p className="px-5 text-[11px] text-ink-faint">Tip: 8 or more characters mixing letters, numbers and a symbol make a strong password.</p>
        <div className="flex justify-end border-t border-line px-5 py-3 mt-4">
          <button className={btn.primary} disabled={busy || !pw.currentPassword || !pw.newPassword || !pw.confirmPassword}>
            {busy ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </form>
      <aside className={`${card} self-start p-5 text-sm`}>
        <h2 className="mb-3 flex items-center gap-2 font-semibold">
          <ShieldCheck size={16} className="text-ok" /> Security
        </h2>
        <dl className="space-y-3">
          <div>
            <dt className="text-xs text-ink-faint">Last sign-in</dt>
            <dd>{profile.lastLoginAt ? dateTime(profile.lastLoginAt) : '—'}</dd>
          </div>
          <div>
            <dt className="text-xs text-ink-faint">Sign-in number</dt>
            <dd>+91 {profile.phoneNumber}</dd>
          </div>
        </dl>
        <p className="mt-4 text-xs text-ink-soft">Forgot your password? Sign out and use "Forgot password" on the sign-in page to get a reset link by email.</p>
      </aside>
    </div>
  );
}
