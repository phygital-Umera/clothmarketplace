import {useEffect, useState} from 'react';
import {Link} from '@tanstack/react-router';
import {useMutation, useQueryClient} from '@tanstack/react-query';
import {KeyRound} from 'lucide-react';
import toast from 'react-hot-toast';
import useCurrentUser from '@/hooks/useCurrentUser';
import {UpdateUser} from '@/lib/api/Auth/auth';
import {AUTH_KEYS} from '@/lib/react-query/queryKeys';
import {getErrorMessage} from '@/utils/axios';

const serif = {fontFamily: "'Playfair Display', Georgia, serif"};
const label = 'block text-[11px] font-bold uppercase tracking-wider text-[#736862] mb-1';
const input =
  'w-full rounded border border-[#ded5ce] bg-white px-3 py-2 text-sm text-[#2a2220] focus:outline-none focus:ring-1 focus:ring-[#832729] disabled:bg-[#faf7f4] disabled:text-[#736862]';

/** The signed-in branch admin's own details */
export default function BranchMyProfilePage() {
  const {data: me, isLoading} = useCurrentUser();
  const qc = useQueryClient();
  const [fullname, setFullname] = useState('');

  // Fill the form once the user has loaded
  useEffect(() => {
    if (me) setFullname(me.fullname);
  }, [me]);

  const save = useMutation({
    mutationFn: () => UpdateUser({fullname: fullname.trim().replace(/\s+/g, ' ')}),
    onSuccess: () => {
      toast.success('Profile saved');
      qc.invalidateQueries({queryKey: [AUTH_KEYS.GET_CURRENT_USER]});
    },
    onError: (e) => toast.error(getErrorMessage(e, 'Could not save your profile')),
  });

  const dirty = !!me && fullname.trim() !== me.fullname && fullname.trim().length >= 2;

  return (
    <div className="mx-auto max-w-3xl space-y-6 text-[#2b2b2b]">
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8b6f66]">
          Setup / My profile
        </div>
        <h1 className="font-serif text-3xl tracking-tight text-[#2a2220]" style={serif}>
          My profile
        </h1>
      </div>

      <div className="space-y-4 rounded-lg border border-[#efe9e3] bg-white p-5 shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className={label} htmlFor="fullname">
              Full name
            </label>
            <input
              id="fullname"
              value={fullname}
              disabled={isLoading}
              maxLength={100}
              onChange={(e) => setFullname(e.target.value)}
              className={input}
            />
          </div>
          <div>
            <label className={label}>Mobile (sign-in)</label>
            <input value={me ? `+91 ${me.phoneNumber}` : ''} disabled className={input} />
          </div>
          <div>
            <label className={label}>Email</label>
            <input value={me?.email ?? '—'} disabled className={input} />
          </div>
          <div className="sm:col-span-2">
            <label className={label}>Role</label>
            <input
              value={me ? `Branch Admin${me.branch ? ` · ${me.branch.name}` : ''}` : ''}
              disabled
              className={input}
            />
          </div>
        </div>
        <p className="text-xs text-[#736862]">
          Your mobile number and email are set by your Company Admin.
        </p>
        <button
          onClick={() => save.mutate()}
          disabled={!dirty || save.isPending}
          className="rounded bg-[#7a2222] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#681c1c] disabled:opacity-40"
        >
          {save.isPending ? 'Saving…' : 'Save'}
        </button>
      </div>

      <Link
        to="/change-password"
        className="flex items-center gap-3 rounded-lg border border-[#efe9e3] bg-white p-5 shadow-sm transition hover:border-[#ded5ce]"
      >
        <KeyRound size={18} className="text-[#832729]" />
        <div>
          <p className="text-sm font-semibold text-[#2a2220]">Change password</p>
          <p className="text-xs text-[#736862]">Signs you out on your other devices.</p>
        </div>
      </Link>
    </div>
  );
}
