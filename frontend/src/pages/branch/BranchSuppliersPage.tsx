import {useState} from 'react';
import {
  useSuppliers,
  useSupplierSummary,
  useRecordSupplierPayment,
} from '@/lib/react-query/queriesAndMutations/supplierPayment';
import {SupplierProfile} from '@/lib/api/supplierPayment';
import {Plus, CheckCircle2} from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n?: number | null) =>
  n === undefined || n === null
    ? '—'
    : `₹${Number(n).toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

export default function BranchSuppliersPage() {
  const {data: summary} = useSupplierSummary();
  const {data, isLoading, refetch} = useSuppliers();
  const recordPaymentMutation = useRecordSupplierPayment();

  const suppliers = data?.items || [];

  const [selectedSupplier, setSelectedSupplier] = useState<SupplierProfile | null>(null);

  const activeSupplier =
    selectedSupplier ||
    suppliers.find((s) => s.isOverdue) ||
    suppliers[0] ||
    null;

  // Payment form states
  const [payAmount, setPayAmount] = useState<number | string>(
    activeSupplier?.payable || 17640,
  );
  const [payDate, setPayDate] = useState('2026-11-03');
  const [payMode, setPayMode] = useState('NEFT from branch bank (HDFC **4417)');
  const [utrNo, setUtrNo] = useState('');
  const [tds, setTds] = useState(0);

  const handleSelect = (s: SupplierProfile) => {
    setSelectedSupplier(s);
    setPayAmount(s.payable > 0 ? s.payable : 0);
  };

  const handleMakePayment = async () => {
    if (!activeSupplier) return;
    const amountNum = Number(payAmount);
    if (!amountNum || amountNum <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    await recordPaymentMutation.mutateAsync({
      supplierName: activeSupplier.name,
      amount: amountNum,
      date: payDate,
      paymentMode: payMode,
      utrChequeNo: utrNo || undefined,
      tdsDeducted: tds || 0,
    });
    refetch();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-caps uppercase text-outline tracking-wider">
            Purchase / Suppliers
          </p>
          <h1 className="font-serif text-headline-md font-normal text-burgundy-deep">
            Suppliers & payments
          </h1>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            What the branch and its shops owe each supplier. Payments above ₹25,000 are made by the branch.
          </p>
        </div>

        <button
          type="button"
          onClick={() => toast('Add supplier dialog opened', {icon: '🏢'})}
          className="btn-primary flex items-center gap-1.5 bg-burgundy hover:bg-burgundy-deep text-white shadow-sm self-start"
        >
          <Plus size={16} />
          <span>ADD SUPPLIER</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
          <p className="text-label-caps uppercase text-outline">Total Payable</p>
          <p className="mt-1 font-serif text-headline-sm font-semibold text-burgundy-deep">
            {inr(summary?.totalPayable ?? 84790)}
          </p>
          <p className="mt-0.5 text-technical-data text-on-surface-variant">
            {summary?.suppliersCount ?? 5} suppliers
          </p>
        </div>

        <div className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
          <p className="text-label-caps uppercase text-outline">Overdue</p>
          <p className="mt-1 font-serif text-headline-sm font-semibold text-error">
            {inr(summary?.overdueAmount ?? 17640)}
          </p>
          <p className="mt-0.5 text-technical-data text-error font-medium">Tiruppur Knits</p>
        </div>

        <div className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
          <p className="text-label-caps uppercase text-outline">Due in 15 Days</p>
          <p className="mt-1 font-serif text-headline-sm font-semibold text-espresso">
            {inr(summary?.dueIn15Days ?? 20950)}
          </p>
          <p className="mt-0.5 text-technical-data text-on-surface-variant">2 bills</p>
        </div>

        <div className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
          <p className="text-label-caps uppercase text-outline">Paid This Month</p>
          <p className="mt-1 font-serif text-headline-sm font-semibold text-espresso">
            {inr(summary?.paidThisMonth ?? 79950)}
          </p>
          <p className="mt-0.5 text-technical-data text-on-surface-variant">
            {summary?.paymentsCount ?? 3} payments
          </p>
        </div>
      </div>

      {/* Main Grid: Suppliers Table (2 cols) & Make Payment Panel (1 col) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Suppliers Table */}
        <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm lg:col-span-2 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-body-sm">
              <thead>
                <tr className="border-b border-ivory-300 text-label-caps uppercase text-outline">
                  <th className="py-2.5 pl-3 pr-2 font-medium">Supplier</th>
                  <th className="px-2 py-2.5 font-medium">GSTIN / State</th>
                  <th className="px-2 py-2.5 font-medium">Owed By</th>
                  <th className="px-2 py-2.5 text-center font-medium">Bills Open</th>
                  <th className="px-2 py-2.5 text-right font-medium">Payable</th>
                  <th className="py-2.5 pl-2 pr-3 text-right font-medium">Next Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-on-surface-variant">
                      Loading suppliers...
                    </td>
                  </tr>
                ) : (
                  suppliers.map((s) => {
                    const isSelected = activeSupplier?.id === s.id;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => handleSelect(s)}
                        className={`cursor-pointer transition-colors hover:bg-ivory-50 ${
                          s.isOverdue
                            ? '!bg-[#FDF4F4]'
                            : isSelected
                            ? 'bg-ivory-50'
                            : ''
                        }`}
                      >
                        <td className="py-3 pl-3 pr-2">
                          <p className="font-serif font-medium text-espresso">{s.name}</p>
                          <p className="text-[11px] text-on-surface-variant">
                            {s.contactPerson} {s.phone ? `· ${s.phone}` : ''}
                          </p>
                        </td>
                        <td className="px-2 py-3 text-on-surface-variant">{s.gstinState}</td>
                        <td className="px-2 py-3 text-on-surface-variant">{s.owedBy}</td>
                        <td className="px-2 py-3 text-center text-espresso font-medium">
                          {s.billsOpen}
                        </td>
                        <td className="px-2 py-3 text-right font-serif font-semibold text-burgundy-deep">
                          {s.payable > 0 ? (
                            <span className={s.isOverdue ? 'text-error' : ''}>
                              {inr(s.payable)}
                            </span>
                          ) : (
                            <span className="text-on-surface-variant">₹0</span>
                          )}
                        </td>
                        <td className="py-3 pl-2 pr-3 text-right font-medium">
                          {s.isOverdue ? (
                            <span className="text-error">{s.nextDue}</span>
                          ) : (
                            <span className="text-on-surface-variant">{s.nextDue}</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Make Payment Drawer / Panel */}
        <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm space-y-4 h-fit">
          <div className="flex items-center justify-between border-b border-ivory-200 pb-2">
            <h3 className="font-serif text-title-lg font-normal text-burgundy-deep">
              Make payment
            </h3>
            <span className="text-[11px] font-mono text-on-surface-variant">BPY/26-27/0009</span>
          </div>

          <div className="space-y-4 text-body-sm">
            {/* Supplier select */}
            <div>
              <label className="block text-label-caps uppercase text-outline">
                Supplier <span className="text-error">*</span>
              </label>
              <select
                value={activeSupplier?.name}
                onChange={(e) => {
                  const found = suppliers.find((s) => s.name === e.target.value);
                  if (found) handleSelect(found);
                }}
                className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
              >
                {suppliers.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name} — {inr(s.payable)} {s.isOverdue ? '(overdue)' : ''}
                  </option>
                ))}
              </select>
            </div>

            {/* Against Bills */}
            <div>
              <label className="block text-label-caps uppercase text-outline">
                Against Bills
              </label>
              <select className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none">
                <option>
                  PB/26-27/0040 · {activeSupplier?.owedBy || "Women's Wear"} · {inr(activeSupplier?.payable || 17640)}
                </option>
              </select>
            </div>

            {/* Amount & Date */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-label-caps uppercase text-outline">
                  Amount <span className="text-error">*</span>
                </label>
                <input
                  type="number"
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-label-caps uppercase text-outline">
                  Date <span className="text-error">*</span>
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => setPayDate(e.target.value)}
                  className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>
            </div>

            {/* Mode */}
            <div>
              <label className="block text-label-caps uppercase text-outline">
                Mode <span className="text-error">*</span>
              </label>
              <select
                value={payMode}
                onChange={(e) => setPayMode(e.target.value)}
                className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
              >
                <option value="NEFT from branch bank (HDFC **4417)">
                  NEFT from branch bank (HDFC **4417)
                </option>
                <option value="UPI">UPI</option>
                <option value="Cheque">Cheque</option>
                <option value="Cash">Cash</option>
              </select>
            </div>

            {/* UTR / Cheque No */}
            <div>
              <label className="block text-label-caps uppercase text-outline">
                UTR / Cheque No.
              </label>
              <input
                type="text"
                value={utrNo}
                onChange={(e) => setUtrNo(e.target.value)}
                placeholder="e.g. HDFC261199320"
                className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
              />
            </div>

            {/* TDS Deducted */}
            <div>
              <label className="block text-label-caps uppercase text-outline">
                TDS Deducted
              </label>
              <input
                type="number"
                value={tds}
                onChange={(e) => setTds(Number(e.target.value) || 0)}
                className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-on-surface-variant">If applicable — ask your CA</p>
            </div>

            {/* Submit button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleMakePayment}
                disabled={recordPaymentMutation.isPending}
                className="btn-primary w-full bg-burgundy hover:bg-burgundy-deep text-white shadow-sm py-2.5"
              >
                SAVE PAYMENT & SEND RECEIPT
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

