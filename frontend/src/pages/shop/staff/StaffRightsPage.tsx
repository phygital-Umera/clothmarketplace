import {Field, PageHeader} from '@/components/ui';
import FormDialog from '@/components/ui/FormDialog';
import {
  useCreateStaffRequest,
  useMarkAttendance,
  useStaff,
  useStaffRequests,
  useUpdateStaffRights,
  useUpdateStaffShift,
} from '@/lib/react-query/queriesAndMutations/staff';
import {
  AttendanceStatus,
  SHIFT_LABEL,
  Shift,
  STAFF_ROLES,
  StaffMember,
  StaffRequestPayload,
  StaffRight,
} from '@/types/staff';
import {getErrorMessage} from '@/utils/axios';
import {useEffect, useRef, useState} from 'react';

type Props = {panel?: string};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

const clock = (iso: string) => {
  const d = new Date(iso);
  return `${d.getHours() % 12 || 12}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const nowHHMM = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};

const PILL = {
  green: 'bg-[#E3EEDD] text-[#3F6B3A]',
  amber: 'bg-[#F6E6C8] text-[#8A5A12]',
  muted: 'bg-[#EFE6DC] text-[#7A6A5C]',
  red: 'bg-[#F7DEDE] text-[#9B2C2C]',
};

/** The "Today" pill: in / out / on leave, or when the shift starts */
const todayPill = (s: StaffMember): {label: string; tone: keyof typeof PILL} => {
  const a = s.attendance;
  if (a?.status === 'IN') return {label: a.inAt ? `In ${clock(a.inAt)}` : 'In', tone: 'green'};
  if (a?.status === 'OUT') return {label: a.outAt ? `Out ${clock(a.outAt)}` : 'Out', tone: 'muted'};
  if (a?.status === 'LEAVE') return {label: 'On leave', tone: 'amber'};
  if (a?.status === 'ABSENT') return {label: 'Absent', tone: 'red'};
  if (s.shiftHours.start > nowHHMM()) return {label: `From ${s.shiftHours.start}`, tone: 'muted'};
  return {label: 'Not in', tone: 'muted'};
};

const ATTENDANCE_ACTIONS: Array<{status: AttendanceStatus; label: string}> = [
  {status: 'IN', label: 'Mark in'},
  {status: 'OUT', label: 'Mark out'},
  {status: 'LEAVE', label: 'On leave'},
  {status: 'ABSENT', label: 'Absent'},
];

function TodayCell({member, panel}: {member: StaffMember; panel: string}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const mark = useMarkAttendance(panel);
  const pill = todayPill(member);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        disabled={mark.isPending}
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${PILL[pill.tone]}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        {pill.label}
      </button>
      {open && (
        <div
          role="menu"
          className="absolute left-0 z-30 mt-1 w-32 border border-ivory-300 bg-white py-1 shadow-lg"
        >
          {ATTENDANCE_ACTIONS.filter(
            (a) => a.status !== member.attendance?.status && (a.status !== 'OUT' || member.attendance?.status === 'IN'),
          ).map((a) => (
            <button
              key={a.status}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                mark.mutate({id: member.id, status: a.status});
              }}
              className="block w-full px-3 py-1.5 text-left text-body-sm text-espresso hover:bg-ivory-100"
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

const EMPTY_REQUEST: StaffRequestPayload = {
  fullname: '',
  phoneNumber: '',
  email: '',
  employeeRole: 'Sales associate',
  shift: 'FULL_DAY',
  permissions: ['pos.bill'],
  note: '',
};

function RequestStaffDialog({
  open,
  onClose,
  panel,
  rights,
}: {
  open: boolean;
  onClose: () => void;
  panel: string;
  rights: StaffRight[];
}) {
  const create = useCreateStaffRequest(panel);
  const [form, setForm] = useState<StaffRequestPayload>(EMPTY_REQUEST);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm(EMPTY_REQUEST);
      setError('');
      setFieldErrors({});
    }
  }, [open]);

  const set = <K extends keyof StaffRequestPayload>(k: K, v: StaffRequestPayload[K]) =>
    setForm((f) => ({...f, [k]: v}));

  const submit = () => {
    const errs: Record<string, string> = {};
    if (form.fullname.trim().length < 2) errs.fullname = 'Enter the full name';
    if (!/^[6-9]\d{9}$/.test(form.phoneNumber.trim())) errs.phoneNumber = 'Enter a valid 10-digit mobile number';
    setFieldErrors(errs);
    if (Object.keys(errs).length) return;
    setError('');
    create.mutate(
      {...form, email: form.email?.trim() || undefined, note: form.note?.trim() || undefined},
      {
        onSuccess: onClose,
        onError: (err: any) => {
          const list = err?.response?.data?.errors as Array<{field: string; message: string}> | undefined;
          if (list?.length) setFieldErrors(Object.fromEntries(list.map((e) => [e.field, e.message])));
          setError(getErrorMessage(err, 'Could not send the request'));
        },
      },
    );
  };

  return (
    <FormDialog
      open={open}
      title="Request new staff"
      onClose={onClose}
      onSubmit={submit}
      saving={create.isPending}
      error={error}
      saveLabel="Send to Branch Admin"
    >
      <p className="text-body-sm text-on-surface-variant">
        The Branch Admin approves the request and creates the login.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" htmlFor="sr-name" required error={fieldErrors.fullname}>
          <input
            id="sr-name"
            className="field-input"
            value={form.fullname}
            onChange={(e) => set('fullname', e.target.value)}
            aria-invalid={!!fieldErrors.fullname}
          />
        </Field>
        <Field label="Mobile" htmlFor="sr-phone" required error={fieldErrors.phoneNumber}>
          <input
            id="sr-phone"
            className="field-input"
            inputMode="numeric"
            maxLength={10}
            value={form.phoneNumber}
            onChange={(e) => set('phoneNumber', e.target.value.replace(/\D/g, ''))}
            aria-invalid={!!fieldErrors.phoneNumber}
          />
        </Field>
        <Field label="Email" htmlFor="sr-email" error={fieldErrors.email}>
          <input
            id="sr-email"
            type="email"
            className="field-input"
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>
        <Field label="Role" htmlFor="sr-role" required>
          <select
            id="sr-role"
            className="field-input"
            value={form.employeeRole}
            onChange={(e) => set('employeeRole', e.target.value)}
          >
            {STAFF_ROLES.filter((r) => r !== 'Shop manager').map((r) => (
              <option key={r}>{r}</option>
            ))}
          </select>
        </Field>
        <Field label="Shift" htmlFor="sr-shift" required>
          <select
            id="sr-shift"
            className="field-input"
            value={form.shift}
            onChange={(e) => set('shift', e.target.value as Shift)}
          >
            {(Object.keys(SHIFT_LABEL) as Shift[]).map((s) => (
              <option key={s} value={s}>
                {SHIFT_LABEL[s]}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <fieldset>
        <legend className="field-label">Rights</legend>
        <div className="flex flex-wrap gap-2">
          {rights.map((r) => {
            const on = form.permissions.includes(r.key);
            return (
              <label
                key={r.key}
                className={`flex cursor-pointer items-center gap-2 border px-3 py-1.5 text-body-sm ${
                  on ? 'border-burgundy bg-blush/30 text-burgundy' : 'border-ivory-300 text-espresso'
                }`}
              >
                <input
                  type="checkbox"
                  className="h-3.5 w-3.5 accent-[#6B1E2E]"
                  checked={on}
                  onChange={() =>
                    set(
                      'permissions',
                      on ? form.permissions.filter((p) => p !== r.key) : [...form.permissions, r.key],
                    )
                  }
                />
                {r.label}
              </label>
            );
          })}
        </div>
      </fieldset>
      <Field label="Note for Branch Admin" htmlFor="sr-note">
        <textarea
          id="sr-note"
          rows={2}
          className="field-input"
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
        />
      </Field>
    </FormDialog>
  );
}

const REQUEST_PILL: Record<string, string> = {
  PENDING: PILL.amber,
  APPROVED: PILL.green,
  REJECTED: PILL.red,
};

export default function StaffRightsPage({panel = 'shop-admin'}: Props) {
  const {data, isLoading, isError, error, refetch} = useStaff(panel);
  const {data: requests} = useStaffRequests(panel);
  const updateRights = useUpdateStaffRights(panel);
  const updateShift = useUpdateStaffShift(panel);
  const [requestOpen, setRequestOpen] = useState(false);
  const rights = data?.rights ?? [];

  const toggle = (member: StaffMember, key: string) => {
    const permissions = member.permissions.includes(key)
      ? member.permissions.filter((p) => p !== key)
      : [...member.permissions, key];
    updateRights.mutate({id: member.id, permissions});
  };

  return (
    <div>
      <PageHeader
        breadcrumbs={[{label: 'Shop'}, {label: 'Staff'}]}
        title="Staff & rights"
        subtitle="Your team's shifts, task permissions and today's activity. Adding or moving staff is done by the Branch Admin."
        actions={
          <button type="button" className="btn-ghost" onClick={() => setRequestOpen(true)}>
            Request new staff
          </button>
        }
      />

      <section className="panel">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-collapse text-left">
            <thead>
              <tr className="border-b border-ivory-300 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
                <th scope="col" className="px-4 py-3">Staff</th>
                <th scope="col" className="px-3 py-3">Role</th>
                <th scope="col" className="px-3 py-3">Shift</th>
                <th scope="col" className="px-3 py-3">Today</th>
                {rights.map((r) => (
                  <th key={r.key} scope="col" className="whitespace-nowrap px-3 py-3 text-center">
                    {r.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-200 text-body-sm text-espresso">
              {isLoading && (
                <tr>
                  <td colSpan={4 + rights.length} className="px-4 py-10 text-center text-outline">
                    Loading staff…
                  </td>
                </tr>
              )}
              {isError && (
                <tr>
                  <td colSpan={4 + rights.length} className="px-4 py-10 text-center text-error">
                    {getErrorMessage(error, 'Could not load staff')}{' '}
                    <button type="button" className="btn-text" onClick={() => refetch()}>
                      Retry
                    </button>
                  </td>
                </tr>
              )}
              {data && !data.items.length && (
                <tr>
                  <td colSpan={4 + rights.length} className="px-4 py-10 text-center text-outline">
                    No staff in this shop yet. Request new staff to get started.
                  </td>
                </tr>
              )}
              {data?.items.map((s) => (
                <tr key={s.id} className="hover:bg-ivory-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blush/50 text-[11px] font-semibold text-burgundy">
                        {initials(s.fullname)}
                      </span>
                      <div className="min-w-0">
                        <p className="font-medium leading-tight">{s.fullname}</p>
                        <p className="text-[11px] text-outline">{s.employeeCode ?? '—'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3">{s.role}</td>
                  <td className="px-3 py-3">
                    <label className="sr-only" htmlFor={`shift-${s.id}`}>
                      Shift of {s.fullname}
                    </label>
                    <select
                      id={`shift-${s.id}`}
                      value={s.shift}
                      disabled={updateShift.isPending}
                      onChange={(e) => updateShift.mutate({id: s.id, shift: e.target.value as Shift})}
                      className="cursor-pointer border border-transparent bg-transparent py-1 pr-1 text-body-sm hover:border-ivory-300 focus:border-burgundy focus:outline-none"
                    >
                      {(Object.keys(SHIFT_LABEL) as Shift[]).map((k) => (
                        <option key={k} value={k}>
                          {SHIFT_LABEL[k]}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-3">
                    <TodayCell member={s} panel={panel} />
                  </td>
                  {rights.map((r) => (
                    <td key={r.key} className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        aria-label={`${r.label} for ${s.fullname}`}
                        title={s.isManager ? 'The shop manager has every right' : undefined}
                        className="h-4 w-4 cursor-pointer accent-[#6B1E2E] disabled:cursor-not-allowed"
                        checked={s.permissions.includes(r.key)}
                        disabled={s.isManager}
                        onChange={() => toggle(s, r.key)}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data && (
          <p className="border-t border-ivory-300 px-4 py-3 text-body-sm text-outline">
            {data.summary.total} staff · {data.summary.in} in today · {data.summary.onLeave} on leave.
            Ticking a box saves it straight away.
          </p>
        )}
      </section>

      {!!requests?.length && (
        <section className="panel mt-6">
          <h2 className="border-b border-ivory-300 px-4 py-3 font-serif text-headline-sm text-burgundy">
            Staff requests
          </h2>
          <ul className="divide-y divide-ivory-200">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-body-sm">
                <div>
                  <p className="font-medium text-espresso">
                    {r.fullname} · {r.employeeRole} · {SHIFT_LABEL[r.shift] ?? r.shift}
                  </p>
                  <p className="text-[11px] text-outline">
                    {r.requestNumber} · {r.phoneNumber} · {new Date(r.createdAt).toLocaleDateString('en-IN')}
                    {r.decisionNote ? ` · ${r.decisionNote}` : ''}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${REQUEST_PILL[r.status]}`}
                >
                  <span className="h-1.5 w-1.5 rounded-full bg-current" />
                  {r.status}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <RequestStaffDialog
        open={requestOpen}
        onClose={() => setRequestOpen(false)}
        panel={panel}
        rights={rights}
      />
    </div>
  );
}
