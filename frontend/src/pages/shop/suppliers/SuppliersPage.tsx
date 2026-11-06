import React, {useState, useEffect, useMemo} from 'react';
import {
  useSuppliers,
  useSupplierLedger,
  useCreateSupplier,
  useRecordSupplierPayment,
} from '@/lib/react-query/queriesAndMutations/supplier';
import {
  SupplierProfile,
  CreateSupplierPayload,
  RecordSupplierPaymentPayload,
} from '@/types/supplier';
import {
  Plus,
  Search,
  Printer,
  Share2,
  X,
  CreditCard,
  Building2,
  Phone,
  FileText,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface SuppliersPageProps {
  panel?: 'shop-admin' | 'branch-admin';
}

const formatInr = (n?: number | null) => {
  if (n === null || n === undefined) return '—';
  return `₹${Math.round(n).toLocaleString('en-IN')}`;
};

export default function SuppliersPage({panel = 'shop-admin'}: SuppliersPageProps) {

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(null);

  // Modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [newSupplier, setNewSupplier] = useState<CreateSupplierPayload>({
    name: '',
    contactPerson: '',
    phone: '',
    email: '',
    gstin: '',
    city: '',
    state: '',
    paymentTerms: 'Net 30',
    openingBalance: 0,
  });

  // Payment form state
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMode, setPayMode] = useState<string>('Bank transfer (NEFT / RTGS)');
  const [payDate, setPayDate] = useState<string>(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [utrChequeNo, setUtrChequeNo] = useState<string>('');
  const [againstBill, setAgainstBill] = useState<string>('');
  const [paidFrom, setPaidFrom] = useState<string>('Bank account');

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 250);
    return () => clearTimeout(timer);
  }, [search]);

  // Queries & Mutations
  const {data: suppliersData, isLoading: isSuppliersLoading, refetch: refetchSuppliers} =
    useSuppliers(panel, debouncedSearch);

  const suppliers = suppliersData?.items || [];
  const totalPayable = suppliersData?.totalPayable ?? 0;

  // Auto-select first supplier if none selected or if Tiruppur Knits exists
  useEffect(() => {
    if (!selectedSupplierId && suppliers.length > 0) {
      const tiruppur = suppliers.find((s) => s.name.toLowerCase().includes('tiruppur'));
      setSelectedSupplierId(tiruppur ? tiruppur.id : suppliers[0].id);
    }
  }, [suppliers, selectedSupplierId]);

  const {data: ledgerData, isLoading: isLedgerLoading, refetch: refetchLedger} =
    useSupplierLedger(panel, selectedSupplierId);

  const activeSupplier = ledgerData?.supplier || suppliers.find((s) => s.id === selectedSupplierId) || null;
  const ledgerEntries = ledgerData?.ledger || [];
  const openBills = ledgerData?.openBills || [];
  const nextReceiptNumber = ledgerData?.nextReceiptNumber || 'PY/26-27/0019';
  const statementPeriod = ledgerData?.statementPeriod || 'Statement 01 Oct – 03 Nov 2026';

  // Synchronize payment default amount and against bill when supplier changes
  useEffect(() => {
    if (activeSupplier) {
      setPayAmount(activeSupplier.payable > 0 ? String(activeSupplier.payable) : '0');
    }
    if (openBills.length > 0) {
      setAgainstBill(openBills[0].billNumber);
    } else {
      setAgainstBill('');
    }
  }, [activeSupplier?.id, activeSupplier?.payable, openBills.length]);

  const createMutation = useCreateSupplier(panel);
  const paymentMutation = useRecordSupplierPayment(panel);

  // Balance after payment calculation
  const currentPayable = activeSupplier?.payable || 0;
  const amountToPay = Number(payAmount) || 0;
  const balanceAfter = Math.max(0, currentPayable - amountToPay);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplier.name.trim()) {
      toast.error('Supplier name is required');
      return;
    }
    try {
      const res: any = await createMutation.mutateAsync({
        ...newSupplier,
        openingBalance: Number(newSupplier.openingBalance) || 0,
      });
      setAddModalOpen(false);
      setNewSupplier({
        name: '',
        contactPerson: '',
        phone: '',
        email: '',
        gstin: '',
        city: '',
        state: '',
        paymentTerms: 'Net 30',
        openingBalance: 0,
      });
      if (res?.id) setSelectedSupplierId(res.id);
      refetchSuppliers();
    } catch (err) {
      // error handled by mutation toast
    }
  };

  const handleMakePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSupplier) return;
    if (amountToPay <= 0) {
      toast.error('Payment amount must be greater than 0');
      return;
    }

    const payload: RecordSupplierPaymentPayload = {
      supplierId: activeSupplier.id,
      supplierName: activeSupplier.name,
      amount: amountToPay,
      paymentMode: payMode,
      paymentDate: payDate,
      paidFrom,
      utrChequeNo: utrChequeNo.trim() || undefined,
      billNumber: againstBill || undefined,
    };

    try {
      await paymentMutation.mutateAsync(payload);
      setUtrChequeNo('');
      refetchLedger();
      refetchSuppliers();
    } catch (err) {
      // error handled by mutation
    }
  };

  const handlePrintStatement = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-stone-800">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
            Purchase / Suppliers
          </p>
          <h1 className="mt-1 font-serif text-3xl font-normal tracking-tight text-[#4A1521]">
            Suppliers &amp; payments
          </h1>
          <p className="mt-0.5 text-xs text-stone-500">
            What you owe each supplier, their ledger, and payments made.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setAddModalOpen(true)}
          className="flex items-center gap-1.5 rounded bg-[#7A2232] px-4 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#5E1724]"
        >
          <Plus size={14} strokeWidth={2.5} />
          <span>ADD SUPPLIER</span>
        </button>
      </div>

      {/* Main Grid: Left List (4 cols) & Right Ledger/Payment (8 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Suppliers List */}
        <div className="lg:col-span-4 flex flex-col rounded-lg border border-stone-200/90 bg-white shadow-sm overflow-hidden">
          {/* Search Bar */}
          <div className="p-3 border-b border-stone-100 bg-stone-50/50">
            <div className="relative">
              <Search
                size={15}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
              />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or GSTIN"
                className="w-full rounded border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs text-stone-800 placeholder-stone-400 focus:border-[#7A2232] focus:outline-none focus:ring-1 focus:ring-[#7A2232]"
              />
            </div>
          </div>

          {/* Supplier Items */}
          <div className="flex-1 divide-y divide-stone-100 overflow-y-auto max-h-[640px]">
            {isSuppliersLoading ? (
              <div className="p-6 text-center text-xs text-stone-400">Loading suppliers...</div>
            ) : suppliers.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-400">No suppliers found</div>
            ) : (
              suppliers.map((s) => {
                const isSelected = s.id === selectedSupplierId;
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setSelectedSupplierId(s.id)}
                    className={`w-full text-left p-3.5 transition-all flex items-start justify-between ${
                      isSelected
                        ? 'bg-[#FDF2F4] border-l-4 border-[#7A2232]'
                        : 'hover:bg-stone-50/80 border-l-4 border-transparent'
                    }`}
                  >
                    <div>
                      <h3
                        className={`text-xs font-semibold ${
                          isSelected ? 'text-[#4A1521]' : 'text-stone-800'
                        }`}
                      >
                        {s.name}
                      </h3>
                      <p className="mt-0.5 text-[11px] text-stone-500">
                        {s.nextDue || `${s.city || ''} · ${s.paymentTerms}`}
                      </p>
                    </div>

                    <div className="text-right">
                      <p
                        className={`font-serif text-sm font-bold ${
                          s.payable > 0
                            ? isSelected
                              ? 'text-[#7A2232]'
                              : 'text-stone-800'
                            : 'text-stone-400'
                        }`}
                      >
                        {formatInr(s.payable)}
                      </p>
                      <p className="text-[10px] text-stone-400">payable</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>

          {/* Total Payable Bottom Bar */}
          <div className="border-t border-stone-200 bg-[#FBF9F9] px-4 py-3 flex items-center justify-between">
            <span className="text-xs font-bold text-stone-700">Total payable</span>
            <span className="font-serif text-sm font-bold text-[#7A2232]">
              {formatInr(totalPayable)}
            </span>
          </div>
        </div>

        {/* Right Column: Ledger Table & Make Payment */}
        <div className="lg:col-span-8 space-y-6">
          {/* Supplier Header & Ledger Card */}
          <div className="rounded-lg border border-stone-200/90 bg-white p-5 shadow-sm">
            {activeSupplier ? (
              <>
                {/* Header info */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between pb-4 border-b border-stone-100">
                  <div>
                    <h2 className="font-serif text-2xl font-bold tracking-tight text-[#4A1521]">
                      {activeSupplier.name}
                    </h2>
                    <p className="mt-1 text-xs text-stone-500">
                      {[
                        activeSupplier.contactPerson,
                        activeSupplier.phone,
                        activeSupplier.gstin ? `GSTIN ${activeSupplier.gstin}` : null,
                        activeSupplier.state || activeSupplier.city,
                        activeSupplier.paymentTerms,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
                      PAYABLE
                    </p>
                    <p className="font-serif text-3xl font-bold text-[#7A2232]">
                      {formatInr(activeSupplier.payable)}
                    </p>
                  </div>
                </div>

                {/* Ledger Table */}
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200/80 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                        <th className="py-2.5 pr-4">DATE</th>
                        <th className="py-2.5 px-4">PARTICULARS</th>
                        <th className="py-2.5 px-4">REF</th>
                        <th className="py-2.5 px-4 text-right">BILL (CR)</th>
                        <th className="py-2.5 px-4 text-right">PAID / RETURN (DR)</th>
                        <th className="py-2.5 pl-4 text-right">BALANCE</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 text-stone-700">
                      {isLedgerLoading ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-stone-400 text-xs">
                            Loading ledger entries...
                          </td>
                        </tr>
                      ) : ledgerEntries.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-6 text-center text-stone-400 text-xs">
                            No ledger entries found for this supplier
                          </td>
                        </tr>
                      ) : (
                        ledgerEntries.map((row) => (
                          <tr key={row.id} className="hover:bg-stone-50/60 transition-colors">
                            <td className="py-3 pr-4 font-medium text-stone-600 whitespace-nowrap">
                              {row.date}
                            </td>
                            <td className="py-3 px-4 font-normal text-stone-800">
                              {row.particulars}
                            </td>
                            <td className="py-3 px-4 text-stone-600 font-mono text-[11px]">
                              {row.ref}
                            </td>
                            <td className="py-3 px-4 text-right font-serif text-stone-800 font-medium">
                              {row.credit ? formatInr(row.credit) : ''}
                            </td>
                            <td className="py-3 px-4 text-right font-serif text-stone-800 font-medium">
                              {row.debit ? formatInr(row.debit) : ''}
                            </td>
                            <td className="py-3 pl-4 text-right font-serif font-bold text-stone-900">
                              {row.balance !== null && row.balance !== undefined
                                ? formatInr(row.balance)
                                : '—'}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Ledger Footer */}
                <div className="mt-5 pt-3 border-t border-stone-100 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <span className="text-xs text-stone-500">{statementPeriod}</span>

                  <button
                    type="button"
                    onClick={handlePrintStatement}
                    className="inline-flex items-center gap-1.5 rounded border border-[#7A2232] px-4 py-1.5 text-xs font-bold uppercase tracking-wider text-[#7A2232] transition-colors hover:bg-[#FDF2F4] self-start sm:self-auto"
                  >
                    <Printer size={13} />
                    <span>PRINT / SHARE</span>
                  </button>
                </div>
              </>
            ) : (
              <div className="p-8 text-center text-stone-400 text-xs">
                Select a supplier to view details and ledger.
              </div>
            )}
          </div>

          {/* Make Payment Card */}
          <div className="rounded-lg border border-stone-200/90 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-lg font-bold text-[#4A1521]">Make payment</h3>
              <span className="text-xs font-mono text-stone-400 font-medium">
                Receipt {nextReceiptNumber}
              </span>
            </div>

            <form onSubmit={handleMakePayment} className="mt-4 space-y-4">
              {/* Row 1: Amount, Mode, Date */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    AMOUNT (₹) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    required
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    MODE *
                  </label>
                  <select
                    value={payMode}
                    onChange={(e) => setPayMode(e.target.value)}
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  >
                    <option value="Bank transfer (NEFT / RTGS)">Bank transfer (NEFT / RTGS)</option>
                    <option value="Cash">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    DATE *
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => setPayDate(e.target.value)}
                    required
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Row 2: UTR, Against Bill, Paid From */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    UTR / CHEQUE NO.
                  </label>
                  <input
                    type="text"
                    value={utrChequeNo}
                    onChange={(e) => setUtrChequeNo(e.target.value)}
                    placeholder="e.g. HDFCR5202610150991"
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    AGAINST BILL
                  </label>
                  <select
                    value={againstBill}
                    onChange={(e) => setAgainstBill(e.target.value)}
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  >
                    <option value="">None / General Advance</option>
                    {openBills.map((b) => (
                      <option key={b.id} value={b.billNumber}>
                        {b.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    PAID FROM
                  </label>
                  <select
                    value={paidFrom}
                    onChange={(e) => setPaidFrom(e.target.value)}
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  >
                    <option value="Bank account">Bank account</option>
                    <option value="Cash in shop register">Cash in shop register</option>
                    <option value="Petty cash">Petty cash</option>
                  </select>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="pt-3 border-t border-stone-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-stone-800">
                  Balance after payment:{' '}
                  <span className="font-serif text-[#7A2232] font-bold">
                    {formatInr(balanceAfter)}
                  </span>
                </span>

                <button
                  type="submit"
                  disabled={paymentMutation.isPending}
                  className="rounded bg-[#7A2232] px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#5E1724] disabled:opacity-50"
                >
                  {paymentMutation.isPending ? 'SAVING...' : 'SAVE PAYMENT'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Add Supplier Modal */}
      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-lg rounded-xl border border-stone-200 bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <h3 className="font-serif text-xl font-bold text-[#4A1521]">Add new supplier</h3>
              <button
                type="button"
                onClick={() => setAddModalOpen(false)}
                className="text-stone-400 hover:text-stone-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSupplier} className="mt-4 space-y-4">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  SUPPLIER NAME *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmedabad Cottons"
                  value={newSupplier.name}
                  onChange={(e) => setNewSupplier({...newSupplier, name: e.target.value})}
                  className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    CONTACT PERSON
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Vikram Patel"
                    value={newSupplier.contactPerson || ''}
                    onChange={(e) =>
                      setNewSupplier({...newSupplier, contactPerson: e.target.value})
                    }
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    PHONE NUMBER
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={newSupplier.phone || ''}
                    onChange={(e) => setNewSupplier({...newSupplier, phone: e.target.value})}
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    GSTIN
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 24AAAAA0000A1Z5"
                    value={newSupplier.gstin || ''}
                    onChange={(e) => setNewSupplier({...newSupplier, gstin: e.target.value})}
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none uppercase"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    CITY / STATE
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Surat, Gujarat"
                    value={newSupplier.city || ''}
                    onChange={(e) => setNewSupplier({...newSupplier, city: e.target.value})}
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    PAYMENT TERMS
                  </label>
                  <select
                    value={newSupplier.paymentTerms}
                    onChange={(e) =>
                      setNewSupplier({...newSupplier, paymentTerms: e.target.value})
                    }
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  >
                    <option value="Net 0 days">Net 0 days</option>
                    <option value="Net 15">Net 15</option>
                    <option value="Net 30">Net 30</option>
                    <option value="Cash">Cash</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                    OPENING BALANCE (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={newSupplier.openingBalance}
                    onChange={(e) =>
                      setNewSupplier({
                        ...newSupplier,
                        openingBalance: Number(e.target.value) || 0,
                      })
                    }
                    className="w-full rounded border border-stone-200 bg-stone-50/60 px-3 py-2 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="rounded border border-stone-200 px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="rounded bg-[#7A2232] px-5 py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm hover:bg-[#5E1724] disabled:opacity-50"
                >
                  {createMutation.isPending ? 'Saving...' : 'Save Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

