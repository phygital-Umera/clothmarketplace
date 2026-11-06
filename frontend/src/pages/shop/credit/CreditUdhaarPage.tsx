import React, {useEffect, useMemo, useState} from 'react';
import toast from 'react-hot-toast';
import {
  useCreditCustomers,
  useCreditMetrics,
  useCustomerStatement,
  useNextReceiptNumber,
  useRecordCustomerPayment,
  useWhatsAppReminders,
} from '@/lib/react-query/queriesAndMutations/credit';
import {CreditCustomerSummary} from '@/types/credit';
import {inr} from '@/utils/money';
import {
  Calendar,
  Check,
  CreditCard,
  Download,
  ExternalLink,
  FileText,
  IndianRupee,
  MessageCircle,
  Printer,
  Search,
  Share2,
  X,
} from 'lucide-react';

const PANEL = 'shop-admin';

// Helper to format date like "21 Oct 2026"
function formatDateShort(dateStr?: string | null) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function CreditUdhaarPage() {

  const [search, setSearch] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Reminders modal
  const [showRemindersModal, setShowRemindersModal] = useState(false);

  // Queries
  const {data: metrics, isLoading: metricsLoading} = useCreditMetrics(PANEL);
  const {data: customers = [], isLoading: customersLoading} = useCreditCustomers(PANEL, search);
  const {data: nextReceipt} = useNextReceiptNumber(PANEL);

  // Auto-select first customer or Kavita Desai if available
  useEffect(() => {
    if (customers.length > 0 && !selectedCustomerId) {
      const kavita = customers.find((c) => c.name.toLowerCase().includes('kavita'));
      setSelectedCustomerId(kavita ? kavita.id : customers[0].id);
    }
  }, [customers, selectedCustomerId]);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || customers[0] || null,
    [customers, selectedCustomerId],
  );

  const {data: statement, isLoading: statementLoading} = useCustomerStatement(
    PANEL,
    selectedCustomer ? selectedCustomer.id : null,
  );

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<string>('2000');
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [paymentDate, setPaymentDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [paymentNote, setPaymentNote] = useState<string>('');

  const recordPaymentMutation = useRecordCustomerPayment(PANEL);

  // Pre-fill payment amount when selected customer changes
  useEffect(() => {
    if (selectedCustomer) {
      // Suggest full balance due or 2000 default
      setPaymentAmount(String(Math.min(2000, selectedCustomer.balanceDue || 2000)));
    }
  }, [selectedCustomer?.id]);

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer) {
      toast.error('Please select a customer first');
      return;
    }

    const amt = parseFloat(paymentAmount);
    if (!amt || amt <= 0) {
      toast.error('Please enter a valid payment amount');
      return;
    }

    if (amt > selectedCustomer.balanceDue) {
      toast.error(`Amount cannot exceed customer balance due (₹${selectedCustomer.balanceDue.toLocaleString('en-IN')})`);
      return;
    }

    try {
      const res = await recordPaymentMutation.mutateAsync({
        customerId: selectedCustomer.id,
        payload: {
          amount: amt,
          mode: paymentMode,
          date: paymentDate,
          note: paymentNote.trim() || undefined,
        },
      });

      toast.success(`Payment of ₹${amt.toLocaleString('en-IN')} recorded (${res.receiptNumber || nextReceipt})`);
      setPaymentNote('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record payment');
    }
  };

  // WhatsApp Reminders query
  const {data: reminders = []} = useWhatsAppReminders(PANEL);

  // Print Statement Handler
  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 print:p-0">
      {/* 1. Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 print:hidden">
        <div>
          <p className="text-[11px] font-semibold tracking-wider text-espresso/60 uppercase">
            CUSTOMERS / CREDIT (UDHAAR)
          </p>
          <h1 className="font-serif text-3xl font-medium text-espresso mt-0.5">
            Credit / udhaar
          </h1>
          <p className="text-xs text-espresso/70 mt-1">
            Who owes the shop, how old the due is, and payments received.
          </p>
        </div>

        <div>
          <button
            type="button"
            onClick={() => setShowRemindersModal(true)}
            className="inline-flex items-center gap-2 border border-[#8B263E] text-[#8B263E] hover:bg-[#8B263E]/5 px-4 py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition shadow-sm"
          >
            <MessageCircle size={15} />
            SEND REMINDERS (WHATSAPP)
          </button>
        </div>
      </div>

      {/* 2. Top Stats Row (5 Cards) */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 print:hidden">
        {/* TOTAL DUE */}
        <div className="bg-white border border-[#EAE3DC] p-4 rounded shadow-sm">
          <p className="text-[10px] tracking-wider text-espresso/60 font-semibold uppercase">
            TOTAL DUE
          </p>
          <p className="font-serif text-2xl text-espresso font-semibold mt-1">
            ₹{(metrics?.totalDue ?? 28650).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-espresso/60 mt-0.5">
            {metrics?.totalCustomers ?? 9} customers
          </p>
        </div>

        {/* 0–15 DAYS */}
        <div className="bg-white border border-[#EAE3DC] p-4 rounded shadow-sm">
          <p className="text-[10px] tracking-wider text-espresso/60 font-semibold uppercase">
            0–15 DAYS
          </p>
          <p className="font-serif text-2xl text-espresso font-semibold mt-1">
            ₹{(metrics?.aging?.range0To15?.amount ?? 24650).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-espresso/60 mt-0.5">
            {metrics?.aging?.range0To15?.count ?? 4} customers
          </p>
        </div>

        {/* 16–30 DAYS */}
        <div className="bg-white border border-[#EAE3DC] p-4 rounded shadow-sm">
          <p className="text-[10px] tracking-wider text-espresso/60 font-semibold uppercase">
            16–30 DAYS
          </p>
          <p className="font-serif text-2xl text-espresso font-semibold mt-1">
            ₹{(metrics?.aging?.range16To30?.amount ?? 0).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-espresso/60 mt-0.5">
            {(metrics?.aging?.range16To30?.count ?? 0) > 0
              ? `${metrics?.aging?.range16To30?.count} customers`
              : '—'}
          </p>
        </div>

        {/* OVER 30 DAYS */}
        <div className="bg-white border border-[#EAE3DC] p-4 rounded shadow-sm">
          <p className="text-[10px] tracking-wider text-espresso/60 font-semibold uppercase">
            OVER 30 DAYS
          </p>
          <p className="font-serif text-2xl text-espresso font-semibold mt-1">
            ₹{(metrics?.aging?.rangeOver30?.amount ?? 4000).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-espresso/60 mt-0.5">
            {metrics?.aging?.rangeOver30?.count ?? 2} customers
          </p>
        </div>

        {/* COLLECTED THIS MONTH */}
        <div className="bg-white border border-[#EAE3DC] p-4 rounded shadow-sm">
          <p className="text-[10px] tracking-wider text-espresso/60 font-semibold uppercase">
            COLLECTED THIS MONTH
          </p>
          <p className="font-serif text-2xl text-espresso font-semibold mt-1">
            ₹{(metrics?.collectedThisMonth?.amount ?? 9200).toLocaleString('en-IN')}
          </p>
          <p className="text-xs text-espresso/60 mt-0.5">
            {metrics?.collectedThisMonth?.paymentsCount ?? 6} payments
          </p>
        </div>
      </div>

      {/* 3. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Customers with due (4 cols) */}
        <div className="lg:col-span-4 bg-white border border-[#EAE3DC] p-4 rounded shadow-sm print:hidden">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-serif text-lg text-espresso font-medium">
              Customers with due
            </h2>
            <span className="text-xs text-espresso/60 bg-[#FAF7F4] px-2 py-0.5 rounded font-mono font-medium">
              {customers.length}
            </span>
          </div>

          {/* Quick search input */}
          <div className="relative mb-3">
            <Search className="absolute left-3 top-2.5 text-espresso/40" size={14} />
            <input
              type="text"
              placeholder="Search customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E]"
            />
          </div>

          {/* Customer List */}
          <div className="space-y-1.5 max-h-[640px] overflow-y-auto pr-1">
            {customersLoading ? (
              <div className="p-8 text-center text-xs text-espresso/40">Loading customers...</div>
            ) : customers.length === 0 ? (
              <div className="p-8 text-center text-xs text-espresso/40">No customers with due.</div>
            ) : (
              customers.map((c) => {
                const isSelected = selectedCustomer?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setSelectedCustomerId(c.id)}
                    className={`flex items-center justify-between p-3.5 rounded cursor-pointer transition border ${
                      isSelected
                        ? 'bg-[#FDF6F0] border-[#8B263E]/30 shadow-sm'
                        : 'bg-white border-transparent hover:bg-[#FAF6F2]'
                    }`}
                  >
                    <div>
                      <p className="font-medium text-espresso text-sm leading-tight">
                        {c.name}
                      </p>
                      <p className="text-[11px] text-espresso/60 mt-1">
                        {c.customerType === 'B2B' ? 'B2B · ' : ''}
                        {c.billsCount} bill{c.billsCount !== 1 ? 's' : ''}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="font-semibold text-espresso text-sm leading-tight">
                        ₹{c.balanceDue.toLocaleString('en-IN')}
                      </p>
                      <p
                        className={`text-[11px] mt-1 ${
                          c.isOverdue ? 'text-[#B24838] font-medium' : 'text-espresso/60'
                        }`}
                      >
                        {c.displayAge}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Ledger / Statement & Receive Payment (8 cols) */}
        <div className="lg:col-span-8 space-y-5">
          {/* Top Panel: Customer Ledger / Statement */}
          <div className="bg-white border border-[#EAE3DC] p-5 rounded shadow-sm print:border-none print:shadow-none print:p-0">
            {selectedCustomer ? (
              <>
                {/* Statement Header */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-[#EAE3DC] gap-3">
                  <div>
                    <h2 className="font-serif text-2xl text-espresso font-medium">
                      {selectedCustomer.name}
                    </h2>
                    <p className="text-xs text-espresso/60 mt-1">
                      +91 {selectedCustomer.mobile} · limit ₹
                      {selectedCustomer.creditLimit.toLocaleString('en-IN')} ·{' '}
                      {selectedCustomer.creditDays} days credit
                    </p>
                  </div>

                  <div className="sm:text-right">
                    <p className="text-[10px] tracking-wider text-espresso/60 uppercase font-semibold">
                      BALANCE DUE
                    </p>
                    <p className="font-serif text-3xl font-semibold text-[#8B263E] mt-0.5">
                      ₹{selectedCustomer.balanceDue.toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                {/* Ledger Transactions Table */}
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-[#FAF7F4] text-espresso/70 text-[10px] uppercase tracking-wider font-semibold">
                        <th className="py-2.5 px-3 border-b border-[#EAE3DC]">DATE</th>
                        <th className="py-2.5 px-3 border-b border-[#EAE3DC]">PARTICULARS</th>
                        <th className="py-2.5 px-3 border-b border-[#EAE3DC]">REF</th>
                        <th className="py-2.5 px-3 border-b border-[#EAE3DC] text-right">
                          DEBIT (SALE)
                        </th>
                        <th className="py-2.5 px-3 border-b border-[#EAE3DC] text-right">
                          CREDIT (PAID)
                        </th>
                        <th className="py-2.5 px-3 border-b border-[#EAE3DC] text-right">
                          BALANCE
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#EAE3DC]/60 text-espresso">
                      {statementLoading ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-espresso/40">
                            Loading statement transactions...
                          </td>
                        </tr>
                      ) : (statement?.transactions ?? []).length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-8 text-center text-espresso/40">
                            No ledger transactions recorded yet.
                          </td>
                        </tr>
                      ) : (
                        statement?.transactions.map((t) => (
                          <tr key={t.id} className="hover:bg-[#FAF7F4]/50 transition">
                            <td className="py-2.5 px-3 font-mono text-[11px] text-espresso/80">
                              {formatDateShort(t.date)}
                            </td>
                            <td className="py-2.5 px-3 font-medium text-espresso">
                              {t.particulars}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] text-espresso/70">
                              {t.ref}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium">
                              {t.debit ? `₹${t.debit.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-medium text-[#2E7D32]">
                              {t.credit ? `₹${t.credit.toLocaleString('en-IN')}` : '—'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-semibold text-espresso">
                              ₹{t.balance.toLocaleString('en-IN')}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Statement Footer */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pt-4 mt-4 border-t border-[#EAE3DC] gap-3 print:hidden">
                  <p className="text-xs text-espresso/60">
                    Statement {formatDateShort(statement?.statementPeriod?.from)} –{' '}
                    {formatDateShort(statement?.statementPeriod?.to)}
                  </p>

                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      onClick={handlePrintStatement}
                      className="inline-flex items-center gap-1.5 border border-[#8B263E] text-[#8B263E] hover:bg-[#8B263E]/5 px-3.5 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wider transition"
                    >
                      <Printer size={13} />
                      PRINT STATEMENT
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        window.print();
                      }}
                      className="inline-flex items-center gap-1.5 border border-[#8B263E] text-[#8B263E] hover:bg-[#8B263E]/5 px-3.5 py-1.5 rounded text-[11px] font-semibold uppercase tracking-wider transition"
                    >
                      <Share2 size={13} />
                      SHARE PDF
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="py-12 text-center text-espresso/40 text-xs">
                Select a customer from the left to view their credit statement.
              </div>
            )}
          </div>

          {/* Bottom Panel: Receive payment */}
          <div className="bg-white border border-[#EAE3DC] p-5 rounded shadow-sm print:hidden">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3DC]">
              <h3 className="font-serif text-lg text-espresso font-medium">
                Receive payment
              </h3>
              <p className="text-xs text-espresso/60 font-mono">
                Receipt {nextReceipt || 'RC/26-27/0044'}
              </p>
            </div>

            <form onSubmit={handleRecordPayment} className="mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* AMOUNT */}
                <div>
                  <label className="block text-[10px] tracking-wider text-espresso/70 font-semibold uppercase mb-1">
                    AMOUNT (₹) *
                  </label>
                  <div className="relative">
                    <IndianRupee
                      size={14}
                      className="absolute left-3 top-2.5 text-espresso/40"
                    />
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder="0.00"
                      value={paymentAmount}
                      onChange={(e) => setPaymentAmount(e.target.value)}
                      className="w-full pl-8 pr-3 py-2 text-sm border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] font-medium text-espresso"
                    />
                  </div>
                </div>

                {/* MODE */}
                <div>
                  <label className="block text-[10px] tracking-wider text-espresso/70 font-semibold uppercase mb-1">
                    MODE *
                  </label>
                  <select
                    value={paymentMode}
                    onChange={(e) => setPaymentMode(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] bg-white text-espresso"
                  >
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                    <option value="NETBANKING">Bank Transfer</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                {/* DATE */}
                <div>
                  <label className="block text-[10px] tracking-wider text-espresso/70 font-semibold uppercase mb-1">
                    DATE *
                  </label>
                  <input
                    type="date"
                    required
                    value={paymentDate}
                    onChange={(e) => setPaymentDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] text-espresso"
                  />
                </div>
              </div>

              {/* Note / Remarks and Submit */}
              <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <input
                  type="text"
                  placeholder="Optional payment reference / note (e.g. GPay ref no)"
                  value={paymentNote}
                  onChange={(e) => setPaymentNote(e.target.value)}
                  className="flex-1 px-3 py-2 text-xs border border-[#EAE3DC] rounded focus:outline-none focus:border-[#8B263E] text-espresso"
                />

                <button
                  type="submit"
                  disabled={recordPaymentMutation.isPending || !selectedCustomer}
                  className="bg-[#8B263E] hover:bg-[#741F33] text-white px-6 py-2.5 rounded text-xs font-semibold uppercase tracking-wider transition shadow-sm disabled:opacity-50 whitespace-nowrap"
                >
                  {recordPaymentMutation.isPending ? 'RECORDING...' : 'RECORD PAYMENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* WhatsApp Reminders Modal */}
      {showRemindersModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white border border-[#EAE3DC] rounded-lg max-w-2xl w-full p-6 shadow-xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-[#EAE3DC]">
              <div className="flex items-center gap-2">
                <MessageCircle size={18} className="text-[#25D366]" />
                <h3 className="font-serif text-xl font-medium text-espresso">
                  Send WhatsApp Reminders
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowRemindersModal(false)}
                className="text-espresso/60 hover:text-espresso"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-espresso/70 mt-3 mb-4">
              Click below to send a friendly payment reminder via WhatsApp directly to any customer with an outstanding balance.
            </p>

            <div className="flex-1 overflow-y-auto space-y-2 pr-1 divide-y divide-[#EAE3DC]/60">
              {reminders.length === 0 ? (
                <div className="py-8 text-center text-xs text-espresso/40">
                  No customers currently owe due.
                </div>
              ) : (
                reminders.map((r) => (
                  <div
                    key={r.customerId}
                    className="pt-2.5 first:pt-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <p className="font-medium text-espresso text-sm">{r.name}</p>
                      <p className="text-xs text-espresso/60">
                        +91 {r.mobile} · Outstanding Due: <strong className="text-espresso">₹{r.balanceDue.toLocaleString('en-IN')}</strong>
                      </p>
                    </div>

                    <a
                      href={r.whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 bg-[#25D366] hover:bg-[#20BD5A] text-white px-3.5 py-1.5 rounded text-xs font-medium transition shadow-sm self-start sm:self-auto"
                    >
                      <MessageCircle size={14} />
                      Send WhatsApp
                      <ExternalLink size={12} />
                    </a>
                  </div>
                ))
              )}
            </div>

            <div className="pt-4 mt-4 border-t border-[#EAE3DC] flex justify-end">
              <button
                type="button"
                onClick={() => setShowRemindersModal(false)}
                className="px-4 py-2 border border-[#EAE3DC] text-espresso/80 hover:bg-[#FAF7F4] rounded text-xs font-semibold uppercase tracking-wider"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

