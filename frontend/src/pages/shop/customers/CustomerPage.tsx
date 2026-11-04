import {useAuthContext} from '@/context/AuthContext';
import {
  useCreateCustomer,
  useCustomers,
  useImportCustomers,
  useUpdateCustomer,
} from '@/lib/react-query/queriesAndMutations/customer';
import {CustomerType, ShopCustomer} from '@/types/customer';
import {inr} from '@/utils/money';
import {Link, useNavigate} from '@tanstack/react-router';
import {
  AlertCircle,
  Building2,
  Check,
  ChevronRight,
  Download,
  FileSpreadsheet,
  IndianRupee,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  Search,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import React, {useMemo, useRef, useState} from 'react';
import toast from 'react-hot-toast';

const PANEL = 'shop-admin';

// Helper to get initials
function getInitials(name: string): string {
  if (!name) return 'CU';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

// Avatar color palettes matching reference design (warm soft pastel backgrounds)
const AVATAR_COLORS = [
  'bg-[#F3E8E2] text-[#8C4A32]',
  'bg-[#EAE4DC] text-[#635343]',
  'bg-[#EDE4E6] text-[#702D3B]',
  'bg-[#E2E8F0] text-[#334155]',
  'bg-[#FEF3C7] text-[#92400E]',
  'bg-[#FCE7F3] text-[#9D174D]',
];

function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const idx = Math.abs(hash) % AVATAR_COLORS.length;
  return AVATAR_COLORS[idx];
}

export default function CustomerPage() {
  const {user} = useAuthContext();
  const navigate = useNavigate();

  // Active Tab: 'ALL' | 'WITH_DUE' | 'B2B'
  const [activeTab, setActiveTab] = useState<'ALL' | 'WITH_DUE' | 'B2B'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Queries & Mutations
  const {data: customerData, isFetching: isLoadingCustomers} = useCustomers(
    PANEL,
    {
      tab: activeTab,
      search: searchQuery.trim() || undefined,
      limit: 50,
    },
  );

  const createCustomerMutation = useCreateCustomer(PANEL);
  const updateCustomerMutation = useUpdateCustomer(PANEL);
  const importCustomersMutation = useImportCustomers(PANEL);

  // Form State
  const [formName, setFormName] = useState('');
  const [formMobile, setFormMobile] = useState('');
  const [formType, setFormType] = useState<CustomerType>('Retail');
  const [formBusinessName, setFormBusinessName] = useState('');
  const [formGstin, setFormGstin] = useState('');
  const [formAddress, setFormAddress] = useState('');
  const [formCreditLimit, setFormCreditLimit] = useState<number | string>('');
  const [formOpeningDue, setFormOpeningDue] = useState<number | string>('');
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);

  // Excel Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save / Submit customer form
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      toast.error('Please enter customer name');
      return;
    }
    const cleanPhone = formMobile.trim().replace(/^\+91/, '').trim();
    if (!cleanPhone || cleanPhone.length < 5) {
      toast.error('Please enter a valid mobile number');
      return;
    }

    try {
      if (editingCustomerId) {
        await updateCustomerMutation.mutateAsync({
          id: editingCustomerId,
          data: {
            name: formName.trim(),
            mobile: cleanPhone,
            customerType: formType,
            businessName: formType === 'B2B' ? formBusinessName.trim() : null,
            gstin: formType === 'B2B' ? formGstin.trim() : null,
            address: formAddress.trim() || null,
            creditLimit: Number(formCreditLimit) || 0,
          },
        });
        resetForm();
      } else {
        await createCustomerMutation.mutateAsync({
          name: formName.trim(),
          mobile: cleanPhone,
          customerType: formType,
          businessName: formType === 'B2B' ? formBusinessName.trim() : null,
          gstin: formType === 'B2B' ? formGstin.trim() : null,
          address: formAddress.trim() || null,
          creditLimit: Number(formCreditLimit) || 0,
          openingDue: Number(formOpeningDue) || 0,
        });
        resetForm();
      }
    } catch {
      // Handled in mutation onError
    }
  };

  const resetForm = () => {
    setFormName('');
    setFormMobile('');
    setFormType('Retail');
    setFormBusinessName('');
    setFormGstin('');
    setFormAddress('');
    setFormCreditLimit('');
    setFormOpeningDue('');
    setEditingCustomerId(null);
  };

  const handleEditClick = (c: ShopCustomer) => {
    setEditingCustomerId(c.id);
    setFormName(c.name);
    setFormMobile(c.mobile);
    setFormType(c.customerType);
    setFormBusinessName(c.businessName || '');
    setFormGstin(c.gstin || '');
    setFormAddress(c.address || '');
    setFormCreditLimit(c.creditLimit || '');
    setFormOpeningDue('');
  };

  // CSV Import Parser
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
        if (lines.length < 2) {
          toast.error('The selected file has no records');
          return;
        }

        const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
        const nameIdx = headers.findIndex((h) => h.includes('name'));
        const phoneIdx = headers.findIndex(
          (h) => h.includes('mobile') || h.includes('phone'),
        );
        const typeIdx = headers.findIndex((h) => h.includes('type'));
        const gstinIdx = headers.findIndex((h) => h.includes('gst'));
        const limitIdx = headers.findIndex((h) => h.includes('credit'));
        const dueIdx = headers.findIndex((h) => h.includes('due'));

        if (nameIdx === -1 || phoneIdx === -1) {
          toast.error('CSV must contain Name and Mobile columns');
          return;
        }

        const rows: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^"|"$/g, ''));
          if (!cols[nameIdx] || !cols[phoneIdx]) continue;
          rows.push({
            name: cols[nameIdx],
            mobile: cols[phoneIdx],
            customerType:
              typeIdx !== -1 && cols[typeIdx]?.toUpperCase() === 'B2B'
                ? 'B2B'
                : 'Retail',
            gstin: gstinIdx !== -1 ? cols[gstinIdx] : null,
            creditLimit: limitIdx !== -1 ? Number(cols[limitIdx]) || 0 : 0,
            openingDue: dueIdx !== -1 ? Number(cols[dueIdx]) || 0 : 0,
          });
        }

        if (rows.length === 0) {
          toast.error('No valid rows found in file');
          return;
        }

        await importCustomersMutation.mutateAsync(rows);
        setShowImportModal(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } catch {
        toast.error('Failed to parse file. Please verify CSV format.');
      }
    };
    reader.readAsText(file);
  };

  // Metrics
  const metrics = customerData?.metrics || {
    totalCustomers: 0,
    newThisMonth: 0,
    onCreditCount: 0,
    totalDue: 0,
    b2bCount: 0,
  };

  const customersList = customerData?.items || [];

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] -m-4 md:-m-6 2xl:-m-10 bg-[#FAF8F5] text-espresso select-none font-sans">
      {/* 1. TOP HEADER & TITLE */}
      <div className="border-b border-ivory-300 bg-[#FAF8F5] px-4 md:px-8 py-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold tracking-wider uppercase text-outline">
              CUSTOMERS
            </p>
            <h1 className="font-serif text-3xl font-bold tracking-tight text-burgundy mt-1">
              Customers
            </h1>
            <p className="text-xs text-outline mt-1 font-medium">
              Retail and B2B customers who buy at this shop. Credit limit and due are tracked here.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="px-5 py-2.5 border border-ivory-300 hover:border-burgundy/40 hover:bg-white text-espresso font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-2xs cursor-pointer flex items-center gap-2"
            >
              <FileSpreadsheet size={15} className="text-outline" />
              IMPORT EXCEL
            </button>

            <button
              type="button"
              onClick={() => {
                resetForm();
                const inputEl = document.getElementById('customer-name-input');
                inputEl?.focus();
              }}
              className="px-6 py-2.5 bg-burgundy hover:bg-burgundy-deep text-white font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-2xs cursor-pointer flex items-center gap-2"
            >
              <Plus size={15} />
              ADD CUSTOMER
            </button>
          </div>
        </div>
      </div>

      {/* 2. STAT METRIC CARDS */}
      <div className="px-4 md:px-8 pt-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* CARD 1: CUSTOMERS */}
          <div className="bg-white border border-ivory-300 rounded-lg p-5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
              CUSTOMERS
            </p>
            <p className="font-serif text-3xl font-bold text-espresso">
              {metrics.totalCustomers}
            </p>
            <p className="text-xs text-emerald-800 font-medium mt-1">
              +{metrics.newThisMonth} this month
            </p>
          </div>

          {/* CARD 2: ON CREDIT */}
          <div className="bg-white border border-ivory-300 rounded-lg p-5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
              ON CREDIT
            </p>
            <p className="font-serif text-3xl font-bold text-espresso">
              {metrics.onCreditCount}
            </p>
            <p className="text-xs text-rose-700 font-medium mt-1">
              {inr(metrics.totalDue)} due
            </p>
          </div>

          {/* CARD 3: B2B (WITH GSTIN) */}
          <div className="bg-white border border-ivory-300 rounded-lg p-5 shadow-2xs">
            <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
              B2B (WITH GSTIN)
            </p>
            <p className="font-serif text-3xl font-bold text-espresso">
              {metrics.b2bCount}
            </p>
            <p className="text-xs text-outline font-medium mt-1">
              Boutiques, tailors
            </p>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (TABLE + ADD FORM) */}
      <div className="flex flex-col lg:flex-row flex-1 p-4 md:px-8 md:py-6 gap-6">
        {/* LEFT COLUMN: FILTER TABS & CUSTOMER TABLE */}
        <div className="flex-1 flex flex-col gap-4">
          {/* TABS & SEARCH BAR */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 md:p-4 rounded-lg border border-ivory-300 shadow-2xs">
            {/* Filter Tabs */}
            <div className="flex items-center gap-4 border-b sm:border-b-0 border-ivory-200 pb-2 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all relative cursor-pointer ${
                  activeTab === 'ALL'
                    ? 'text-burgundy font-extrabold after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-burgundy'
                    : 'text-outline hover:text-espresso'
                }`}
              >
                ALL
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('WITH_DUE')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all relative cursor-pointer flex items-center gap-1.5 ${
                  activeTab === 'WITH_DUE'
                    ? 'text-burgundy font-extrabold after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-burgundy'
                    : 'text-outline hover:text-espresso'
                }`}
              >
                WITH DUE
                {metrics.onCreditCount > 0 && (
                  <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-1.5 py-0.2 rounded-full">
                    {metrics.onCreditCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('B2B')}
                className={`text-xs font-bold uppercase tracking-wider pb-1 transition-all relative cursor-pointer ${
                  activeTab === 'B2B'
                    ? 'text-burgundy font-extrabold after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-burgundy'
                    : 'text-outline hover:text-espresso'
                }`}
              >
                B2B
              </button>
            </div>

            {/* Search Input */}
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Name, mobile, GSTIN"
                className="w-full bg-[#FAF8F5] border border-ivory-300 rounded px-3 py-1.5 text-xs text-espresso focus:bg-white focus:border-burgundy focus:outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-2 text-outline hover:text-espresso"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          </div>

          {/* CUSTOMER TABLE */}
          <div className="bg-white border border-ivory-300 rounded-lg shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ivory-300 bg-[#FAF8F5] text-outline uppercase font-semibold text-[11px] tracking-wider">
                    <th className="py-3 px-4 min-w-[200px]">CUSTOMER</th>
                    <th className="py-3 px-4 min-w-[130px]">MOBILE</th>
                    <th className="py-3 px-4 min-w-[90px]">TYPE</th>
                    <th className="py-3 px-4 text-right min-w-[100px]">BOUGHT</th>
                    <th className="py-3 px-4 text-right min-w-[110px]">
                      CREDIT LIMIT
                    </th>
                    <th className="py-3 px-4 text-right min-w-[100px]">DUE</th>
                    <th className="py-3 px-3 text-center w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {isLoadingCustomers ? (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-outline">
                        <div className="inline-block animate-spin w-5 h-5 border-2 border-burgundy border-t-transparent rounded-full mb-1"></div>
                        <p className="text-xs">Loading customers...</p>
                      </td>
                    </tr>
                  ) : customersList.length > 0 ? (
                    customersList.map((customer) => {
                      const initials = getInitials(
                        customer.businessName || customer.name,
                      );
                      const avatarStyle = getAvatarColor(customer.name);

                      return (
                        <tr
                          key={customer.id}
                          className="hover:bg-ivory-50/50 transition-colors"
                        >
                          {/* Avatar & Customer Name */}
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <span
                                className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${avatarStyle}`}
                              >
                                {initials}
                              </span>
                              <div>
                                <p className="font-bold text-espresso text-[13px] leading-tight">
                                  {customer.name}
                                </p>
                                {customer.customerType === 'B2B' &&
                                  customer.gstin && (
                                    <p className="text-[10px] text-outline font-mono mt-0.5">
                                      GSTIN {customer.gstin}
                                    </p>
                                  )}
                                {customer.businessName &&
                                  customer.businessName !== customer.name && (
                                    <p className="text-[11px] text-outline mt-0.5">
                                      {customer.businessName}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </td>

                          {/* Mobile */}
                          <td className="py-3.5 px-4 font-mono text-espresso text-xs whitespace-nowrap">
                            +91 {customer.mobile}
                          </td>

                          {/* Type */}
                          <td className="py-3.5 px-4">
                            <span
                              className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
                                customer.customerType === 'B2B'
                                  ? 'bg-[#EAE4DC] text-[#635343]'
                                  : 'bg-ivory-100 text-espresso'
                              }`}
                            >
                              {customer.customerType}
                            </span>
                          </td>

                          {/* Bought */}
                          <td className="py-3.5 px-4 text-right font-medium text-espresso whitespace-nowrap">
                            {inr(customer.totalBought)}
                          </td>

                          {/* Credit Limit */}
                          <td className="py-3.5 px-4 text-right font-medium text-espresso whitespace-nowrap">
                            {customer.creditLimit > 0
                              ? inr(customer.creditLimit)
                              : '₹0'}
                          </td>

                          {/* Due */}
                          <td className="py-3.5 px-4 text-right font-bold whitespace-nowrap">
                            {customer.balanceDue > 0 ? (
                              <span className="text-rose-700">
                                {inr(customer.balanceDue)}
                              </span>
                            ) : (
                              <span className="text-outline">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title="Edit Customer"
                                onClick={() => handleEditClick(customer)}
                                className="p-1 text-outline hover:text-burgundy transition-colors cursor-pointer"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                title="Bill Customer (POS)"
                                onClick={() =>
                                  navigate({
                                    to: '/shop-admin/new-bill',
                                  })
                                }
                                className="p-1 text-outline hover:text-espresso transition-colors cursor-pointer"
                              >
                                <ChevronRight size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-12 text-center text-outline">
                        <Users
                          size={32}
                          className="mx-auto text-outline/40 mb-2"
                          strokeWidth={1.5}
                        />
                        <p className="text-sm font-bold text-espresso">
                          No Customers Found
                        </p>
                        <p className="text-xs text-outline mt-0.5">
                          {searchQuery
                            ? `No customers match "${searchQuery}"`
                            : 'No customer records yet. Add a customer using the form on the right.'}
                        </p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: "Add customer" PANEL */}
        <div className="w-full lg:w-[350px] shrink-0">
          <div className="bg-white border border-ivory-300 rounded-lg p-5 shadow-2xs sticky top-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-serif text-lg font-bold text-espresso">
                {editingCustomerId ? 'Edit customer' : 'Add customer'}
              </h2>
              {editingCustomerId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="text-xs text-outline hover:text-espresso cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              {/* NAME */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
                  NAME *
                </label>
                <input
                  id="customer-name-input"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Kavita Desai"
                  className="w-full bg-[#FAF8F5] border border-ivory-300 rounded px-3 py-2 text-xs text-espresso focus:bg-white focus:border-burgundy focus:outline-none"
                />
              </div>

              {/* MOBILE */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
                  MOBILE *
                </label>
                <div className="flex items-center border border-ivory-300 rounded bg-[#FAF8F5] focus-within:bg-white focus-within:border-burgundy">
                  <span className="px-3 py-2 text-outline font-mono text-xs border-r border-ivory-300 select-none">
                    +91
                  </span>
                  <input
                    type="tel"
                    required
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="90960 77821"
                    className="w-full bg-transparent px-3 py-2 text-xs font-mono text-espresso focus:outline-none"
                  />
                </div>
                <p className="text-[10px] text-outline mt-1 font-medium">
                  Used to find the customer at the counter
                </p>
              </div>

              {/* CUSTOMER TYPE */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
                  CUSTOMER TYPE
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as CustomerType)}
                  className="w-full bg-[#FAF8F5] border border-ivory-300 rounded px-3 py-2 text-xs text-espresso focus:bg-white focus:border-burgundy focus:outline-none cursor-pointer"
                >
                  <option value="Retail">Retail</option>
                  <option value="B2B">B2B</option>
                </select>
              </div>

              {/* BUSINESS NAME (FOR B2B) */}
              {formType === 'B2B' && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
                    BUSINESS NAME
                  </label>
                  <input
                    type="text"
                    value={formBusinessName}
                    onChange={(e) => setFormBusinessName(e.target.value)}
                    placeholder="For B2B (e.g. Shree Boutique)"
                    className="w-full bg-[#FAF8F5] border border-ivory-300 rounded px-3 py-2 text-xs text-espresso focus:bg-white focus:border-burgundy focus:outline-none"
                  />
                </div>
              )}

              {/* GSTIN */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={formGstin}
                  onChange={(e) => setFormGstin(e.target.value.toUpperCase())}
                  placeholder="27XXXXX0000X1Z5"
                  className="w-full bg-[#FAF8F5] border border-ivory-300 rounded px-3 py-2 text-xs font-mono uppercase text-espresso focus:bg-white focus:border-burgundy focus:outline-none"
                />
                <p className="text-[10px] text-outline mt-1 font-medium">
                  Needed for B2B tax invoice
                </p>
              </div>

              {/* ADDRESS */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
                  ADDRESS
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Street, City, Pincode"
                  className="w-full bg-[#FAF8F5] border border-ivory-300 rounded px-3 py-2 text-xs text-espresso focus:bg-white focus:border-burgundy focus:outline-none resize-none"
                />
              </div>

              {/* CREDIT LIMIT */}
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
                  CREDIT LIMIT (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={formCreditLimit}
                  onChange={(e) => setFormCreditLimit(e.target.value)}
                  placeholder="e.g. 10000"
                  className="w-full bg-[#FAF8F5] border border-ivory-300 rounded px-3 py-2 text-xs font-mono text-espresso focus:bg-white focus:border-burgundy focus:outline-none"
                />
              </div>

              {/* OPENING DUE (ONLY ON CREATE) */}
              {!editingCustomerId && (
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-outline mb-1.5">
                    OPENING DUE (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formOpeningDue}
                    onChange={(e) => setFormOpeningDue(e.target.value)}
                    placeholder="0"
                    className="w-full bg-[#FAF8F5] border border-ivory-300 rounded px-3 py-2 text-xs font-mono text-espresso focus:bg-white focus:border-burgundy focus:outline-none"
                  />
                </div>
              )}

              {/* SUBMIT BUTTON */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={
                    createCustomerMutation.isPending ||
                    updateCustomerMutation.isPending
                  }
                  className="w-full py-3 bg-burgundy hover:bg-burgundy-deep text-white font-bold text-xs uppercase tracking-wider rounded transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {createCustomerMutation.isPending ||
                  updateCustomerMutation.isPending
                    ? 'SAVING…'
                    : editingCustomerId
                    ? 'UPDATE CUSTOMER'
                    : 'SAVE CUSTOMER'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 4. EXCEL / CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-ivory-300 shadow-2xl w-full max-w-md p-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-bold text-espresso">
                Import Customers
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="text-outline hover:text-espresso cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <p className="text-xs text-outline mb-4">
              Upload a CSV file containing columns: <strong>Name</strong>,{' '}
              <strong>Mobile</strong>, <strong>Type</strong> (Retail/B2B),{' '}
              <strong>GSTIN</strong>, <strong>CreditLimit</strong>.
            </p>

            <div className="border-2 border-dashed border-ivory-300 rounded-lg p-6 text-center bg-[#FAF8F5]">
              <Upload size={32} className="mx-auto text-outline/60 mb-2" />
              <p className="text-xs font-bold text-espresso">
                Select CSV File to Upload
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-3 block w-full text-xs text-outline file:mr-4 file:py-1.5 file:px-4 file:rounded file:border-0 file:text-xs file:font-semibold file:bg-burgundy file:text-white hover:file:bg-burgundy-deep cursor-pointer"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 border border-ivory-300 rounded text-xs font-semibold text-espresso hover:bg-ivory-100 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

