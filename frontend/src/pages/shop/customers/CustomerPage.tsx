import {useAuthContext} from '@/context/AuthContext';
import OnlineBuyers from '@/components/Customers/OnlineBuyers';
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
import React, {useEffect, useMemo, useRef, useState} from 'react';
import toast from 'react-hot-toast';
import {PATTERNS} from '@/lib/validation/fieldRules';

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
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(
    null,
  );
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Excel Import Modal State
  const [showImportModal, setShowImportModal] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save / Submit customer form
  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanPhone = formMobile
      .trim()
      .replace(/^\+91/, '')
      .replace(/\s+/g, '');
    // Same rules as the server, shown next to each field
    const errors: Record<string, string> = {};
    if (!formName.trim()) errors.name = 'Customer name is required';
    if (!cleanPhone) errors.mobile = 'Mobile number is required';
    else if (!PATTERNS.phone.test(cleanPhone))
      errors.mobile = 'Enter a valid 10-digit mobile number';
    if (formGstin.trim() && !PATTERNS.gstin.test(formGstin.trim()))
      errors.gstin = 'Enter a valid 15-character GSTIN';
    if (
      formCreditLimit !== '' &&
      (Number.isNaN(Number(formCreditLimit)) || Number(formCreditLimit) < 0)
    ) {
      errors.creditLimit = 'Credit limit cannot be negative';
    }
    setFormErrors(errors);
    if (Object.keys(errors).length) return;

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
    setFormErrors({});
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
          const cols = lines[i]
            .split(',')
            .map((c) => c.trim().replace(/^"|"$/g, ''));
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
    <div className="-m-3 flex min-h-[calc(100vh-80px)] select-none flex-col bg-ivory-50 font-sans text-espresso sm:-m-4 lg:-m-6 2xl:-m-8">
      {/* 1. TOP HEADER & TITLE */}
      <div className="border-b border-ivory-300 bg-ivory-50 px-4 py-5 md:px-8">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-outline">
              CUSTOMERS
            </p>
            <h1 className="font-serif text-headline-lg-mobile font-normal text-burgundy md:text-headline-md">
              Customers
            </h1>
            <p className="mt-1 text-xs font-medium text-outline">
              Retail and B2B customers who buy at this shop. Credit limit and
              due are tracked here.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setShowImportModal(true)}
              className="shadow-2xs flex cursor-pointer items-center gap-2 rounded border border-ivory-300 px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-espresso transition-colors hover:border-burgundy/40 hover:bg-white"
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
              className="shadow-2xs flex cursor-pointer items-center gap-2 rounded bg-burgundy px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-burgundy-deep"
            >
              <Plus size={15} />
              ADD CUSTOMER
            </button>
          </div>
        </div>
      </div>

      {/* 2. STAT METRIC CARDS */}
      <div className="px-4 pt-6 md:px-8">
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {/* CARD 1: CUSTOMERS */}
          <div className="shadow-2xs rounded-lg border border-ivory-300 bg-white p-5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-outline">
              CUSTOMERS
            </p>
            <p className="font-serif text-3xl font-bold text-espresso">
              {metrics.totalCustomers}
            </p>
            <p className="mt-1 text-xs font-medium text-emerald-800">
              +{metrics.newThisMonth} this month
            </p>
          </div>

          {/* CARD 2: ON CREDIT */}
          <div className="shadow-2xs rounded-lg border border-ivory-300 bg-white p-5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-outline">
              ON CREDIT
            </p>
            <p className="font-serif text-3xl font-bold text-espresso">
              {metrics.onCreditCount}
            </p>
            <p className="mt-1 text-xs font-medium text-rose-700">
              {inr(metrics.totalDue)} due
            </p>
          </div>

          {/* CARD 3: B2B (WITH GSTIN) */}
          <div className="shadow-2xs rounded-lg border border-ivory-300 bg-white p-5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-outline">
              B2B (WITH GSTIN)
            </p>
            <p className="font-serif text-3xl font-bold text-espresso">
              {metrics.b2bCount}
            </p>
            <p className="mt-1 text-xs font-medium text-outline">
              Boutiques, tailors
            </p>
          </div>
        </div>
      </div>

      {/* 3. MAIN WORKSPACE (TABLE + ADD FORM) */}
      <div className="flex flex-1 flex-col gap-6 p-4 md:px-8 md:py-6 lg:flex-row">
        {/* LEFT COLUMN: FILTER TABS & CUSTOMER TABLE */}
        <div className="flex flex-1 flex-col gap-4">
          {/* TABS & SEARCH BAR */}
          <div className="shadow-2xs flex flex-col justify-between gap-3 rounded-lg border border-ivory-300 bg-white p-3 sm:flex-row sm:items-center md:p-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-4 border-b border-ivory-200 pb-2 sm:border-b-0 sm:pb-0">
              <button
                type="button"
                onClick={() => setActiveTab('ALL')}
                className={`relative cursor-pointer pb-1 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'ALL'
                    ? 'font-extrabold text-burgundy after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-burgundy'
                    : 'text-outline hover:text-espresso'
                }`}
              >
                ALL
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('WITH_DUE')}
                className={`relative flex cursor-pointer items-center gap-1.5 pb-1 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'WITH_DUE'
                    ? 'font-extrabold text-burgundy after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-burgundy'
                    : 'text-outline hover:text-espresso'
                }`}
              >
                WITH DUE
                {metrics.onCreditCount > 0 && (
                  <span className="py-0.2 rounded-full bg-rose-100 px-1.5 text-[10px] font-bold text-rose-800">
                    {metrics.onCreditCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('B2B')}
                className={`relative cursor-pointer pb-1 text-xs font-bold uppercase tracking-wider transition-all ${
                  activeTab === 'B2B'
                    ? 'font-extrabold text-burgundy after:absolute after:bottom-[-9px] after:left-0 after:right-0 after:h-0.5 after:bg-burgundy'
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
                className="w-full rounded border border-ivory-300 bg-ivory-50 px-3 py-1.5 text-xs text-espresso transition-colors focus:border-burgundy focus:bg-white focus:outline-none"
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
          <div className="shadow-2xs overflow-hidden rounded-lg border border-ivory-300 bg-white">
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-xs">
                <thead>
                  <tr className="border-b border-ivory-300 bg-ivory-50 text-[11px] font-semibold uppercase tracking-wider text-outline">
                    <th className="min-w-[200px] px-4 py-3">CUSTOMER</th>
                    <th className="min-w-[130px] px-4 py-3">MOBILE</th>
                    <th className="min-w-[90px] px-4 py-3">TYPE</th>
                    <th className="min-w-[100px] px-4 py-3 text-right">
                      BOUGHT
                    </th>
                    <th className="min-w-[110px] px-4 py-3 text-right">
                      CREDIT LIMIT
                    </th>
                    <th className="min-w-[100px] px-4 py-3 text-right">DUE</th>
                    <th className="w-12 px-3 py-3 text-center"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {isLoadingCustomers ? (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-outline"
                      >
                        <div className="mb-1 inline-block h-5 w-5 animate-spin rounded-full border-2 border-burgundy border-t-transparent"></div>
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
                          className="transition-colors hover:bg-ivory-50/50"
                        >
                          {/* Avatar & Customer Name */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-3">
                              <span
                                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold ${avatarStyle}`}
                              >
                                {initials}
                              </span>
                              <div>
                                <p className="text-[13px] font-bold leading-tight text-espresso">
                                  {customer.name}
                                </p>
                                {customer.customerType === 'B2B' &&
                                  customer.gstin && (
                                    <p className="font-mono mt-0.5 text-[10px] text-outline">
                                      GSTIN {customer.gstin}
                                    </p>
                                  )}
                                {customer.businessName &&
                                  customer.businessName !== customer.name && (
                                    <p className="mt-0.5 text-[11px] text-outline">
                                      {customer.businessName}
                                    </p>
                                  )}
                              </div>
                            </div>
                          </td>

                          {/* Mobile */}
                          <td className="font-mono whitespace-nowrap px-4 py-3.5 text-xs text-espresso">
                            +91 {customer.mobile}
                          </td>

                          {/* Type */}
                          <td className="px-4 py-3.5">
                            <span
                              className={`rounded px-2 py-0.5 text-[11px] font-semibold ${
                                customer.customerType === 'B2B'
                                  ? 'bg-[#EAE4DC] text-[#635343]'
                                  : 'bg-ivory-100 text-espresso'
                              }`}
                            >
                              {customer.customerType}
                            </span>
                          </td>

                          {/* Bought */}
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-espresso">
                            {inr(customer.totalBought)}
                          </td>

                          {/* Credit Limit */}
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-espresso">
                            {customer.creditLimit > 0
                              ? inr(customer.creditLimit)
                              : '₹0'}
                          </td>

                          {/* Due */}
                          <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold">
                            {customer.balanceDue > 0 ? (
                              <span className="text-rose-700">
                                {inr(customer.balanceDue)}
                              </span>
                            ) : (
                              <span className="text-outline">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-3 py-3.5 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                title="Edit Customer"
                                onClick={() => handleEditClick(customer)}
                                className="cursor-pointer p-1 text-outline transition-colors hover:text-burgundy"
                              >
                                <Pencil size={13} />
                              </button>
                              <button
                                type="button"
                                title="Bill Customer (POS)"
                                onClick={() =>
                                  navigate({
                                    to: '/shop-admin/new-bill',
                                    search: {phone: customer.mobile} as never,
                                  })
                                }
                                className="cursor-pointer p-1 text-outline transition-colors hover:text-espresso"
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
                      <td
                        colSpan={7}
                        className="py-12 text-center text-outline"
                      >
                        <Users
                          size={32}
                          className="mx-auto mb-2 text-outline/40"
                          strokeWidth={1.5}
                        />
                        <p className="text-sm font-bold text-espresso">
                          No Customers Found
                        </p>
                        <p className="mt-0.5 text-xs text-outline">
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
        <div className="w-full shrink-0 lg:w-[350px]">
          <div className="shadow-2xs sticky top-4 rounded-lg border border-ivory-300 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="font-serif text-lg font-bold text-espresso">
                {editingCustomerId ? 'Edit customer' : 'Add customer'}
              </h2>
              {editingCustomerId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="cursor-pointer text-xs text-outline hover:text-espresso"
                >
                  Cancel
                </button>
              )}
            </div>

            <form onSubmit={handleSaveCustomer} className="space-y-4 text-xs">
              {/* NAME */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-outline">
                  NAME *
                </label>
                <input
                  id="customer-name-input"
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="e.g. Kavita Desai"
                  aria-invalid={!!formErrors.name}
                  className={`w-full rounded border bg-ivory-50 px-3 py-2 text-xs text-espresso focus:border-burgundy focus:bg-white focus:outline-none ${formErrors.name ? 'border-error' : 'border-ivory-300'}`}
                />
                {formErrors.name && (
                  <p className="field-error">{formErrors.name}</p>
                )}
              </div>

              {/* MOBILE */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-outline">
                  MOBILE *
                </label>
                <div
                  className={`flex items-center rounded border bg-ivory-50 focus-within:border-burgundy focus-within:bg-white ${formErrors.mobile ? 'border-error' : 'border-ivory-300'}`}
                >
                  <span className="font-mono select-none border-r border-ivory-300 px-3 py-2 text-xs text-outline">
                    +91
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={11}
                    required
                    value={formMobile}
                    onChange={(e) => setFormMobile(e.target.value)}
                    placeholder="90960 77821"
                    aria-invalid={!!formErrors.mobile}
                    className="font-mono w-full bg-transparent px-3 py-2 text-xs text-espresso focus:outline-none"
                  />
                </div>
                {formErrors.mobile ? (
                  <p className="field-error">{formErrors.mobile}</p>
                ) : (
                  <p className="mt-1 text-[10px] font-medium text-outline">
                    Used to find the customer at the counter
                  </p>
                )}
              </div>

              {/* CUSTOMER TYPE */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-outline">
                  CUSTOMER TYPE
                </label>
                <select
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as CustomerType)}
                  className="w-full cursor-pointer rounded border border-ivory-300 bg-ivory-50 px-3 py-2 text-xs text-espresso focus:border-burgundy focus:bg-white focus:outline-none"
                >
                  <option value="Retail">Retail</option>
                  <option value="B2B">B2B</option>
                </select>
              </div>

              {/* BUSINESS NAME (FOR B2B) */}
              {formType === 'B2B' && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-outline">
                    BUSINESS NAME
                  </label>
                  <input
                    type="text"
                    value={formBusinessName}
                    onChange={(e) => setFormBusinessName(e.target.value)}
                    placeholder="For B2B (e.g. Shree Boutique)"
                    className="w-full rounded border border-ivory-300 bg-ivory-50 px-3 py-2 text-xs text-espresso focus:border-burgundy focus:bg-white focus:outline-none"
                  />
                </div>
              )}

              {/* GSTIN */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-outline">
                  GSTIN
                </label>
                <input
                  type="text"
                  value={formGstin}
                  onChange={(e) => setFormGstin(e.target.value.toUpperCase())}
                  placeholder="27XXXXX0000X1Z5"
                  maxLength={15}
                  aria-invalid={!!formErrors.gstin}
                  className={`font-mono w-full rounded border bg-ivory-50 px-3 py-2 text-xs uppercase text-espresso focus:border-burgundy focus:bg-white focus:outline-none ${formErrors.gstin ? 'border-error' : 'border-ivory-300'}`}
                />
                {formErrors.gstin ? (
                  <p className="field-error">{formErrors.gstin}</p>
                ) : (
                  <p className="mt-1 text-[10px] font-medium text-outline">
                    Needed for B2B tax invoice
                  </p>
                )}
              </div>

              {/* ADDRESS */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-outline">
                  ADDRESS
                </label>
                <textarea
                  rows={2}
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Street, City, Pincode"
                  className="w-full resize-none rounded border border-ivory-300 bg-ivory-50 px-3 py-2 text-xs text-espresso focus:border-burgundy focus:bg-white focus:outline-none"
                />
              </div>

              {/* CREDIT LIMIT */}
              <div>
                <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-outline">
                  CREDIT LIMIT (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  value={formCreditLimit}
                  onChange={(e) => setFormCreditLimit(e.target.value)}
                  placeholder="e.g. 10000"
                  aria-invalid={!!formErrors.creditLimit}
                  className="font-mono w-full rounded border border-ivory-300 bg-ivory-50 px-3 py-2 text-xs text-espresso focus:border-burgundy focus:bg-white focus:outline-none"
                />
                {formErrors.creditLimit && (
                  <p className="field-error">{formErrors.creditLimit}</p>
                )}
              </div>

              {/* OPENING DUE (ONLY ON CREATE) */}
              {!editingCustomerId && (
                <div>
                  <label className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-outline">
                    OPENING DUE (₹)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    value={formOpeningDue}
                    onChange={(e) => setFormOpeningDue(e.target.value)}
                    placeholder="0"
                    className="font-mono w-full rounded border border-ivory-300 bg-ivory-50 px-3 py-2 text-xs text-espresso focus:border-burgundy focus:bg-white focus:outline-none"
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
                  className="shadow-2xs w-full cursor-pointer rounded bg-burgundy py-3 text-xs font-bold uppercase tracking-wider text-white transition-colors hover:bg-burgundy-deep disabled:opacity-50"
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
      {/* Website shoppers of this shop (not on credit, so listed apart) */}
      <div className="px-4 pb-8 md:px-8">
        <OnlineBuyers />
      </div>

      {showImportModal && (
        <div className="backdrop-blur-xs fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4">
          <div className="animate-in fade-in zoom-in-95 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-ivory-300 bg-white p-4 shadow-2xl duration-150 sm:p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-serif text-lg font-bold text-espresso">
                Import Customers
              </h3>
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="cursor-pointer text-outline hover:text-espresso"
              >
                <X size={18} />
              </button>
            </div>

            <p className="mb-4 text-xs text-outline">
              Upload a CSV file containing columns: <strong>Name</strong>,{' '}
              <strong>Mobile</strong>, <strong>Type</strong> (Retail/B2B),{' '}
              <strong>GSTIN</strong>, <strong>CreditLimit</strong>.
            </p>

            <div className="rounded-lg border-2 border-dashed border-ivory-300 bg-ivory-50 p-6 text-center">
              <Upload size={32} className="mx-auto mb-2 text-outline/60" />
              <p className="text-xs font-bold text-espresso">
                Select CSV File to Upload
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                className="mt-3 block w-full cursor-pointer text-xs text-outline file:mr-4 file:rounded file:border-0 file:bg-burgundy file:px-4 file:py-1.5 file:text-xs file:font-semibold file:text-white hover:file:bg-burgundy-deep"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowImportModal(false)}
                className="cursor-pointer rounded border border-ivory-300 px-4 py-2 text-xs font-semibold text-espresso hover:bg-ivory-100"
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
