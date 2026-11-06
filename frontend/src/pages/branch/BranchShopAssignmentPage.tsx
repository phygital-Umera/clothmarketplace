import {useMemo, useState} from 'react';
import {
  useBranchShopAssignment,
  useMoveBranchEmployee,
} from '@/lib/react-query/queriesAndMutations/branchExtras';
import toast from 'react-hot-toast';

const serif = {fontFamily: "'Playfair Display', Georgia, serif"};
const label = 'mb-1 block text-[11px] font-bold uppercase tracking-wider text-[#736862]';
const input =
  'w-full rounded border border-[#ded5ce] bg-white px-3 py-2 text-sm text-[#2a2220] focus:outline-none focus:ring-1 focus:ring-[#832729]';

const ROLES = ['Sales associate', 'Cashier', 'Shop manager', 'Stock keeper'];

export default function BranchShopAssignmentPage() {
  const {data, isLoading} = useBranchShopAssignment();
  const move = useMoveBranchEmployee();

  const [employeeId, setEmployeeId] = useState('');
  const [targetShopId, setTargetShopId] = useState('');
  const [roleInShop, setRoleInShop] = useState('');
  const [reason, setReason] = useState('');

  const groups = data?.groups ?? [];
  const everyone = useMemo(
    () => [...groups.flatMap((g) => g.staff), ...(data?.unassigned ?? [])],
    [groups, data?.unassigned],
  );
  const picked = everyone.find((e) => e.id === employeeId);

  const save = async () => {
    if (!employeeId || !targetShopId) {
      toast.error('Choose an employee and the shop to move them to');
      return;
    }
    await move.mutateAsync({
      employeeId,
      targetShopId,
      roleInShop: roleInShop || undefined,
      reason: reason.trim() || undefined,
    });
    setEmployeeId('');
    setTargetShopId('');
    setRoleInShop('');
    setReason('');
  };

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 text-[#2b2b2b]">
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8b6f66]">
          Setup / Shop assignment
        </div>
        <h1 className="font-serif text-3xl tracking-tight text-[#2a2220]" style={serif}>
          Shop assignment
        </h1>
        <p className="mt-1 text-sm text-[#736862]">
          Who works in which shop. Moving someone changes the shop they bill and log in for.
        </p>
      </div>

      {isLoading && <p className="text-sm text-[#736862]">Loading…</p>}
      {!isLoading && !groups.length && (
        <p className="rounded-lg border border-dashed border-[#ded5ce] bg-white py-10 text-center text-sm text-[#736862]">
          This branch has no shops yet.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {groups.map((g) => (
          <div key={g.shopId} className="rounded-lg border border-[#efe9e3] bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-start justify-between">
              <div>
                <h3 className="font-serif text-base font-semibold text-[#2a2220]" style={serif}>
                  {g.shopName}
                </h3>
                <p className="text-[11px] text-[#8b6f66]">
                  {g.shopCode} · Login: {g.manager}
                </p>
              </div>
              <span className="rounded-full bg-[#faf7f4] px-2 py-0.5 text-[11px] font-bold text-[#736862]">
                {g.staffCount}
              </span>
            </div>
            {g.staff.length ? (
              <ul className="space-y-2">
                {g.staff.map((m) => (
                  <li key={m.id}>
                    <button
                      onClick={() => setEmployeeId(m.id)}
                      className={`flex w-full items-center gap-2.5 rounded p-1.5 text-left hover:bg-[#faf7f4] ${
                        employeeId === m.id ? 'bg-[#faf7f4] ring-1 ring-[#832729]/40' : ''
                      }`}
                    >
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#7a2222]/10 text-[11px] font-bold text-[#7a2222]">
                        {m.initials}
                      </span>
                      <span>
                        <span className="block text-sm text-[#2a2220]">{m.name}</span>
                        <span className="text-[11px] text-[#8b6f66]">{m.role}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-[#736862]">No staff yet.</p>
            )}
          </div>
        ))}
      </div>

      {!!data?.unassigned.length && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          <p className="mb-2 font-semibold text-amber-900">Not in any shop</p>
          <div className="flex flex-wrap gap-2">
            {data.unassigned.map((m) => (
              <button
                key={m.id}
                onClick={() => setEmployeeId(m.id)}
                className="rounded-full border border-amber-300 bg-white px-3 py-1 text-xs"
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="space-y-4 rounded-lg border border-[#efe9e3] bg-white p-5 shadow-sm lg:col-span-5">
          <h3 className="font-serif text-base font-semibold text-[#2a2220]" style={serif}>
            Move an employee
          </h3>
          <div>
            <label className={label}>Employee *</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={input}>
              <option value="">Choose…</option>
              {everyone.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.shopName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Move to *</label>
            <select value={targetShopId} onChange={(e) => setTargetShopId(e.target.value)} className={input}>
              <option value="">Choose a shop…</option>
              {data?.shops
                .filter((s) => s.name !== picked?.shopName)
                .map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className={label}>Role in shop</label>
            <select value={roleInShop} onChange={(e) => setRoleInShop(e.target.value)} className={input}>
              <option value="">Keep current role</option>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Reason</label>
            <input
              value={reason}
              maxLength={300}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Optional"
              className={input}
            />
          </div>
          <button
            onClick={save}
            disabled={move.isPending}
            className="w-full rounded bg-[#7a2222] py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#681c1c] disabled:opacity-50"
          >
            {move.isPending ? 'Moving…' : 'Move'}
          </button>
        </div>

        <div className="overflow-hidden rounded-lg border border-[#efe9e3] bg-white shadow-sm lg:col-span-7">
          <h3 className="border-b border-[#f2ede7] px-5 py-3 font-serif text-base font-semibold text-[#2a2220]" style={serif}>
            Recent moves
          </h3>
          {!data?.history.length ? (
            <p className="px-5 py-8 text-center text-sm text-[#736862]">No moves yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="bg-[#faf7f4] text-[10px] font-semibold uppercase tracking-wider text-[#8b6f66]">
                    <th className="px-4 py-2.5">Employee</th>
                    <th className="px-4 py-2.5">From → to</th>
                    <th className="px-4 py-2.5">Date</th>
                    <th className="px-4 py-2.5">By</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f7f2ed]">
                  {data.history.map((h) => (
                    <tr key={h.id}>
                      <td className="px-4 py-2.5 font-medium text-[#2a2220]">
                        {h.employee}
                        {h.role && <span className="block text-[11px] font-normal text-[#8b6f66]">{h.role}</span>}
                      </td>
                      <td className="px-4 py-2.5">
                        {h.fromTo}
                        {h.reason && <span className="block text-[11px] text-[#8b6f66]">{h.reason}</span>}
                      </td>
                      <td className="whitespace-nowrap px-4 py-2.5">
                        {new Date(h.date).toLocaleDateString('en-IN', {day: '2-digit', month: 'short'})}
                      </td>
                      <td className="px-4 py-2.5">{h.by}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
