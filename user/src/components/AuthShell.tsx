import {ReactNode, useState} from 'react';
import {Eye, EyeOff} from 'lucide-react';
import {API_URL} from '@/lib/api';
import {input, label} from './ui';

/* Sign in / sign up / password pages: a picture panel and the form */

const ORIGIN = API_URL.replace(/\/api\/v\d+$/, '');
export const AUTH_PHOTOS = {
  signin: `${ORIGIN}/uploads/products/demo/printed-lehenga-teal-1.jpg`,
  signup: `${ORIGIN}/uploads/products/demo/mirror-kurti-green-1.jpg`,
  reset: `${ORIGIN}/uploads/products/demo/paisley-shawl-red-1.jpg`,
};

export function AuthShell({photo, aside, children}: {photo: string; aside: ReactNode; children: ReactNode}) {
  const [imgOk, setImgOk] = useState(true);
  return (
    <div className="mx-auto grid max-w-5xl overflow-hidden rounded-xl border border-line bg-white shadow-sm lg:grid-cols-2">
      <div className="relative hidden min-h-[560px] bg-brand-dark lg:block">
        {imgOk && <img src={photo} alt="" onError={() => setImgOk(false)} className="absolute inset-0 h-full w-full object-cover" />}
        <div className="absolute inset-0 bg-gradient-to-t from-brand-dark via-brand-dark/50 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 p-8 text-white">{aside}</div>
      </div>
      <div className="p-6 sm:p-10">{children}</div>
    </div>
  );
}

export function PasswordInput({id, value, onChange, autoComplete, invalid, text}: {id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean; text: string}) {
  const [show, setShow] = useState(false);
  return (
    <div>
      <label className={label} htmlFor={id}>
        {text}
      </label>
      <div className="relative">
        <input id={id} type={show ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} className={`${input} pr-10`} aria-invalid={invalid} />
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-faint hover:text-ink" aria-label={show ? 'Hide password' : 'Show password'}>
          {show ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
    </div>
  );
}

export function FormAlert({tone = 'bad', children}: {tone?: 'bad' | 'ok'; children: ReactNode}) {
  return (
    <p className={`rounded px-3 py-2 text-sm ${tone === 'bad' ? 'bg-red-50 text-red-800' : 'bg-ok/10 text-ok'}`} role={tone === 'bad' ? 'alert' : 'status'}>
      {children}
    </p>
  );
}
