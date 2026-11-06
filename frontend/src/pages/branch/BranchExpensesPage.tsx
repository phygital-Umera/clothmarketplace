import {useState} from 'react';
import {
  useBranchExpenses,
  useAddBranchExpense,
} from '@/lib/react-query/queriesAndMutations/branchExtras';
import type {ExpensePaidFrom} from '@/lib/api/branchExtras';
import toast from 'react-hot-toast';

const inr = (n?: number | null) =>
  !n ? '—' : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

const today = () => new Date().toLocaleDateString('en-CA');

const HEADS = [
  'Rent',
  'Salaries',
  'Electricity',
  'Packing, porter, tea',
  'Repairs & Maintenance',
  'Other',
];

const PAID_FROM: {value: ExpensePaidFrom; label: string}[] = [
  {value: 'BANK', label: 'Branch bank'},
  {value: 'PETTY_CASH', label: 'Branch petty cash'},
  {value: 'OWNER', label: 'Owner'},
];

const label = 'block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1';
const input =
  'w-full border border-[#ded5ce] rounded px-2.5 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]';
const serif = {fontFamily: "'Playfair Display', Georgia, serif"};

export default function BranchExpensesPage() {
  const {data, isLoading} = useBranchExpenses();
  const addExpense = useAddBranchExpense();

  const [date, setDate] = useState(today());
  const [amount, setAmount] = useState('');
  const [head, setHead] = useState(HEADS[0]);
  const [chargeTo, setChargeTo] = useState('SPLIT');
  const [paidFrom, setPaidFrom] = useState<ExpensePaidFrom>('BANK');
  const [note, setNote] = useState('');

  const shops = data?.shops ?? [];
  const rows = data?.rows ?? [];

  const save = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error('Enter an amount more than 0');
      return;
    }
    await addExpense.mutateAsync({
      date,
      amount: amt,
      head,
      chargeTo,
      paidFrom,
      note: note.trim() || undefined,
    });
    setAmount('');
    setNote('');
  };

  const cards = [
    {title: 'This month', value: data?.summary.thisMonth, sub: data?.summary.thisMonthSub},
    {title: 'Salaries', value: data?.summary.salaries},
    {title: 'Rent', value: data?.summary.rent},
    {title: 'Other', value: data?.summary.other},
  ];

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 text-[#2b2b2b]">
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-[#8b6f66]">
          Accounts / Expenses
        </div>
        <h1 className="font-serif text-3xl tracking-tight text-[#2a2220]" style={serif}>
          Expenses
        </h1>
        <p className="mt-1 text-sm text-[#736862]">
          This month's expenses of the branch and its shops. Book rent and salaries here and
          charge them to a shop, split them over all shops, or keep them at branch level.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {cards.map((c) => (
          <div key={c.title} className="rounded-lg border border-[#efe9e3] bg-white p-4 shadow-sm">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-[#8b6f66]">
              {c.title}
            </div>
            <div className="mt-1 font-serif text-2xl font-semibold text-[#2a2220]" style={serif}>
              {isLoading ? '…' : inr(c.value)}
            </div>
            {c.sub && <div className="mt-1 text-xs text-[#736862]">{c.sub}</div>}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        <div className="overflow-hidden rounded-lg border border-[#efe9e3] bg-white shadow-sm lg:col-span-8">
          <div className="border-b border-[#f2ede7] px-5 py-3">
            <h2 className="font-serif text-base font-semibold text-[#2a2220]" style={serif}>
              By shop{data?.month ? ` (${data.month})` : ''}
            </h2>
          </div>
          {!isLoading && !rows.length ? (
            <p className="px-5 py-10 text-center text-sm text-[#736862]">
              No expenses this month yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-[#f0eae3] bg-[#faf7f4] text-[10px] font-semibold uppercase tracking-wider text-[#8b6f66]">
                    <th className="px-4 py-3">Head</th>
                    {shops.map((s) => (
                      <th key={s.id} className="whitespace-nowrap px-4 py-3 text-right">
                        {s.name}
                      </th>
                    ))}
                    <th className="px-4 py-3 text-right">Branch</th>
                    <th className="px-4 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f7f2ed]">
                  {rows.map((r) => (
                    <tr key={r.head} className="hover:bg-[#fdfbfa]">
                      <td className="px-4 py-3 font-medium text-[#2a2220]">{r.head}</td>
                      {shops.map((s) => (
                        <td key={s.id} className="px-4 py-3 text-right font-mono">
                          {inr(r.byShop[s.id])}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-mono">{inr(r.branch)}</td>
                      <td className="px-4 py-3 text-right font-mono font-medium">{inr(r.total)}</td>
                    </tr>
                  ))}
                </tbody>
                {data?.totalRow && rows.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#e8dfd8] bg-[#fdfbf9] font-semibold">
                      <td className="px-4 py-3">Total</td>
                      {shops.map((s) => (
                        <td key={s.id} className="px-4 py-3 text-right font-mono">
                          {inr(data.totalRow.byShop[s.id])}
                        </td>
                      ))}
                      <td className="px-4 py-3 text-right font-mono">{inr(data.totalRow.branch)}</td>
                      <td className="px-4 py-3 text-right font-mono font-bold">
                        {inr(data.totalRow.total)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </div>

        <div className="space-y-4 rounded-lg border border-[#efe9e3] bg-white p-5 shadow-sm lg:col-span-4">
          <h3 className="font-serif text-base font-semibold text-[#2a2220]" style={serif}>
            Add branch expense
          </h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Date *</label>
              <input
                type="date"
                value={date}
                max={today()}
                onChange={(e) => setDate(e.target.value)}
                className={input}
              />
            </div>
            <div>
              <label className={label}>Amount *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹"
                className={input}
              />
            </div>
          </div>
          <div>
            <label className={label}>Head *</label>
            <select value={head} onChange={(e) => setHead(e.target.value)} className={input}>
              {HEADS.map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Charge to</label>
            <select value={chargeTo} onChange={(e) => setChargeTo(e.target.value)} className={input}>
              <option value="SPLIT">Split equally over all shops</option>
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} only
                </option>
              ))}
              <option value="BRANCH">Branch (not charged to a shop)</option>
            </select>
          </div>
          <div>
            <label className={label}>Paid from</label>
            <select
              value={paidFrom}
              onChange={(e) => setPaidFrom(e.target.value as ExpensePaidFrom)}
              className={input}
            >
              {PAID_FROM.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>Note</label>
            <input
              value={note}
              maxLength={300}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Bill no., month, etc."
              className={input}
            />
          </div>
          <button
            onClick={save}
            disabled={addExpense.isPending}
            className="w-full rounded bg-[#7a2222] py-2.5 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#681c1c] disabled:opacity-50"
          >
            {addExpense.isPending ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
