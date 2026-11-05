import {useEffect, useState} from 'react';
import {Field, PageHeader} from '@/components/ui';
import FormDialog from '@/components/ui/FormDialog';
import useCurrentUser from '@/hooks/useCurrentUser';
import {
  useBranchStaffOverview,
  useInviteBranchStaff,
} from '@/lib/react-query/queriesAndMutations/branchExtras';
import {useDecideStaffRequest} from '@/lib/react-query/queriesAndMutations/staff';
import {SHIFT_LABEL, Shift, STAFF_ROLES} from '@/types/staff';
import {getErrorMessage} from '@/utils/axios';

const RIGHTS = [
  {key: 'pos.bill', label: 'POS billing'},
  {key: 'sales.discount', label: 'Give discount'},
  {key: 'sales.credit', label: 'Credit (udhaar) sales'},
  {key: 'purchase.create', label: 'Purchase bills'},
  {key: 'inventory.adjust', label: 'Stock adjustment'},
  {key: 'stock.transfer', label: 'Stock transfer'},
  {key: 'cash.manage', label: 'Cash book'},
];

const STATUS_CLS: Record<string, string> = {
  ACTIVE: 'bg-[#E3EEDD] text-[#3F6B3A]',
  INVITED: 'bg-[#F6E6C8] text-[#8A5A12]',
  INACTIVE: 'bg-[#EFE6DC] text-[#7A6A5C]',
};

type Row = {
  id: string;
  requestId: string | null;
  name: string;
  empCode: string;
  phone: string;
  initials: string;
  shopName: string;
  role: string;
  todayAttendance: string;
  status: 'ACTIVE' | 'INVITED' | 'INACTIVE';
};

function DecideDialog({
  row,
  mode,
  onClose,
}: {
  row: Row;
  mode: 'APPROVE' | 'REJECT';
  onClose: () => void;
}) {
  const decide = useDecideStaffRequest();
  const [password, setPassword] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');

  const submit = () => {
    setError('');
    if (mode === 'APPROVE' && password.length < 8)
      return setError('Set a temporary password of at least 8 characters.');
    if (mode === 'REJECT' && note.trim().length < 3) return setError('Give a reason.');
    decide.mutate(
      {
        id: row.requestId!,
        data: {decision: mode, password: mode === 'APPROVE' ? password : undefined, note: note.trim() || undefined},
      },
      {onSuccess: onClose, onError: (err) => setError(getErrorMessage(err, 'Could not save'))},
    );
  };

  return (
    <FormDialog
      open
      title={mode === 'APPROVE' ? `Approve ${row.name}` : `Reject ${row.name}`}
      onClose={onClose}
      onSubmit={submit}
      saving={decide.isPending}
      error={error}
      saveLabel={mode === 'APPROVE' ? 'Create login' : 'Reject request'}
    >
      <p className="text-body-sm text-on-surface-variant">
        {row.role} · {row.shopName} · {row.phone}
      </p>
      {mode === 'APPROVE' && (
        <Field
          label="Temporary password"
          htmlFor="sr-pass"
          required
          hint="They sign in with their mobile number and must change it on first login."
        >
          <input
            id="sr-pass"
            type="text"
            autoComplete="new-password"
            className="field-input"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
      )}
      <Field label={mode === 'APPROVE' ? 'Note' : 'Reason'} htmlFor="sr-note" required={mode === 'REJECT'}>
        <textarea id="sr-note" rows={2} maxLength={300} className="field-input" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </FormDialog>
  );
}

const EMPTY = {
  fullname: '',
  phoneNumber: '',
  email: '',
  shopId: '',
  employeeRole: 'Sales associate',
  shift: 'FULL_DAY' as Shift,
  permissions: ['pos.bill'] as string[],
};

export default function BranchStaffPage() {
  const {data: me} = useCurrentUser();
  const [activeTab, setActiveTab] = useState('ALL');
  const [selectedShop, setSelectedShop] = useState('ALL');
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [deciding, setDeciding] = useState<{row: Row; mode: 'APPROVE' | 'REJECT'} | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const {data, isLoading, isError, error} = useBranchStaffOverview({
    tab: activeTab === 'ALL' ? undefined : activeTab,
    shop: selectedShop === 'ALL' ? undefined : selectedShop,
    search: debounced || undefined,
  });
  const invite = useInviteBranchStaff();
  const [form, setForm] = useState(EMPTY);
  const [formError, setFormError] = useState('');
  const shops: Array<{id: string; name: string}> = data?.shops ?? [];
  const staff: Row[] = data?.items ?? [];
  const summary = data?.summary;

  useEffect(() => {
    if (!form.shopId && shops[0]) setForm((f) => ({...f, shopId: shops[0].id}));
  }, [shops, form.shopId]);

  const set = <K extends keyof typeof EMPTY>(k: K, v: (typeof EMPTY)[K]) => setForm((f) => ({...f, [k]: v}));

  const handleSendInvite = () => {
    setFormError('');
    if (form.fullname.trim().length < 2) return setFormError('Enter the full name.');
    if (!/^[6-9]\d{9}$/.test(form.phoneNumber)) return setFormError('Enter a valid 10-digit mobile number.');
    if (!form.shopId) return setFormError('Select a shop.');
    invite.mutate(
      {...form, fullname: form.fullname.trim(), email: form.email.trim() || undefined},
      {
        onSuccess: () => setForm({...EMPTY, shopId: form.shopId}),
        onError: (err) => setFormError(getErrorMessage(err, 'Could not add the staff member')),
      },
    );
  };

  const tabs = ['ALL', 'ACTIVE', 'INVITED', 'INACTIVE'];

  return (
    <div className="space-y-6">
      <PageHeader
        breadcrumbs={[{label: 'Setup'}, {label: 'Staff'}]}
        title="Staff"
        subtitle={`Staff working in ${me?.branch?.name ?? 'your branch'} shops. Shops request new staff here; approve to create the login.`}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          {label: 'Total staff', value: summary?.totalStaff, note: summary?.totalStaffSub},
          {label: 'On shift now', value: summary?.onShiftNow, note: summary?.onShiftNowSub},
          {label: 'Pending requests', value: summary?.invitesPending, note: summary?.invitesPendingSub},
        ].map((k) => (
          <div key={k.label} className="panel p-4">
            <p className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">{k.label}</p>
            <p className="mt-2 font-serif text-[26px] leading-none text-espresso">{k.value ?? '—'}</p>
            <p className="mt-1.5 text-[11px] text-outline">{k.note ?? ''}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <section className="panel min-w-0 lg:col-span-8">
          <div className="flex flex-col justify-between gap-3 border-b border-ivory-300 px-4 pt-2 sm:flex-row sm:items-end">
            <div role="tablist" aria-label="Staff status" className="flex overflow-x-auto">
              {tabs.map((t) => (
                <button
                  key={t}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === t}
                  onClick={() => setActiveTab(t)}
                  className={`-mb-px flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 py-2.5 text-label-caps uppercase ${
                    activeTab === t ? 'border-burgundy text-burgundy' : 'border-transparent text-on-surface-variant hover:text-burgundy'
                  }`}
                >
                  {t === 'INVITED' ? 'Pending' : t}
                  {t === 'ALL' && data && (
                    <span className="rounded-sm bg-ivory-200 px-1.5 text-[10px] font-bold text-espresso">{data.totalCount}</span>
                  )}
                </button>
              ))}
            </div>
            <div className="flex gap-2 pb-2">
              <label htmlFor="staff-shop" className="sr-only">Shop</label>
              <select id="staff-shop" className="field-input w-auto py-2" value={selectedShop} onChange={(e) => setSelectedShop(e.target.value)}>
                <option value="ALL">All shops</option>
                {shops.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
              <input aria-label="Search staff" className="field-input w-40 py-2" placeholder="Name or phone" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] border-collapse text-left text-body-sm">
              <thead>
                <tr className="border-b border-ivory-300 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                  <th scope="col" className="px-4 py-3">Employee</th>
                  <th scope="col" className="px-3 py-3">Shop</th>
                  <th scope="col" className="px-3 py-3">Role</th>
                  <th scope="col" className="px-3 py-3">Today</th>
                  <th scope="col" className="px-4 py-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-200 text-espresso">
                {isLoading && (
                  <tr><td colSpan={5} className="py-10 text-center text-outline">Loading staff…</td></tr>
                )}
                {isError && (
                  <tr><td colSpan={5} className="py-10 text-center text-error">{getErrorMessage(error, 'Could not load staff')}</td></tr>
                )}
                {data && !staff.length && (
                  <tr><td colSpan={5} className="py-10 text-center text-outline">No staff found.</td></tr>
                )}
                {staff.map((s) => (
                  <tr key={s.id} className="hover:bg-ivory-50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush/50 text-[11px] font-semibold text-burgundy">
                          {s.initials}
                        </span>
                        <div>
                          <p className="font-medium">{s.name}</p>
                          <p className="text-[11px] text-outline">{s.empCode} · {s.phone}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3">{s.shopName}</td>
                    <td className="px-3 py-3 text-on-surface-variant">{s.role}</td>
                    <td className="px-3 py-3 text-[12px] text-on-surface-variant">{s.todayAttendance}</td>
                    <td className="px-4 py-3 text-right">
                      {s.status === 'INVITED' && s.requestId ? (
                        <div className="flex justify-end gap-2">
                          <button type="button" className="btn-ghost px-3 py-1.5" onClick={() => setDeciding({row: s, mode: 'REJECT'})}>
                            Reject
                          </button>
                          <button type="button" className="btn-primary px-3 py-1.5" onClick={() => setDeciding({row: s, mode: 'APPROVE'})}>
                            Approve
                          </button>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${STATUS_CLS[s.status]}`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" />
                          {s.status}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel space-y-3 p-4 lg:col-span-4" aria-labelledby="add-staff">
          <h2 id="add-staff" className="font-serif text-headline-sm text-burgundy">Add staff</h2>
          <Field label="Full name" htmlFor="inv-name" required>
            <input id="inv-name" className="field-input" value={form.fullname} onChange={(e) => set('fullname', e.target.value)} />
          </Field>
          <Field label="Mobile (login)" htmlFor="inv-phone" required>
            <input id="inv-phone" inputMode="numeric" maxLength={10} className="field-input" value={form.phoneNumber} onChange={(e) => set('phoneNumber', e.target.value.replace(/\D/g, ''))} />
          </Field>
          <Field label="Email" htmlFor="inv-email">
            <input id="inv-email" type="email" className="field-input" value={form.email} onChange={(e) => set('email', e.target.value)} />
          </Field>
          <Field label="Shop" htmlFor="inv-shop" required hint="Only shops in your branch">
            <select id="inv-shop" className="field-input" value={form.shopId} onChange={(e) => set('shopId', e.target.value)}>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role" htmlFor="inv-role" required>
              <select id="inv-role" className="field-input" value={form.employeeRole} onChange={(e) => set('employeeRole', e.target.value)}>
                {STAFF_ROLES.map((r) => (
                  <option key={r}>{r}</option>
                ))}
              </select>
            </Field>
            <Field label="Shift" htmlFor="inv-shift" required>
              <select id="inv-shift" className="field-input" value={form.shift} onChange={(e) => set('shift', e.target.value as Shift)}>
                {(Object.keys(SHIFT_LABEL) as Shift[]).map((s) => (
                  <option key={s} value={s}>{SHIFT_LABEL[s]}</option>
                ))}
              </select>
            </Field>
          </div>
          <fieldset>
            <legend className="field-label">Rights</legend>
            <div className="space-y-1.5 text-body-sm">
              {RIGHTS.map((r) => (
                <label key={r.key} className="flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    className="accent-[#6B1E2E]"
                    checked={form.permissions.includes(r.key)}
                    onChange={(e) =>
                      set('permissions', e.target.checked ? [...form.permissions, r.key] : form.permissions.filter((p) => p !== r.key))
                    }
                  />
                  {r.label}
                </label>
              ))}
            </div>
          </fieldset>
          {formError && <p role="alert" className="field-error">{formError}</p>}
          <button type="button" className="btn-primary w-full" disabled={invite.isPending} onClick={handleSendInvite}>
            {invite.isPending ? 'Saving…' : 'Add to pending staff'}
          </button>
          <p className="text-[11px] text-outline">Then approve it in the list to create the login.</p>
        </section>
      </div>

      {deciding && <DecideDialog row={deciding.row} mode={deciding.mode} onClose={() => setDeciding(null)} />}
    </div>
  );
}
