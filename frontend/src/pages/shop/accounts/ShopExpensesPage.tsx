import {useState} from 'react';
import {
  useShopExpensesQuery,
  useCreateShopExpenseMutation,
} from '@/lib/react-query/queriesAndMutations/expenses';
import {uploadPhoto} from '@/lib/api/upload';
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

const PAID_BY_OPTIONS = ['Cash from counter', 'UPI', 'Bank'];

/** Local date as YYYY-MM-DD (not UTC, so late-evening entries keep today's date) */
const todayISO = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function ShopExpensesPage({
  panel = 'shop-admin',
}: ShopExpensesPageProps) {
  const [selectedMonth, setSelectedMonth] = useState(() =>
    todayISO().slice(0, 7),
  );
  const [selectedHead, setSelectedHead] = useState('All heads');

  const {data, isLoading} = useShopExpensesQuery(panel, {
    month: selectedMonth,
    head: selectedHead,
  });

  const createExpenseMutation = useCreateShopExpenseMutation(panel);

  // Add Expense form states
  const [date, setDate] = useState(todayISO);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [amount, setAmount] = useState<string>('');
  const [head, setHead] = useState('Tea & refreshment');
  const [description, setDescription] = useState('');
  const [paidBy, setPaidBy] = useState('Cash from counter');
  const [gstAmount, setGstAmount] = useState<string>('');
  const [billFile, setBillFile] = useState<File | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Zeros until the real figures load
  const metrics = data?.metrics || {
    thisMonth: 0,
    thisMonthSub: '',
    paidInCash: 0,
    cashEntriesCount: 0,
    cashEntriesSub: '',
    today: 0,
    todayEntriesCount: 0,
    todayEntriesSub: '',
  };

  const nextExpenseNumber = data?.nextExpenseNumber || '…';
  const expensesList = data?.expenses || [];

  const handleSaveExpense = async () => {
    const amt = parseFloat(amount);
    const next: Record<string, string> = {};
    if (isNaN(amt) || amt <= 0) next.amount = 'Enter an amount more than 0';
    if (!description.trim()) next.description = 'Description is required';
    setErrors(next);
    if (Object.keys(next).length) return;

    setIsSaving(true);
    try {
      // Upload first; a failed upload stops the save
      const photoUrl = billFile ? await uploadPhoto(billFile) : null;
      await createExpenseMutation.mutateAsync({
        date,
        amount: amt,
        head,
        description: description.trim(),
        paidBy,
        gstAmount: gstAmount ? parseFloat(gstAmount) : 0,
        photoUrl,
      });

      toast.success('Expense recorded successfully');
      setAmount('');
      setDescription('');
      setGstAmount('');
      setBillFile(null);
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          'Failed to record expense',
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (expensesList.length === 0) {
      toast.error('No expenses to export');
      return;
    }

    const headers = [
      'NO.',
      'DATE',
      'HEAD',
      'DESCRIPTION',
      'PAID BY',
      'AMOUNT',
      'GST',
    ];
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
    <div className="space-y-4 text-espresso">
      {/* Top Header */}
      <div>
        <div className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
          ACCOUNTS / EXPENSES
        </div>
        <h1 className="font-serif text-headline-lg-mobile font-normal text-burgundy md:text-headline-md">
          Expenses
        </h1>
        <p className="mt-1 text-sm text-on-surface-variant">
          Shop running costs. Cash expenses reduce the drawer balance in the
          cash book.
        </p>
      </div>

      {/* 3 Summary Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {/* THIS MONTH */}
        <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            THIS MONTH
          </div>
          <div
            className="mt-1 font-serif text-3xl text-espresso"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(metrics.thisMonth)}
          </div>
          <div className="mt-1 font-sans text-xs text-on-surface-variant">
            {metrics.thisMonthSub}
          </div>
        </div>

        {/* PAID IN CASH */}
        <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            PAID IN CASH
          </div>
          <div
            className="mt-1 font-serif text-3xl text-espresso"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(metrics.paidInCash)}
          </div>
          <div className="mt-1 font-sans text-xs text-on-surface-variant">
            {metrics.cashEntriesSub}
          </div>
        </div>

        {/* TODAY */}
        <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
            TODAY
          </div>
          <div
            className="mt-1 font-serif text-3xl text-espresso"
            style={{fontFamily: "'Playfair Display', Georgia, serif"}}
          >
            {inr(metrics.today)}
          </div>
          <div className="mt-1 font-sans text-xs text-on-surface-variant">
            {metrics.todayEntriesSub}
          </div>
        </div>
      </div>

      {/* Main Grid: Left (Table + Filters), Right (Add Expense Form) */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
        {/* Left Column (8 cols): Filters & Table */}
        <div className="space-y-4 rounded-lg border border-ivory-300 bg-white p-5 shadow-sm lg:col-span-8">
          {/* Controls / Filter Bar */}
          <div className="flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
            <div className="flex items-center gap-3">
              {/* Month Picker */}
              <div className="relative inline-flex items-center">
                <input
                  type="month"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="rounded border border-ivory-300 bg-white px-3 py-1.5 text-xs font-medium text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy"
                />
              </div>

              {/* Head Dropdown */}
              <div className="relative">
                <select
                  value={selectedHead}
                  onChange={(e) => setSelectedHead(e.target.value)}
                  className="cursor-pointer appearance-none rounded border border-ivory-300 bg-white py-1.5 pl-3 pr-8 text-xs font-medium text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy"
                >
                  {EXPENSE_HEADS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
              </div>
            </div>

            {/* Export Button */}
            <button
              onClick={handleExport}
              className="flex items-center justify-center gap-1.5 rounded border border-burgundy px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-burgundy transition hover:bg-burgundy/5"
            >
              EXPORT
            </button>
          </div>

          {/* Table */}
          <div className="overflow-x-auto border-t border-[#f0ece8]">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-ivory-300 text-[11px] uppercase tracking-wider text-on-surface-variant">
                  <th className="px-3 py-3 font-semibold">DATE</th>
                  <th className="px-3 py-3 font-semibold">NO.</th>
                  <th className="px-3 py-3 font-semibold">HEAD</th>
                  <th className="px-3 py-3 font-semibold">DESCRIPTION</th>
                  <th className="px-3 py-3 font-semibold">PAID BY</th>
                  <th className="px-3 py-3 text-right font-semibold">AMOUNT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f7f4f0]">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-xs text-on-surface-variant"
                    >
                      Loading expenses...
                    </td>
                  </tr>
                ) : expensesList.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-xs text-on-surface-variant"
                    >
                      No expenses recorded for this month.
                    </td>
                  </tr>
                ) : (
                  expensesList.map((row) => (
                    <tr
                      key={row.id}
                      className="transition-colors hover:bg-ivory-50"
                    >
                      <td className="whitespace-nowrap px-3 py-3 font-medium text-espresso">
                        {row.date}
                      </td>
                      <td className="font-mono whitespace-nowrap px-3 py-3 text-[11px] text-on-surface-variant">
                        {row.expenseNumber}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-[#eef2eb] px-2.5 py-0.5 text-[11px] font-semibold tracking-wide text-[#3b5936]">
                          <span className="h-1.5 w-1.5 rounded-full bg-[#4a7c46]" />
                          {row.head}
                        </span>
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-xs font-medium text-espresso">
                          {row.description}
                        </div>
                        <div className="mt-0.5 font-sans text-[11px] text-on-surface-variant">
                          {row.loggedBy}
                        </div>
                        {/* Older rows hold only a file name, not a link */}
                        {row.photoUrl && /^https?:\/\//.test(row.photoUrl) && (
                          <a
                            href={row.photoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[11px] font-semibold text-burgundy hover:underline"
                          >
                            View bill
                          </a>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-[#524944]">
                        {row.paidBy}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-right font-serif text-sm font-medium text-espresso">
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
        <div className="space-y-4 rounded-lg border border-ivory-300 bg-white p-5 shadow-sm lg:col-span-4">
          <div className="flex items-center justify-between border-b border-[#f0ece8] pb-2">
            <h2
              className="font-serif text-lg text-espresso"
              style={{fontFamily: "'Playfair Display', Georgia, serif"}}
            >
              Add expense
            </h2>
            <span className="font-mono text-[11px] tracking-wider text-on-surface-variant">
              {nextExpenseNumber}
            </span>
          </div>

          {/* Form Fields */}
          <div className="space-y-3.5 text-xs">
            {/* DATE & AMOUNT */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  DATE *
                </label>
                <div className="relative">
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded border border-ivory-300 bg-white px-2.5 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                  AMOUNT (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="₹"
                  aria-invalid={!!errors.amount}
                  className={`w-full border ${errors.amount ? 'border-error' : 'border-ivory-300'} rounded bg-white px-2.5 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy`}
                />
                {errors.amount && (
                  <p className="field-error">{errors.amount}</p>
                )}
              </div>
            </div>

            {/* EXPENSE HEAD */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                EXPENSE HEAD *
              </label>
              <div className="relative">
                <select
                  value={head}
                  onChange={(e) => setHead(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded border border-ivory-300 bg-white px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy"
                >
                  {FORM_HEADS.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
              </div>
            </div>

            {/* DESCRIPTION */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                DESCRIPTION *
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="e.g. Tea and snacks for staff"
                aria-invalid={!!errors.description}
                className={`w-full border ${errors.description ? 'border-error' : 'border-ivory-300'} rounded bg-white px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy`}
              />
              {errors.description && (
                <p className="field-error">{errors.description}</p>
              )}
            </div>

            {/* PAID BY */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                PAID BY *
              </label>
              <div className="relative">
                <select
                  value={paidBy}
                  onChange={(e) => setPaidBy(e.target.value)}
                  className="w-full cursor-pointer appearance-none rounded border border-ivory-300 bg-white px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy"
                >
                  {PAID_BY_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-on-surface-variant" />
              </div>
            </div>

            {/* GST ON BILL */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                GST ON BILL (₹)
              </label>
              <input
                type="number"
                min="0"
                step="any"
                value={gstAmount}
                onChange={(e) => setGstAmount(e.target.value)}
                placeholder="If vendor charged GST"
                className="w-full rounded border border-ivory-300 bg-white px-3 py-2 text-xs text-espresso focus:outline-none focus:ring-1 focus:ring-burgundy"
              />
            </div>

            {/* BILL PHOTO */}
            <div>
              <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-on-surface-variant">
                BILL PHOTO
              </label>
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-ivory-300 bg-[#fdfcfb] p-5 text-center transition hover:bg-ivory-50">
                <Upload className="mb-1 h-4 w-4 text-on-surface-variant" />
                <span className="text-xs font-medium text-on-surface-variant">
                  {billFile ? billFile.name : 'Upload'}
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
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
                disabled={isSaving}
                className="w-full rounded bg-burgundy py-3 text-xs font-semibold uppercase tracking-wider text-white shadow-sm transition hover:bg-[#681c2a] disabled:opacity-50"
              >
                {isSaving ? 'RECORDING...' : 'SAVE EXPENSE'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
