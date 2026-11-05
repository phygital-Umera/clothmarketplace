import {useState} from 'react';
import {
  useShopExpensesQuery,
  useCreateShopExpenseMutation,
} from '@/lib/react-query/queriesAndMutations/expenses';
import {Upload, Calendar, ChevronDown, Check} from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n?: number | null) =>
  n === undefined || n === null || n === 0
    ? '—'
    : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

interface ShopExpensesPageProps {
  panel?: string;
}

const EXPENSE_HEADS = [
  'All heads',
  'Porter / Transport',
  'Tea & refreshment',
  'Packing material',
  'Rent',
  'Salary',
  'Electricity',
  'Repairs & maintenance',
  'Stationery',
  'Other',
];

const FORM_HEADS = [
  'Tea & refreshment',
  'Porter / Transport',
  'Packing material',
  'Rent',
  'Salary',
  'Electricity',
  'Repairs & maintenance',
  'Stationery',
  'Other',
];

const PAID_BY_OPTIONS = [
  'Cash from counter',
  'UPI',
  'Bank',
];

export default function ShopExpensesPage({panel = 'shop-admin'}: ShopExpensesPageProps) {
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [selectedHead, setSelectedHead] = useState('All heads');

  const {data, isLoading} = useShopExpensesQuery(panel, {
    month: selectedMonth,
    head: selectedHead,
  });

  const createExpenseMutation = useCreateShopExpenseMutation(panel);

  // Add Expense form states
  const [date, setDate] = useState('2026-11-03');
  const [amount, setAmount] = useState<string>('');
  const [head, setHead] = useState('Tea & refreshment');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState('Cash from counter');
  const [gstAmount, setGstAmount] = useState<string>('');
  const [billFile, setBillFile] = useState<File | null>(null);

  const metrics = data?.metrics || {
    thisMonth: 36950,
    thisMonthSub: 'Rent, salary, electricity...',
    paidInCash: 450,
    cashEntriesCount: 3,
    cashEntriesSub: '3 entries from counter',
    today: 250,
    todayEntriesCount: 2,
    todayEntriesSub: '2 entries',
  };

  const nextExpenseNumber = data?.nextExpenseNumber || 'EX/26-27/0063';
  const expensesList = data?.expenses || [];

  const handleSaveExpense = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error('Please enter a valid expense amount');
      return;
    }
    if (!description.trim()) {
      toast.error('Please enter a description for the expense');
      return;
    }

    try {
      await createExpenseMutation.mutateAsync({
        date,
        amount: amt,
        head,
        description: description.trim(),
        paidBy,
        gstAmount: gstAmount ? parseFloat(gstAmount) : 0,
        photoUrl: billFile ? billFile.name : null,
      });

      toast.success('Expense recorded successfully');
      setAmount('');
      setDescription('');
      setGstAmount('');
      setBillFile(null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to record expense');
    }
  };

  const handleExport = () => {
    if (expensesList.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const headers = ['NO.', 'DATE', 'HEAD', 'DESCRIPTION', 'PAID BY', 'AMOUNT', 'GST'];
    const rows = expensesList.map((e) => [
      e.expenseNumber,
      e.date,
      e.head,
      `"${e.description.replace(/"/g, '""')}"`,
      e.paidBy,
      e.amount,
      e.gstAmount || 0,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Expenses_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success('Expenses exported successfully');
  };

  return (
    <div className="p-6 md:p-8 space-y-6 max-w-[1400px] mx-auto text-[#2b2b2b]">
      {/* Top Header */}
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
          Shop running costs. Cash expenses reduce the drawer balance in the cash book.
        </p>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* THIS MONTH */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            THIS MONTH
          </div>
          <div
            className="text-3xl font-serif text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(metrics.thisMonth)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {metrics.thisMonthSub}
          </div>
        </div>

        {/* PAID IN CASH */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            PAID IN CASH
          </div>
          <div
            className="text-3xl font-serif text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(metrics.paidInCash)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {metrics.cashEntriesSub}
          </div>
        </div>

        {/* TODAY */}
        <div className="bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm">
          <div className="text-[11px] font-semibold tracking-wider uppercase text-[#8b6f66]">
            TODAY
          </div>
          <div
            className="text-3xl font-serif text-[#2a2220] mt-1"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(metrics.today)}
          </div>
          <div className="text-xs text-[#736862] mt-1 font-sans">
            {metrics.todayEntriesSub}
          </div>
        </div>
      </div>

      {/* Main Grid: Left (Table + Filters), Right (Add Expense Form) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (8 cols): Filters & Table */}
        <div className="lg:col-span-8 bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
          {/* Controls / Filter Bar */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              {/* Month Picker */}
              <div className="relative inline-flex items-center">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="border border-[#ded5ce] rounded px-3 py-1.5 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729] font-medium"
                />
              </div>

              {/* Head Dropdown */}
              <div className="relative">
                <select
                  value={selectedHead}
                  onChange={(e) => setSelectedHead(e.target.value)}
                  className="appearance-none border border-[#ded5ce] rounded pl-3 pr-8 py-1.5 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729] font-medium cursor-pointer"
                >
                  {EXPENSE_HEADS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#736862] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="border border-[#832729] text-[#832729] px-4 py-1.5 rounded text-xs font-semibold tracking-wider uppercase hover:bg-[#832729]/5 transition flex items-center justify-center gap-1.5"
            >
              EXPORT
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-t border-[#f0ece8]">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#efe9e3] text-[#8b6f66] uppercase text-[11px] tracking-wider">
                  <th className="py-3 px-3 font-semibold">DATE</th>
                  <th className="py-3 px-3 font-semibold">NO.</th>
                  <th className="py-3 px-3 font-semibold">HEAD</th>
                  <th className="py-3 px-3 font-semibold">DESCRIPTION</th>
                  <th className="py-3 px-3 font-semibold">PAID BY</th>
                  <th className="py-3 px-3 font-semibold text-right">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f7f4f0]">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#736862]">
                      Loading expenses...
                    </td>
                  </tr>
                ) : expensesList.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-xs text-[#736862]">
                      No expenses recorded for this month.
                    </td>
                  </tr>
                ) : (
                  expensesList.map((row) => (
                    <tr key={row.id} className="hover:bg-[#faf7f4] transition-colors">
                      <td className="py-3 px-3 text-[#2a2220] font-medium whitespace-nowrap">
                        {row.date}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-[#736862] whitespace-nowrap">
                        {row.expenseNumber}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#eef2eb] text-[#3b5936] tracking-wide">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#4a7c46]" />
                          {row.head}
                        </span>
                      </td>
                      <td className="py-3 px-3">
                        <div className="text-[#2a2220] font-medium text-xs">
                          {row.description}
                        </div>
                        <div className="text-[11px] text-[#8b6f66] mt-0.5 font-sans">
                          {row.loggedBy}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#524944] whitespace-nowrap">
                        {row.paidBy}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-[#2a2220] whitespace-nowrap font-serif text-sm">
                        {inr(row.amount)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column (4 cols): Add Expense Form */}
        <div className="lg:col-span-4 bg-white border border-[#efe9e3] rounded-lg p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[#f0ece8]">
            <h2
              className="text-lg font-serif text-[#2a2220]"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              Add expense
            </h2>
            <span className="font-mono text-[11px] text-[#736862] tracking-wider">
              {nextExpenseNumber}
            </span>
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5 text-xs">
            {/* DATE & AMOUNT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                  DATE *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full border border-[#ded5ce] rounded px-2.5 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                  AMOUNT (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="₹"
                  className="w-full border border-[#ded5ce] rounded px-2.5 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
                />
              </div>
            </div>

            {/* EXPENSE HEAD */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                EXPENSE HEAD *
              </label>
              <div className="relative">
                <select
                  value={head}
                  onChange={(e) => setHead(e.target.value)}
                  className="w-full appearance-none border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729] cursor-pointer"
                >
                  {FORM_HEADS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#736862] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                DESCRIPTION *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Tea and snacks for staff"
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            {/* PAID BY */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                PAID BY *
              </label>
              <div className="relative">
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full appearance-none border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729] cursor-pointer"
                >
                  {PAID_BY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-[#736862] absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* GST ON BILL */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                GST ON BILL (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={gstAmount}
                onChange={(e) => setGstAmount(e.target.value)}
                placeholder="If vendor charged GST"
                className="w-full border border-[#ded5ce] rounded px-3 py-2 text-xs text-[#2a2220] bg-white focus:outline-none focus:ring-1 focus:ring-[#832729]"
              />
            </div>

            {/* BILL PHOTO */}
            <div>
              <label className="block text-[11px] font-semibold tracking-wider uppercase text-[#736862] mb-1">
                BILL PHOTO
              </label>
              <label className="flex flex-col items-center justify-center border border-dashed border-[#ded5ce] rounded-lg p-5 cursor-pointer hover:bg-[#faf7f4] transition text-center bg-[#fdfcfb]">
                <Upload className="w-4 h-4 text-[#736862] mb-1" />
                <span className="text-xs text-[#736862] font-medium">
                  {billFile ? billFile.name : 'Upload'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setBillFile(e.target.files[0]);
                      toast.success(`Attached ${e.target.files[0].name}`);
                    }
                  }}
                />
              </label>
            </div>

            {/* Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveExpense}
                disabled={createExpenseMutation.isPending}
                className="w-full bg-[#7a2232] hover:bg-[#681c2a] text-white text-xs font-semibold py-3 rounded tracking-wider uppercase transition shadow-sm disabled:opacity-50"
              >
                {createExpenseMutation.isPending ? 'RECORDING...' : 'SAVE EXPENSE'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

