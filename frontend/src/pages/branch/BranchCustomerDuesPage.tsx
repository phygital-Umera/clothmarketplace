import {useState} from 'react';
import {
  useCustomerDues,
  useCustomerDueSummary,
  useSendReminders,
  useUpdateCreditLimit,
} from '@/lib/react-query/queriesAndMutations/customerDue';
import {CustomerDue} from '@/types/customerDue';
import {exportCustomerDues} from '@/lib/api/customerDue';
import toast from 'react-hot-toast';
import {Download, Send, Search, Check, AlertCircle, ShieldAlert} from 'lucide-react';

const inr = (n?: number | null) =>
  n === undefined || n === null
    ? '—'
    : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

type TabType = 'WITH_DUE' | 'OVERDUE' | 'OVER_LIMIT' | 'ALL';

export default function BranchCustomerDuesPage() {
  const [tab, setTab] = useState<TabType>('WITH_DUE');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDue | null>(null);

  // Form states for credit limit panel
  const [editLimit, setEditLimit] = useState<number | string>('');
  const [editDays, setEditDays] = useState<number | string>('30');
  const [allowOverLimit, setAllowOverLimit] = useState(false);
  const [askClearOldDue, setAskClearOldDue] = useState(true);

  const {data: summary, isLoading: isSummaryLoading} = useCustomerDueSummary();
  const {data, isLoading: isListLoading, refetch} = useCustomerDues({
    tab,
    search: search.trim() || undefined,
    page,
    limit: 10,
  });

  const updateLimitMutation = useUpdateCreditLimit();
  const sendRemindersMutation = useSendReminders();

  const handleSelectCustomer = (c: CustomerDue) => {
    setSelectedCustomer(c);
    setEditLimit(c.creditLimit);
    setEditDays(c.creditDays || 30);
    setAllowOverLimit(c.allowOverLimit);
    setAskClearOldDue(c.askClearOldDue);
  };

  // If initial load or selection empty, select first customer or one with pending request
  const customers = data?.items || [];
  const activeCustomer =
    selectedCustomer && customers.find((c) => c.id === selectedCustomer.id)
      ? selectedCustomer
      : customers.find((c) => c.pendingRequest) || customers[0] || null;

  const handleSaveCreditLimit = async () => {
    if (!activeCustomer) return;
    const limitNum = Number(editLimit);
    const daysNum = Number(editDays);

    await updateLimitMutation.mutateAsync({
      id: activeCustomer.id,
      payload: {
        creditLimit: isNaN(limitNum) ? activeCustomer.creditLimit : limitNum,
        creditDays: isNaN(daysNum) ? activeCustomer.creditDays : daysNum,
        allowOverLimit,
        askClearOldDue,
        action: 'APPROVE',
      },
    });
    refetch();
  };

  const handleRejectRequest = async () => {
    if (!activeCustomer) return;
    await updateLimitMutation.mutateAsync({
      id: activeCustomer.id,
      payload: {
        action: 'REJECT',
      },
    });
    refetch();
  };

  const handleSendReminders = async () => {
    await sendRemindersMutation.mutateAsync();
  };

  const handleExport = async () => {
    try {
      toast.loading('Exporting customer dues...', {id: 'export'});
      const res = await exportCustomerDues({tab, search: search.trim() || undefined});
      const items = res.data || [];
      if (!items.length) {
        toast.error('No customer records to export', {id: 'export'});
        return;
      }
      const headers = ['Customer Name', 'Phone', 'Type', 'GSTIN', 'Shop', 'Credit Limit', '0-30 Days Due', '30+ Days Due', 'Total Due'];
      const rows = items.map((c) => [
        `"${c.name}"`,
        `"${c.phone}"`,
        `"${c.customerType}"`,
        `"${c.gstin || ''}"`,
        `"${c.shopName}"`,
        c.creditLimit,
        c.due0To30,
        c.due30Plus,
        c.totalDue,
      ]);
      const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
      const blob = new Blob([csv], {type: 'text/csv;charset=utf-8;'});
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `customer_dues_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success('Export downloaded successfully', {id: 'export'});
    } catch {
      toast.error('Failed to export', {id: 'export'});
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-caps uppercase text-ivory-600 tracking-wider">
            Sales / Customers & Dues
          </p>
          <h1 className="font-serif text-headline-md font-normal text-burgundy-deep">
            Customers & dues
          </h1>
          <p className="mt-1 text-body-sm text-espresso-muted">
            Credit (udhaar) given by all shops in the branch. You set credit limits and approve sales over limit.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSendReminders}
            disabled={sendRemindersMutation.isPending}
            className="btn-outline flex items-center gap-2 border-burgundy/30 text-burgundy hover:bg-burgundy/5"
          >
            <Send size={15} />
            <span>SEND REMINDERS</span>
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="btn-outline flex items-center gap-2 border-burgundy/30 text-burgundy hover:bg-burgundy/5"
          >
            <Download size={15} />
            <span>EXPORT</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <div className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
          <p className="text-label-caps uppercase text-ivory-600">Total Due</p>
          <p className="mt-1 font-serif text-headline-sm font-semibold text-burgundy-deep">
            {inr(summary?.totalDue ?? 39250)}
          </p>
          <p className="mt-0.5 text-technical-data text-espresso-muted">
            {summary?.customerCount ?? 17} customers
          </p>
        </div>

        {(summary?.shopBreakdown && summary.shopBreakdown.length > 0
          ? summary.shopBreakdown
          : [
              {shopName: "Women's Wear", amount: 28650, customerCount: 9},
              {shopName: "Men's Wear", amount: 9400, customerCount: 5},
              {shopName: "Kids Wear", amount: 1200, customerCount: 3},
            ]
        ).map((s) => (
          <div key={s.shopName} className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
            <p className="text-label-caps uppercase text-ivory-600">{s.shopName}</p>
            <p className="mt-1 font-serif text-headline-sm font-semibold text-espresso">
              {inr(s.amount)}
            </p>
            <p className="mt-0.5 text-technical-data text-espresso-muted">
              {s.customerCount} customers
            </p>
          </div>
        ))}

        <div className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
          <p className="text-label-caps uppercase text-ivory-600">Over 30 Days</p>
          <p className="mt-1 font-serif text-headline-sm font-semibold text-error">
            {inr(summary?.over30DaysDue ?? 12200)}
          </p>
          <p className="mt-0.5 text-technical-data text-error font-medium">
            {summary?.over30DaysCount ?? 5} customers
          </p>
        </div>
      </div>

      {/* Main Content: Split List and Detail Drawer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left 2 Cols: Tabs, Search and Table */}
        <div className="space-y-4 rounded-lg border border-ivory-300 bg-white p-5 shadow-sm lg:col-span-2">
          {/* Tabs and Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex border-b border-ivory-200">
              <button
                type="button"
                onClick={() => {
                  setTab('WITH_DUE');
                  setPage(1);
                }}
                className={`border-b-2 px-3 py-2 text-label-caps font-semibold uppercase transition-colors ${
                  tab === 'WITH_DUE'
                    ? 'border-burgundy text-burgundy'
                    : 'border-transparent text-espresso-muted hover:text-espresso'
                }`}
              >
                With Due
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('OVERDUE');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-label-caps font-semibold uppercase transition-colors ${
                  tab === 'OVERDUE'
                    ? 'border-burgundy text-burgundy'
                    : 'border-transparent text-espresso-muted hover:text-espresso'
                }`}
              >
                <span>Overdue</span>
                <span className="rounded bg-error/10 px-1.5 py-0.2 text-[11px] font-semibold text-error">
                  {summary?.overdueCount ?? 5}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('OVER_LIMIT');
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 border-b-2 px-3 py-2 text-label-caps font-semibold uppercase transition-colors ${
                  tab === 'OVER_LIMIT'
                    ? 'border-burgundy text-burgundy'
                    : 'border-transparent text-espresso-muted hover:text-espresso'
                }`}
              >
                <span>Over Limit</span>
                <span className="rounded bg-warning/20 px-1.5 py-0.2 text-[11px] font-semibold text-espresso">
                  {summary?.overLimitCount ?? 1}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setTab('ALL');
                  setPage(1);
                }}
                className={`border-b-2 px-3 py-2 text-label-caps font-semibold uppercase transition-colors ${
                  tab === 'ALL'
                    ? 'border-burgundy text-burgundy'
                    : 'border-transparent text-espresso-muted hover:text-espresso'
                }`}
              >
                All Customers
              </button>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-2.5 text-ivory-600" size={16} />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Name, mobile, GSTIN"
              className="w-full rounded border border-ivory-300 bg-ivory-50/50 py-2 pl-9 pr-4 text-body-sm text-espresso placeholder-espresso-muted/60 focus:border-burgundy focus:outline-none"
            />
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-body-sm">
              <thead>
                <tr className="border-b border-ivory-300 text-label-caps uppercase text-ivory-600">
                  <th className="py-2.5 pl-3 pr-2 font-medium">Customer</th>
                  <th className="px-2 py-2.5 font-medium">Shop</th>
                  <th className="px-2 py-2.5 text-right font-medium">Limit</th>
                  <th className="px-2 py-2.5 text-right font-medium">0-30 D</th>
                  <th className="px-2 py-2.5 text-right font-medium">30+ D</th>
                  <th className="py-2.5 pl-2 pr-3 text-right font-medium">Total Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {isListLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-espresso-muted">
                      Loading customer dues...
                    </td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-espresso-muted">
                      No customer dues found.
                    </td>
                  </tr>
                ) : (
                  customers.map((c) => {
                    const isSelected = activeCustomer?.id === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => handleSelectCustomer(c)}
                        className={`cursor-pointer transition-colors hover:bg-ivory-50 ${
                          isSelected ? '!bg-[#FDF4F4]' : ''
                        }`}
                      >
                        <td className="py-3 pl-3 pr-2">
                          <p className="font-serif font-medium text-espresso">{c.name}</p>
                          <p className="text-[11px] text-espresso-muted">
                            {c.customerType} · {c.phone}
                          </p>
                        </td>
                        <td className="px-2 py-3 text-espresso-muted">{c.shopName}</td>
                        <td className="px-2 py-3 text-right text-espresso-muted">
                          {inr(c.creditLimit)}
                        </td>
                        <td className="px-2 py-3 text-right text-espresso">
                          {c.due0To30 > 0 ? inr(c.due0To30) : '—'}
                        </td>
                        <td className="px-2 py-3 text-right font-medium">
                          {c.due30Plus > 0 ? (
                            <span className="text-error">{inr(c.due30Plus)}</span>
                          ) : (
                            <span className="text-espresso-muted">—</span>
                          )}
                        </td>
                        <td className="py-3 pl-2 pr-3 text-right font-serif font-semibold text-burgundy-deep">
                          {c.totalDue > 0 ? inr(c.totalDue) : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data?.pagination && (
            <div className="flex items-center justify-between border-t border-ivory-200 pt-3 text-technical-data text-espresso-muted">
              <span>
                {customers.length > 0 ? `1–${customers.length} of ${data.pagination.total}` : '0 of 0'}
              </span>
              <div className="flex items-center gap-2">
                <span>Page {data.pagination.page} of {data.pagination.pages || 1}</span>
                {data.pagination.pages > 1 && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded border border-ivory-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Prev
                    </button>
                    <button
                      type="button"
                      disabled={page >= data.pagination.pages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded border border-ivory-300 px-2 py-1 text-xs disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Credit Limit & Approval Panel */}
        <div className="h-fit rounded-lg border border-ivory-300 bg-white p-5 shadow-sm">
          {activeCustomer ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between border-b border-ivory-200 pb-3">
                <h3 className="font-serif text-title-lg font-normal text-burgundy-deep">
                  Credit limit
                </h3>
                {activeCustomer.pendingRequest ? (
                  <span className="flex items-center gap-1 rounded bg-error/10 px-2 py-0.5 text-label-caps font-semibold uppercase text-error">
                    <span className="h-1.5 w-1.5 rounded-full bg-error" />
                    Over limit request
                  </span>
                ) : (
                  <span className="rounded bg-ivory-200 px-2 py-0.5 text-label-caps font-semibold uppercase text-espresso-muted">
                    Active Limit
                  </span>
                )}
              </div>

              {/* Customer info */}
              <div>
                <p className="text-label-caps uppercase text-ivory-600">Customer</p>
                <p className="mt-1 font-medium text-espresso">
                  {activeCustomer.name} · {activeCustomer.customerType}
                  {activeCustomer.gstin ? ` · GSTIN ${activeCustomer.gstin}` : ''}
                </p>
              </div>

              {/* Current due */}
              <div>
                <p className="text-label-caps uppercase text-ivory-600">Current Due</p>
                <p className="mt-1 font-medium text-error">
                  {inr(activeCustomer.totalDue)}{' '}
                  {activeCustomer.due30Plus > 0 ? (
                    <span className="text-body-sm font-normal text-error/80">
                      ({inr(activeCustomer.due30Plus)} is 30+ days old)
                    </span>
                  ) : (
                    <span className="text-body-sm font-normal text-espresso-muted">(all current)</span>
                  )}
                </p>
              </div>

              {/* Over Limit Request details if any */}
              {activeCustomer.pendingRequest && (
                <div className="rounded border border-error/20 bg-error/5 p-3">
                  <p className="text-label-caps uppercase text-error">Request</p>
                  <p className="mt-1 text-body-sm font-medium text-espresso">
                    {activeCustomer.pendingRequest.note ||
                      `New bill ${inr(activeCustomer.pendingRequest.billAmount)} on credit — due ${inr(activeCustomer.pendingRequest.totalIfApproved)}`}
                  </p>
                </div>
              )}

              {/* Edit inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-label-caps uppercase text-ivory-600">
                    Credit Limit (₹)
                  </label>
                  <input
                    type="number"
                    value={editLimit}
                    onChange={(e) => setEditLimit(e.target.value)}
                    className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-label-caps uppercase text-ivory-600">
                    Credit Days
                  </label>
                  <input
                    type="number"
                    value={editDays}
                    onChange={(e) => setEditDays(e.target.value)}
                    className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
                  />
                </div>

                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 text-body-sm text-espresso cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allowOverLimit}
                      onChange={(e) => setAllowOverLimit(e.target.checked)}
                      className="h-4 w-4 rounded border-ivory-300 accent-burgundy"
                    />
                    <span>Allow this one bill over limit</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-body-sm text-espresso cursor-pointer">
                    <input
                      type="checkbox"
                      checked={askClearOldDue}
                      onChange={(e) => setAskClearOldDue(e.target.checked)}
                      className="h-4 w-4 rounded border-ivory-300 accent-burgundy"
                    />
                    <span>Ask to clear 30+ day due first</span>
                  </label>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-3 border-t border-ivory-200 pt-4">
                {activeCustomer.pendingRequest && (
                  <button
                    type="button"
                    onClick={handleRejectRequest}
                    disabled={updateLimitMutation.isPending}
                    className="btn-outline flex-1 border-ivory-400 text-espresso hover:bg-ivory-100"
                  >
                    REJECT
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleSaveCreditLimit}
                  disabled={updateLimitMutation.isPending}
                  className="btn-primary flex-1 bg-burgundy hover:bg-burgundy-deep text-white"
                >
                  SAVE
                </button>
              </div>
            </div>
          ) : (
            <div className="py-12 text-center text-espresso-muted">
              Select a customer to view or edit credit limit.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

