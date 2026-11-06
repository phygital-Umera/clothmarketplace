import {useState} from 'react';
import {
  useBranchApprovals,
  useDecideBranchApproval,
} from '@/lib/react-query/queriesAndMutations/branchExtras';
import {RotateCcw} from 'lucide-react';

const serif = {fontFamily: "'Playfair Display', Georgia, serif"};

const TABS = [
  {key: 'PENDING', label: 'Pending', count: 'pending'},
  {key: 'DONE_TODAY', label: 'Done today', count: 'doneToday'},
] as const;

/**
 * Requests from the shops that need the branch admin: refund credit notes
 * (every cash refund, and card / UPI refunds above the limit).
 */
export default function BranchApprovalsPage() {
  const [activeTab, setActiveTab] = useState<(typeof TABS)[number]['key']>('PENDING');
  const {data, isLoading} = useBranchApprovals(
    activeTab === 'PENDING' ? undefined : activeTab,
  );
  const decide = useDecideBranchApproval();

  const items = data?.items ?? [];
  const limits = data?.limitsTable ?? [];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 text-[#2b2b2b]">
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8b6f66]">
          Overview / Approvals
        </div>
        <h1 className="font-serif text-3xl tracking-tight text-[#2a2220]" style={serif}>
          Approvals
        </h1>
        <p className="mt-1 text-sm text-[#736862]">
          Refunds the shops can't give alone. Approving puts the items back in stock; each
          decision is saved with your name and time.
        </p>
      </div>

      <div className="flex items-center gap-2 overflow-x-auto border-b border-[#ded5ce] pb-2 text-xs">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`flex items-center gap-1.5 rounded px-3 py-1.5 font-semibold uppercase tracking-wider transition ${
              activeTab === t.key
                ? 'border-b-2 border-[#832729] font-bold text-[#832729]'
                : 'text-[#736862] hover:text-[#2a2220]'
            }`}
          >
            <span>{t.label}</span>
            <span
              className={`rounded-full px-1.5 text-[10px] font-bold ${
                activeTab === t.key ? 'bg-[#832729] text-white' : 'bg-[#e8dfd8] text-[#554e48]'
              }`}
            >
              {data?.counts[t.count] ?? 0}
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {isLoading && <p className="py-10 text-center text-sm text-[#736862]">Loading…</p>}
        {!isLoading && !items.length && (
          <p className="rounded-lg border border-dashed border-[#ded5ce] bg-white py-10 text-center text-sm text-[#736862]">
            {activeTab === 'PENDING' ? 'Nothing is waiting for you.' : 'No decisions yet today.'}
          </p>
        )}
        {items.map((item) => (
          <div
            key={item.id}
            className="flex flex-col justify-between gap-4 rounded-lg border border-[#efe9e3] bg-white p-4 shadow-sm transition hover:border-[#ded5ce] md:flex-row md:items-center"
          >
            <div className="flex flex-1 items-start gap-3.5">
              <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded border border-[#efe9e3] bg-[#faf7f4]">
                <RotateCcw size={16} className="text-[#ca8a04]" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded bg-[#fef9c3] px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#854d0e]">
                    Refund
                  </span>
                  <span className="text-sm font-semibold text-[#2a2220]">{item.title}</span>
                </div>
                <p className="text-xs text-[#554e48]">{item.description}</p>
                <div className="text-[11px] text-[#8b6f66]">{item.shopAndStaff}</div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-3 self-end md:self-center">
              <div className="mr-2 text-right">
                <div className="text-[10px] font-bold uppercase tracking-wider text-[#8b6f66]">
                  Amount
                </div>
                <div className="text-sm font-bold text-[#2a2220]">{item.amountLabel}</div>
              </div>
              {item.status === 'PENDING' ? (
                <>
                  <button
                    onClick={() => decide.mutate({id: item.id, decision: 'REJECT'})}
                    disabled={decide.isPending}
                    className="rounded border border-[#ded5ce] px-3 py-1.5 text-xs font-semibold uppercase tracking-wider text-[#832729] transition hover:bg-[#832729]/5 disabled:opacity-50"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => decide.mutate({id: item.id, decision: 'APPROVE'})}
                    disabled={decide.isPending}
                    className="rounded bg-[#7a2222] px-3.5 py-1.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#681c1c] disabled:opacity-50"
                  >
                    Approve
                  </button>
                </>
              ) : (
                <span
                  className={`rounded px-3 py-1 text-xs font-bold uppercase tracking-wider ${
                    item.status === 'APPROVED'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {item.status}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {limits.length > 0 && (
        <div className="space-y-4 rounded-lg border border-[#efe9e3] bg-white p-5 shadow-sm">
          <h3 className="font-serif text-base font-semibold text-[#2a2220]" style={serif}>
            Approval rules
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-[#f0eae3] bg-[#faf7f4] text-[10px] font-semibold uppercase tracking-wider text-[#8b6f66]">
                  <th className="px-4 py-2.5">Action</th>
                  <th className="px-4 py-2.5">Shop can</th>
                  <th className="px-4 py-2.5">Above that</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f7f2ed]">
                {limits.map((l) => (
                  <tr key={l.action}>
                    <td className="px-4 py-3 font-medium text-[#2a2220]">{l.action}</td>
                    <td className="px-4 py-3 text-[#554e48]">{l.cashierCan}</td>
                    <td className="px-4 py-3 font-medium text-[#832729]">{l.aboveThat}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
