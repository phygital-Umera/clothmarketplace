import {useState} from 'react';
import {
  useBranchExpenses,
  useAddBranchExpense,
} from '@/lib/react-query/queriesAndMutations/branchExtras';
import {Upload, Download} from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n?: number | null) =>
  n === undefined || n === null || n === 0
    ? '—'
    : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

export default function BranchExpensesPage() {
  const {data} = useBranchExpenses();
  const addExpenseMutation = useAddBranchExpense();

  // Form states
  const [date, setDate] = useState('2026-11-03');
  const [amount, setAmount] = useState<number | string>('');
  const [head, setHead] = useState('Rent');
  const [chargeTo, setChargeTo] = useState('Split by floor area (33/43/24)');
  const [paidFrom, setPaidFrom] = useState('Branch bank');
  const [billFile, setBillFile] = useState<File | null>(null);

  const handleSaveExpense = async () => {
    const amt = Number(amount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }
    await addExpenseMutation.mutateAsync({
      date,
      amount: amt,
      head,
      chargeTo,
      paidFrom,
    });
    setAmount('');
    toast.success('Branch expense recorded');
  };

  const summary = data?.summary || {
    thisMonth: 96400,
    thisMonthSub: 'Branch + 3 shops',
    salaries: 47500,
    salariesSub: '14 staff (Oct)',
    rent: 42000,
    rentSub: 'Building, 3 floors',
    other: 6900,
    otherSub: 'Power, porter, packing',
  };

  const rows = data?.rows || [
    {
      head: 'Rent (shared by area)',
      mens: 14000,
      womens: 18000,
      kids: 10000,
      branch: 0,
      total: 42000,
    },
    {
      head: 'Salaries',
      mens: 15700,
      womens: 15800,
      kids: 8000,
      branch: 8000,
      total: 47500,
    },
    {
      head: 'Electricity',
      mens: 1100,
      womens: 1200,
      kids: 700,
      branch: 0,
      total: 3000,
    },
    {
      head: 'Packing, porter, tea',
      mens: 850,
      womens: 1950,
      kids: 300,
      branch: 800,
      total: 3900,
    },
  ];

  const totalRow = data?.totalRow || {
    head: 'Total',
    mens: 31650,
    womens: 36950,
    kids: 19000,
    branch: 8800,
    total: 96400,
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto text-[#2b2b2b]">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div>
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66] mb-1">
            ACCOUNTS / EXPENSES
          </div>
          <h1
            className="text-3xl font-serif text-[#2a2220] tracking-tight"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Expenses
          </h1>
          <p className="text-sm text-[#736862] mt-1">
            Branch and shop expenses. Rent and salaries are booked here and shared to shops by area or sales.
          </p>
        </div>

        <button
          onClick={() => toast.success('Exporting expenses...')}
          className="self-start inline-flex items-center gap-1.5 border border-[#832729] text-[#832729] px-4 py-1.5 rounded text-xs font-semibold tracking-wider uppercase hover:bg-[#832729]/5 transition"
        >
          EXPORT
        </button>
      </div>

      {/* 4 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            THIS MONTH
          </div>
          <div
            className="text-2xl font-serif font-semibold text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(summary.thisMonth)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {summary.thisMonthSub}
          </div>
        </div>

        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            SALARIES
          </div>
          <div
            className="text-2xl font-serif font-semibold text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(summary.salaries)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {summary.salariesSub}
          </div>
        </div>

        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            RENT
          </div>
          <div
            className="text-2xl font-serif font-semibold text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(summary.rent)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {summary.rentSub}
          </div>
        </div>

        <div className="bg-white border border-[#efe9e3] rounded-lg p-4 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            OTHER
          </div>
          <div
            className="text-2xl font-serif font-semibold text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(summary.other)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {summary.otherSub}
          </div>
        </div>
      </div>

      {/* Main Grid: By Shop Table & Add Branch Expense Form */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left: By shop table */}
        <div className="lg:col-span-8 bg-white border border-[#efe9e3] rounded-lg shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-[#f2ede7]">
            <h2
              className="text-base font-serif text-[#2a2220] font-semibold tracking-wide"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              By shop (Nov)
            </h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#f0eae3] bg-[#faf7f4] text-[#8b6f66] uppercase text-[10px] font-semibold tracking-wider">
                  <th className="py-3 px-4">HEAD</th>
                  <th className="py-3 px-4 text-right">MEN'S</th>
                  <th className="py-3 px-4 text-right">WOMEN'S</th>
                  <th className="py-3 px-4 text-right">KIDS</th>
                  <th className="py-3 px-4 text-right">BRANCH</th>
                  <th className="py-3 px-4 text-right">TOTAL</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f7f2ed]">
                {rows.map((r, i) => (
                  <tr key={i} className="hover:bg-[#fdfbfa] transition-colors">
                    <td className="py-3 px-4 font-medium text-[#2a2220]">
                      {r.head}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#332c28]">
                      {inr(r.mens)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#332c28]">
                      {inr(r.womens)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#332c28]">
                      {inr(r.kids)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#332c28]">
                      {inr(r.branch)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono font-medium text-[#2a2220]">
                      {inr(r.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-[#e8dfd8] bg-[#fdfbf9] font-semibold text-[#2a2220]">
                  <td className="py-3 px-4 font-semibold text-[#2a2220]">Total</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totalRow.mens)}</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totalRow.womens)}</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totalRow.kids)}</td>
                  <td className="py-3 px-4 text-right font-mono">{inr(totalRow.branch)}</td>
                  <td className="py-3 px-4 text-right font-mono font-bold">{inr(totalRow.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Right: Add branch expense */}
        <div className="lg:col-span-4 bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
          <h3
            className="text-base font-serif font-semibold text-[#2a2220]"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            Add branch expense
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                DATE *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full border border-[#ded5ce] rounded px-2.5 py-1.5 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
                AMOUNT *
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="₹"
                className="w-full border border-[#ded5ce] rounded px-2.5 py-1.5 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              HEAD *
            </label>
            <select
              value={head}
              onChange={(e) => setHead(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="Rent">Rent</option>
              <option value="Salaries">Salaries</option>
              <option value="Electricity">Electricity</option>
              <option value="Packing, porter, tea">Packing, porter, tea</option>
              <option value="Repairs & Maintenance">Repairs & Maintenance</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              CHARGE TO
            </label>
            <select
              value={chargeTo}
              onChange={(e) => setChargeTo(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="Split by floor area (33/43/24)">
                Split by floor area (33/43/24)
              </option>
              <option value="Direct to Men's Wear">Direct to Men's Wear</option>
              <option value="Direct to Women's Wear">Direct to Women's Wear</option>
              <option value="Direct to Kids Wear">Direct to Kids Wear</option>
              <option value="Branch general">Branch general</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              PAID FROM
            </label>
            <select
              value={paidFrom}
              onChange={(e) => setPaidFrom(e.target.value)}
              className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
            >
              <option value="Branch bank">Branch bank</option>
              <option value="Petty cash drawer">Petty cash drawer</option>
              <option value="Owner personal">Owner personal</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold text-[#736862] tracking-wider uppercase mb-1">
              BILL
            </label>
            <label className="flex flex-col items-center justify-center border-2 border-dashed border-[#ded5ce] rounded p-3 cursor-pointer hover:bg-[#faf7f4] transition text-center">
              <Upload className="w-4 h-4 text-[#736862] mb-1" />
              <span className="text-xs text-[#736862]">
                {billFile ? billFile.name : 'Upload'}
              </span>
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files?.[0]) {
                    setBillFile(e.target.files[0]);
                    toast.success(`Attached ${e.target.files[0].name}`);
                  }
                }}
              />
            </label>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveExpense}
              disabled={addExpenseMutation.isPending}
              className="w-full bg-[#7a2222] hover:bg-[#681c1c] text-white text-xs font-semibold py-2.5 rounded tracking-wider uppercase transition shadow-sm disabled:opacity-50"
            >
              {addExpenseMutation.isPending ? 'SAVING...' : 'SAVE'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

