import {useEffect, useState} from 'react';
import {
  useBranchProfileSetup,
  useUpdateBranchProfileSetup,
} from '@/lib/react-query/queriesAndMutations/branchExtras';
import {
  WEEK_DAYS,
  type BranchProfileContact,
  type BranchProfileHours,
  type WeekDay,
} from '@/lib/api/branchExtras';
import toast from 'react-hot-toast';

const serif = {fontFamily: "'Playfair Display', Georgia, serif"};
const card = 'space-y-4 rounded-lg border border-[#efe9e3] bg-white p-5 shadow-sm';
const label = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#736862]';
const input =
  'w-full rounded border border-[#ded5ce] bg-white px-3 py-2 text-sm text-[#2a2220] focus:outline-none focus:ring-1 focus:ring-[#832729] disabled:bg-[#faf7f4] disabled:text-[#736862]';

const EMPTY_CONTACT: BranchProfileContact = {
  email: '',
  phone: '',
  alternatePhone: '',
  address: '',
  city: '',
  district: '',
  state: '',
  postalCode: '',
};
const EMPTY_HOURS: BranchProfileHours = {openingTime: '', closingTime: '', weeklyHolidays: []};

const dayLabel = (d: WeekDay) => d.charAt(0) + d.slice(1, 3).toLowerCase();

export default function BranchProfileSetupPage() {
  const {data, isLoading} = useBranchProfileSetup();
  const update = useUpdateBranchProfileSetup();
  const [contact, setContact] = useState(EMPTY_CONTACT);
  const [hours, setHours] = useState(EMPTY_HOURS);

  // Fill the form when the branch has loaded (and again after saving)
  useEffect(() => {
    if (data) {
      setContact(data.contact);
      setHours(data.hours);
    }
  }, [data]);

  const set = (k: keyof BranchProfileContact) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setContact((c) => ({...c, [k]: e.target.value}));

  const toggleDay = (d: WeekDay) =>
    setHours((h) => ({
      ...h,
      weeklyHolidays: h.weeklyHolidays.includes(d)
        ? h.weeklyHolidays.filter((x) => x !== d)
        : [...h.weeklyHolidays, d],
    }));

  const save = () => {
    if (hours.weeklyHolidays.length >= 7) {
      toast.error('The branch must be open at least one day');
      return;
    }
    if (hours.openingTime && hours.closingTime && hours.closingTime <= hours.openingTime) {
      toast.error('Closing time must be after opening time');
      return;
    }
    update.mutate({...contact, ...hours});
  };

  const fields: {key: keyof BranchProfileContact; title: string; type?: string; span?: boolean}[] = [
    {key: 'email', title: 'Email', type: 'email'},
    {key: 'phone', title: 'Phone', type: 'tel'},
    {key: 'alternatePhone', title: 'Alternate phone', type: 'tel'},
    {key: 'postalCode', title: 'Pincode *'},
    {key: 'address', title: 'Address *', span: true},
    {key: 'city', title: 'City *'},
    {key: 'district', title: 'District *'},
    {key: 'state', title: 'State *'},
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 text-[#2b2b2b]">
      <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8b6f66]">
            Setup / Branch profile
          </div>
          <h1 className="font-serif text-3xl tracking-tight text-[#2a2220]" style={serif}>
            Branch profile
          </h1>
          <p className="mt-1 text-sm text-[#736862]">
            Name, code and status are set by your Company Admin. You can update contact details
            and hours.
          </p>
        </div>
        <button
          onClick={save}
          disabled={isLoading || update.isPending}
          className="self-start rounded bg-[#7a2222] px-5 py-2 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#681c1c] disabled:opacity-50"
        >
          {update.isPending ? 'Saving…' : 'Save changes'}
        </button>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">
          <div className={card}>
            <h3 className="font-serif text-base font-semibold text-[#2a2220]" style={serif}>
              Branch identity
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={label}>Branch name</label>
                <input value={data?.identity.branchName ?? ''} disabled className={input} />
              </div>
              <div>
                <label className={label}>Branch code</label>
                <input value={data?.identity.branchCode ?? ''} disabled className={input} />
              </div>
              <div>
                <label className={label}>Company</label>
                <input value={data?.identity.company ?? ''} disabled className={input} />
              </div>
            </div>
          </div>

          <div className={card}>
            <h3 className="font-serif text-base font-semibold text-[#2a2220]" style={serif}>
              Contact & address
            </h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {fields.map((f) => (
                <div key={f.key} className={f.span ? 'sm:col-span-2' : ''}>
                  <label className={label} htmlFor={f.key}>
                    {f.title}
                  </label>
                  <input
                    id={f.key}
                    type={f.type ?? 'text'}
                    value={contact[f.key]}
                    onChange={set(f.key)}
                    disabled={isLoading}
                    className={input}
                  />
                </div>
              ))}
            </div>
          </div>

          <div className={card}>
            <h3 className="font-serif text-base font-semibold text-[#2a2220]" style={serif}>
              Opening hours
            </h3>
            <div className="grid grid-cols-2 gap-4 sm:max-w-sm">
              <div>
                <label className={label}>Opens</label>
                <input
                  type="time"
                  value={hours.openingTime}
                  onChange={(e) => setHours((h) => ({...h, openingTime: e.target.value}))}
                  className={input}
                />
              </div>
              <div>
                <label className={label}>Closes</label>
                <input
                  type="time"
                  value={hours.closingTime}
                  onChange={(e) => setHours((h) => ({...h, closingTime: e.target.value}))}
                  className={input}
                />
              </div>
            </div>
            <div>
              <span className={label}>Open on</span>
              <div className="flex flex-wrap gap-2">
                {WEEK_DAYS.map((d) => {
                  const open = !hours.weeklyHolidays.includes(d);
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => toggleDay(d)}
                      aria-pressed={open}
                      className={`rounded border px-3 py-1.5 text-xs font-semibold transition ${
                        open
                          ? 'border-[#7a2222] bg-[#7a2222] text-white'
                          : 'border-[#ded5ce] text-[#736862] line-through'
                      }`}
                    >
                      {dayLabel(d)}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-xs text-[#736862]">Tap a day to mark it as the weekly off.</p>
            </div>
          </div>
        </div>

        <div className={`${card} lg:col-span-4`}>
          <h3 className="font-serif text-base font-semibold text-[#2a2220]" style={serif}>
            At a glance
          </h3>
          <dl className="divide-y divide-[#f7f2ed] text-sm">
            {[
              ['Shops', data?.glance.shops],
              ['Employees', data?.glance.employees],
              [
                'Branch opened',
                data
                  ? new Date(data.glance.branchOpened).toLocaleDateString('en-IN', {
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric',
                    })
                  : undefined,
              ],
              ['Status', data?.glance.status],
            ].map(([k, v]) => (
              <div key={k as string} className="flex justify-between py-2.5">
                <dt className="text-[#736862]">{k}</dt>
                <dd className="font-medium text-[#2a2220]">{v ?? '—'}</dd>
              </div>
            ))}
          </dl>
        </div>
      </div>
    </div>
  );
}
