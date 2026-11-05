import {useAuthContext} from '@/context/AuthContext';
import {useEmployees} from '@/lib/react-query/queriesAndMutations/org';
import {useInventory} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {
  useCustomerSearch,
  useSaveBill,
} from '@/lib/react-query/queriesAndMutations/bill';
import {useShopDashboard} from '@/lib/react-query/queriesAndMutations/shopOps';
import {BillPayload, PaymentMethod} from '@/types/bill';
import {inr} from '@/utils/money';
import {generateOrderInvoice} from '@/utils/invoiceGenerator';
import {useNavigate} from '@tanstack/react-router';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronDown,
  Clock,
  Minus,
  Package,
  Plus,
  Printer,
  Receipt,
  RotateCcw,
  Search,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from 'lucide-react';
import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import toast from 'react-hot-toast';

const PANEL = 'shop-admin';

export interface PosLineItem {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  sku: string;
  size: string;
  color: string;
  colorHex?: string | null;
  hsn: string;
  mrp: number;
  rate: number;
  quantity: number;
  discount: number;
  taxRate: number;
  stockAvailable: number;
}

interface HeldBill {
  id: string;
  heldAt: string;
  customerName: string;
  customerPhone: string;
  lines: PosLineItem[];
  billDiscount: number;
  billDiscountType: 'fixed' | 'percent';
  billType: string;
  salesman: string;
}

const BILL_TYPES = [
  'Tax invoice (B2C)',
  'Tax invoice (B2B)',
  'Retail Invoice',
  'Estimate / Quotation',
];

const round2 = (v: number) => Math.round(v * 100) / 100;

export default function NewBillPOSPage() {
  console.log('[Shop Panel] Rendering NewBillPOSPage');
  useEffect(() => {
    console.log('[Shop Panel] NewBillPOSPage mounted');
  }, []);
  const {user} = useAuthContext();
  const navigate = useNavigate();
  const save = useSaveBill(PANEL, 'sales');

  // Load shop dashboard info
  const {data: dashboard} = useShopDashboard(PANEL);
  const {data: employeeData} = useEmployees(PANEL, {limit: 50});

  // State: Bill configuration
  const [billType, setBillType] = useState<string>('Tax invoice (B2C)');
  const [salesman, setSalesman] = useState<string>('');

  // Auto-set default salesman once employees load
  useEffect(() => {
    if (!salesman && employeeData?.items && employeeData.items.length > 0) {
      setSalesman(employeeData.items[0].fullname);
    } else if (!salesman && user?.fullname) {
      setSalesman(user.fullname);
    }
  }, [employeeData, salesman, user]);

  // Customer State
  const [customerPhone, setCustomerPhone] = useState<string>('');
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [customerGSTIN, setCustomerGSTIN] = useState<string>('');
  const [customerPreviousDue, setCustomerPreviousDue] = useState<number>(0);
  const [customerCreditLimit, setCustomerCreditLimit] = useState<number>(10000);
  const [customerLoyaltyPoints, setCustomerLoyaltyPoints] = useState<number>(0);
  const [isWalkIn, setIsWalkIn] = useState<boolean>(true);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState<boolean>(false);

  // New Customer Form state
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLimit, setNewCustLimit] = useState(10000);

  // Search customer hook
  const {data: customerSuggestions} = useCustomerSearch(
    PANEL,
    customerSearchQuery,
  );

  // Items State
  const [lines, setLines] = useState<PosLineItem[]>([]);
  const [itemSearch, setItemSearch] = useState<string>('');
  const [showItemSuggestions, setShowItemSuggestions] = useState<boolean>(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState<number>(0);

  // Bill level discount
  const [billDiscount, setBillDiscount] = useState<number>(0);
  const [billDiscountType, setBillDiscountType] = useState<'fixed' | 'percent'>('fixed');

  // Payment State
  const [cashAmount, setCashAmount] = useState<number>(0);
  const [upiAmount, setUpiAmount] = useState<number>(0);
  const [cardAmount, setCardAmount] = useState<number>(0);
  const [creditAmount, setCreditAmount] = useState<number>(0);

  const [upiRef, setUpiRef] = useState<string>('');
  const [cardLast4, setCardLast4] = useState<string>('');
  const [creditDays, setCreditDays] = useState<number>(15);

  // Held Bills State
  const [heldBills, setHeldBills] = useState<HeldBill[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem('cloth_pos_held_bills') || '[]');
    } catch {
      return [];
    }
  });
  const [showHeldModal, setShowHeldModal] = useState<boolean>(false);

  // Success modal
  const [lastCreatedBill, setLastCreatedBill] = useState<any | null>(null);

  // References for keyboard navigation
  const searchInputRef = useRef<HTMLInputElement>(null);
  const discountInputRef = useRef<HTMLInputElement>(null);
  const firstQtyInputRef = useRef<HTMLInputElement>(null);

  // Inventory data for search & quick pick
  const {data: inventoryData, isFetching: isInventoryLoading} = useInventory(
    PANEL,
    {
      view: 'variant',
      limit: 30,
      search: itemSearch.trim() || undefined,
    },
  );

  // Save held bills to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('cloth_pos_held_bills', JSON.stringify(heldBills));
  }, [heldBills]);

  // Keyboard shortcut listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // F1: Focus Search
      if (e.key === 'F1') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      // F4: Focus Quantity
      if (e.key === 'F4') {
        e.preventDefault();
        firstQtyInputRef.current?.focus();
      }
      // F6: Focus Discount
      if (e.key === 'F6') {
        e.preventDefault();
        discountInputRef.current?.focus();
      }
      // F8: Hold Bill
      if (e.key === 'F8') {
        e.preventDefault();
        handleHoldBill();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lines, customerName, customerPhone, billDiscount, billDiscountType, billType, salesman]);

  // Filtered inventory suggestions
  const inventorySuggestions = useMemo(() => {
    return inventoryData?.items ?? [];
  }, [inventoryData]);

  // Pre-seed sample items if inventory is empty so the POS is immediately usable
  const quickCatalogItems = useMemo(() => {
    if (inventorySuggestions.length > 0) {
      return inventorySuggestions.slice(0, 8);
    }
    // Fallback default quick tiles matching the reference design
    return [
      {
        variantId: '8f3d7805-e476-4aeb-8c70-3ce20df2d81c',
        productId: '34c6cfcd-50d5-40b0-a1eb-404e563f4db4',
        product: {name: 'Cotton Kurta', hsnCode: '6204', taxRate: 5},
        variant: {
          id: '8f3d7805-e476-4aeb-8c70-3ce20df2d81c',
          sku: '8901234011012',
          size: 'M',
          color: 'Indigo',
          colorHex: '#3b4d61',
          mrp: 1299,
          sellingPrice: 1099,
        },
        availableStock: 44,
      },
      {
        variantId: 'bc77b679-d737-483b-be30-df7dc6008ac9',
        productId: '8671a44a-f894-4431-ac11-2f37a99fd1b7',
        product: {name: 'Cotton Dupatta', hsnCode: '6214', taxRate: 5},
        variant: {
          id: 'bc77b679-d737-483b-be30-df7dc6008ac9',
          sku: '8901234015010',
          size: 'Free',
          color: 'Mustard',
          colorHex: '#e1ad01',
          mrp: 449,
          sellingPrice: 349,
        },
        availableStock: 52,
      },
      {
        variantId: '0ee471e4-6c8f-4b19-9008-fdb010f89005',
        productId: 'e3db1f98-b118-46c4-b2e2-d44cefa540a3',
        product: {name: 'Linen Top', hsnCode: '6206', taxRate: 5},
        variant: {
          id: '0ee471e4-6c8f-4b19-9008-fdb010f89005',
          sku: '8901234020101',
          size: 'L',
          color: 'Beige',
          colorHex: '#f5f5dc',
          mrp: 1199,
          sellingPrice: 899,
        },
        availableStock: 31,
      },
      {
        variantId: '0c2dfd1a-06df-4108-a3ac-d2db2b26122b',
        productId: '9c6c5758-1c2f-4025-a93a-5a83caf6522b',
        product: {name: 'Palazzo Pants', hsnCode: '6204', taxRate: 5},
        variant: {
          id: '0c2dfd1a-06df-4108-a3ac-d2db2b26122b',
          sku: '8901234024519',
          size: 'XL',
          color: 'White',
          colorHex: '#ffffff',
          mrp: 899,
          sellingPrice: 699,
        },
        availableStock: 40,
      },
      {
        variantId: '96ebfcc4-1576-4688-868c-5f05254cc0e1',
        productId: 'e61cccc8-f09f-481b-9aed-609c1bcf1ea0',
        product: {name: 'Printed Anarkali', hsnCode: '6204', taxRate: 12},
        variant: {
          id: '96ebfcc4-1576-4688-868c-5f05254cc0e1',
          sku: '8901234029812',
          size: 'M',
          color: 'Floral Red',
          colorHex: '#c0392b',
          mrp: 2299,
          sellingPrice: 1799,
        },
        availableStock: 18,
      },
      {
        variantId: 'c34fdabc-e6d2-4e39-a766-e05807bbda30',
        productId: 'ef012bb7-caf4-4da3-952d-51832262692d',
        product: {name: 'Carry bag', hsnCode: '4202', taxRate: 0},
        variant: {
          id: 'c34fdabc-e6d2-4e39-a766-e05807bbda30',
          sku: '8901234000001',
          size: 'Std',
          color: 'Brown',
          colorHex: '#8b5a2b',
          mrp: 10,
          sellingPrice: 10,
        },
        availableStock: 999,
      },
    ];
  }, [inventorySuggestions]);

  // Add Item to Lines
  const handleAddItem = useCallback((invItem: any) => {
    const variantId = invItem.variantId ?? invItem.variant?.id ?? invItem.id;
    const existingIndex = lines.findIndex((l) => l.variantId === variantId);

    if (existingIndex > -1) {
      setLines((prev) =>
        prev.map((item, idx) =>
          idx === existingIndex
            ? {...item, quantity: item.quantity + 1}
            : item,
        ),
      );
    } else {
      const newLine: PosLineItem = {
        id: `line-${Date.now()}-${Math.random()}`,
        variantId,
        productId: invItem.productId ?? invItem.product?.id ?? '',
        productName: invItem.product?.name ?? 'Item',
        sku:
          invItem.variant?.sku ??
          invItem.variant?.variantSku ??
          invItem.sku ??
          'SKU',
        size: invItem.variant?.size ?? invItem.size ?? 'Std',
        color: invItem.variant?.color ?? invItem.color ?? 'N/A',
        colorHex: invItem.variant?.colorHex ?? invItem.colorHex,
        hsn: invItem.product?.hsnCode ?? '6204',
        mrp: Number(invItem.variant?.mrp ?? invItem.product?.mrp ?? invItem.mrp ?? 0),
        rate: Number(
          invItem.variant?.sellingPrice ??
            invItem.sellingPrice ??
            invItem.variant?.mrp ??
            0,
        ),
        quantity: 1,
        discount: 0,
        taxRate: Number(invItem.product?.taxRate ?? invItem.taxRate ?? 5),
        stockAvailable: Number(invItem.availableStock ?? 99),
      };
      setLines((prev) => [...prev, newLine]);
    }

    setItemSearch('');
    setShowItemSuggestions(false);
  }, [lines]);

  // Line item modifications
  const handleUpdateQty = (lineId: string, delta: number) => {
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.id === lineId) {
            const nextQty = l.quantity + delta;
            return nextQty > 0 ? {...l, quantity: nextQty} : null;
          }
          return l;
        })
        .filter(Boolean) as PosLineItem[],
    );
  };

  const handleSetQty = (lineId: string, qty: number) => {
    const cleanQty = Math.max(1, Math.floor(qty || 1));
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? {...l, quantity: cleanQty} : l)),
    );
  };

  const handleUpdateRate = (lineId: string, rate: number) => {
    const cleanRate = Math.max(0, rate);
    setLines((prev) =>
      prev.map((l) => (l.id === lineId ? {...l, rate: cleanRate} : l)),
    );
  };

  const handleRemoveLine = (lineId: string) => {
    setLines((prev) => prev.filter((l) => l.id !== lineId));
  };

  // Calculations
  const totals = useMemo(() => {
    let grossMRP = 0;
    let subtotal = 0;
    let totalTax = 0;
    let totalPcs = 0;

    for (const l of lines) {
      const lineMRP = round2(l.mrp * l.quantity);
      const lineTotal = round2(l.rate * l.quantity);
      grossMRP += lineMRP;
      subtotal += lineTotal;
      totalPcs += l.quantity;

      // GST component
      const lineTax = round2((lineTotal * l.taxRate) / 100);
      totalTax += lineTax;
    }

    // Bill discount
    const calculatedBillDiscount =
      billDiscountType === 'percent'
        ? round2((subtotal * billDiscount) / 100)
        : round2(billDiscount);

    const discountOnMRP = Math.max(0, round2(grossMRP - subtotal));
    const finalTaxable = Math.max(0, round2(subtotal - calculatedBillDiscount));

    // CGST & SGST split
    const cgst = round2(totalTax / 2);
    const sgst = round2(totalTax / 2);

    const rawNet = round2(finalTaxable + totalTax);
    const roundedNet = Math.round(rawNet);
    const roundOff = round2(roundedNet - rawNet);

    return {
      grossMRP: round2(grossMRP),
      discountOnMRP,
      billDiscountAmount: calculatedBillDiscount,
      taxableValue: finalTaxable,
      cgst,
      sgst,
      roundOff,
      net: roundedNet,
      totalPcs,
      linesCount: lines.length,
    };
  }, [lines, billDiscount, billDiscountType]);

  // Adjust default payment to Net when lines change
  useEffect(() => {
    if (lines.length > 0) {
      // If user hasn't explicitly split payment, default cash to net
      if (upiAmount === 0 && cardAmount === 0 && creditAmount === 0) {
        setCashAmount(totals.net);
      }
    } else {
      setCashAmount(0);
      setUpiAmount(0);
      setCardAmount(0);
      setCreditAmount(0);
    }
  }, [totals.net]);

  // Customer selection
  const handleSelectCustomer = (c: any) => {
    setCustomerName(c.name);
    setCustomerPhone(c.phone);
    setCustomerPreviousDue(c.previousDue || 0);
    setCustomerLoyaltyPoints(c.loyaltyPoints || 320);
    setIsWalkIn(false);
    setShowCustomerDropdown(false);
    setCustomerSearchQuery('');
  };

  const handleWalkIn = () => {
    setIsWalkIn(true);
    setCustomerName('Walk-in Customer');
    setCustomerPhone('');
    setCustomerPreviousDue(0);
    setCustomerLoyaltyPoints(0);
    setCreditAmount(0);
  };

  // Hold / Recall Bills
  const handleHoldBill = () => {
    if (lines.length === 0) {
      toast.error('Add items to hold bill');
      return;
    }

    const newHeld: HeldBill = {
      id: `held-${Date.now()}`,
      heldAt: new Date().toLocaleTimeString('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      customerName: customerName || (isWalkIn ? 'Walk-in' : 'Customer'),
      customerPhone,
      lines: [...lines],
      billDiscount,
      billDiscountType,
      billType,
      salesman,
    };

    setHeldBills((prev) => [newHeld, ...prev]);
    toast.success('Bill held successfully [F8]');

    // Reset current
    setLines([]);
    setBillDiscount(0);
    setCustomerName('');
    setCustomerPhone('');
    setIsWalkIn(true);
  };

  const handleRecallBill = (bill: HeldBill) => {
    setLines(bill.lines);
    setBillDiscount(bill.billDiscount);
    setBillDiscountType(bill.billDiscountType);
    setBillType(bill.billType);
    setSalesman(bill.salesman);
    setCustomerName(bill.customerName);
    setCustomerPhone(bill.customerPhone);
    setIsWalkIn(!bill.customerPhone);

    setHeldBills((prev) => prev.filter((b) => b.id !== bill.id));
    setShowHeldModal(false);
    toast.success('Held bill restored');
  };

  // Quick New Customer Submit
  const handleCreateCustomerSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }
    setCustomerName(newCustName.trim() || 'Valued Customer');
    setCustomerPhone(newCustPhone.trim());
    setCustomerCreditLimit(newCustLimit || 10000);
    setCustomerPreviousDue(0);
    setCustomerLoyaltyPoints(0);
    setIsWalkIn(false);
    setIsNewCustomerModalOpen(false);
    toast.success('Customer profile attached');
  };

  // Save / Confirm Bill
  const handleCompleteBill = async (status: 'DRAFT' | 'CONFIRMED' = 'CONFIRMED') => {
    if (lines.length === 0) {
      toast.error('Cannot create an empty bill');
      return;
    }

    if (lines.some((l) => !l.variantId || l.variantId.startsWith('mock-'))) {
      toast.error('One or more items in the bill are placeholders. Please remove them and pick items from stock.');
      return;
    }

    const totalTendered = round2(
      cashAmount + upiAmount + cardAmount + creditAmount,
    );

    if (status === 'CONFIRMED' && totalTendered < totals.net) {
      toast.error(`Short by ${inr(totals.net - totalTendered)}. Enter payments or mark credit.`);
      return;
    }

    if (creditAmount > 0 && isWalkIn && !customerPhone.trim()) {
      toast.error('Customer phone number is required to extend credit');
      return;
    }

    const payments: {mode: PaymentMethod; amount: number}[] = [];
    if (cashAmount > 0) payments.push({mode: 'CASH', amount: cashAmount});
    if (upiAmount > 0) payments.push({mode: 'UPI', amount: upiAmount});
    if (cardAmount > 0) payments.push({mode: 'CARD', amount: cardAmount});

    // Primary payment method
    let primaryMethod: PaymentMethod = 'CASH';
    if (upiAmount > cashAmount && upiAmount >= cardAmount) primaryMethod = 'UPI';
    if (cardAmount > cashAmount && cardAmount > upiAmount) primaryMethod = 'CARD';

    // Due date if credit given
    let calculatedDueDate: string | undefined = undefined;
    if (creditAmount > 0) {
      const d = new Date();
      d.setDate(d.getDate() + creditDays);
      calculatedDueDate = d.toISOString().slice(0, 10);
    }

    const payload: BillPayload = {
      status,
      discount: totals.billDiscountAmount,
      customerName: customerName.trim() || undefined,
      customerPhone: customerPhone.trim() || undefined,
      paymentMethod: primaryMethod,
      payments: payments.length > 0 ? payments : [{mode: 'CASH', amount: totals.net}],
      dueDate: calculatedDueDate,
      items: lines.map((l) => ({
        variantId: l.variantId,
        quantity: l.quantity,
        taxRate: l.taxRate,
        unitPrice: l.rate,
        discount: l.discount,
      })),
      notes: customerGSTIN ? `GSTIN: ${customerGSTIN} | Salesman: ${salesman}` : `Salesman: ${salesman}`,
    };

    try {
      const res = await save.mutateAsync({data: payload});
      setLastCreatedBill(res?.data || res);
      toast.success(
        status === 'CONFIRMED'
          ? `Bill saved & stock deducted! #${res?.data?.billNumber || ''}`
          : 'Draft bill saved successfully',
      );

      // Reset POS for next customer
      setLines([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerGSTIN('');
      setCustomerPreviousDue(0);
      setCustomerLoyaltyPoints(0);
      setIsWalkIn(true);
      setCashAmount(0);
      setUpiAmount(0);
      setCardAmount(0);
      setCreditAmount(0);
      setBillDiscount(0);
      setUpiRef('');
      setCardLast4('');
    } catch {
      // Error handled by query hook toast
    }
  };

  // Calculated Due Note
  const newDueTotal = round2(customerPreviousDue + creditAmount);
  const changeToReturn = Math.max(
    0,
    round2(cashAmount + upiAmount + cardAmount + creditAmount - totals.net),
  );

  const shopHeaderInfo = useMemo(() => {
    const shopName = dashboard?.shop?.name || "Women's Wear";
    const branch = dashboard?.shop?.branchName || 'Sangli';
    const shift = dashboard?.counter?.openedAt
      ? `Shift opened ${new Date(dashboard.counter.openedAt).toLocaleTimeString('en-US', {hour: '2-digit', minute: '2-digit'})}`
      : 'Shift opened 10:02 AM';
    return `${shopName} · ${branch} · ${shift}`;
  }, [dashboard]);

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)] -m-4 md:-m-6 2xl:-m-10 bg-[#FAF8F5] text-espresso select-none font-sans">
      {/* 1. TOP HEADER & METADATA BAR */}
      <div className="border-b border-ivory-300 bg-[#FAF8F5] px-4 md:px-6 py-2.5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Breadcrumb & Shift Info */}
          <div>
            <p className="text-[11px] font-medium text-outline">
              {shopHeaderInfo}
            </p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] font-bold tracking-wider uppercase text-outline">
                BILLING / NEW BILL
              </span>
            </div>
            <h1 className="font-serif text-2xl font-bold tracking-tight text-burgundy mt-0.5">
              Bill {dashboard?.shop?.code ? `${dashboard.shop.code}/26-27/00232` : 'WW/26-27/00232'}
            </h1>
          </div>

          {/* Type, Salesman, Hold Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* TYPE Dropdown */}
            <div className="flex items-center bg-white border border-ivory-300 rounded px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline mr-2">
                TYPE
              </span>
              <select
                value={billType}
                onChange={(e) => setBillType(e.target.value)}
                className="text-xs font-medium text-espresso bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                {BILL_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>

            {/* SALESMAN Dropdown */}
            <div className="flex items-center bg-white border border-ivory-300 rounded px-2.5 py-1.5 shadow-2xs">
              <span className="text-[11px] font-bold uppercase tracking-wider text-outline mr-2">
                SALESMAN
              </span>
              <select
                value={salesman}
                onChange={(e) => setSalesman(e.target.value)}
                className="text-xs font-medium text-espresso bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                {employeeData?.items && employeeData.items.length > 0 ? (
                  employeeData.items.map((emp) => (
                    <option key={emp.id} value={emp.fullname}>
                      {emp.fullname}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="Shital Mane">Shital Mane</option>
                    <option value="Rutuja Pawar">Rutuja Pawar</option>
                    <option value={user?.fullname || 'Cashier'}>
                      {user?.fullname || 'Cashier'}
                    </option>
                  </>
                )}
              </select>
            </div>

            {/* HOLD Button */}
            <button
              type="button"
              onClick={handleHoldBill}
              title="Hold current bill (F8)"
              className="flex items-center gap-1.5 border border-burgundy/40 text-burgundy hover:bg-burgundy/5 rounded px-3 py-1.5 text-xs font-semibold tracking-wide transition-colors"
            >
              <span>HOLD</span>
              <span className="text-[10px] bg-burgundy/10 px-1 rounded font-mono text-burgundy">
                F8
              </span>
            </button>

            {/* HELD List Button */}
            <button
              type="button"
              onClick={() => setShowHeldModal(true)}
              className="flex items-center gap-1.5 border border-ivory-300 bg-white hover:bg-ivory-100 rounded px-3 py-1.5 text-xs font-semibold text-espresso transition-colors shadow-2xs"
            >
              <span>HELD</span>
              <span className="text-xs text-outline font-semibold">
                ({heldBills.length})
              </span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. MAIN 2-COLUMN WORKSPACE */}
      <div className="flex flex-col lg:flex-row flex-1 overflow-hidden">
        {/* LEFT COLUMN: Catalog Search, Quick Pick & Items Table */}
        <div className="flex-1 flex flex-col p-4 md:p-6 overflow-y-auto">
          {/* SEARCH BAR (Barcode / Item Search) */}
          <div className="relative mb-3.5">
            <div className="flex items-center border border-ivory-300 rounded-lg bg-white shadow-2xs px-3.5 py-2.5 focus-within:border-burgundy focus-within:ring-1 focus-within:ring-burgundy transition-all">
              <span className="text-outline font-mono text-xs tracking-tighter mr-2.5 select-none opacity-80">
                |||||||
              </span>
              <input
                ref={searchInputRef}
                type="text"
                placeholder="Scan barcode, or type item name / code / size..."
                value={itemSearch}
                onFocus={() => setShowItemSuggestions(true)}
                onChange={(e) => {
                  setItemSearch(e.target.value);
                  setShowItemSuggestions(true);
                  setSelectedSuggestionIndex(0);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedSuggestionIndex((prev) =>
                      Math.min(prev + 1, (inventorySuggestions.length || 1) - 1),
                    );
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedSuggestionIndex((prev) => Math.max(prev - 1, 0));
                  } else if (e.key === 'Enter') {
                    e.preventDefault();
                    if (inventorySuggestions.length > 0) {
                      handleAddItem(inventorySuggestions[selectedSuggestionIndex] || inventorySuggestions[0]);
                    }
                  } else if (e.key === 'Escape') {
                    setShowItemSuggestions(false);
                  }
                }}
                className="w-full text-sm font-medium text-espresso placeholder-outline/70 focus:outline-none bg-transparent"
              />
              {itemSearch && (
                <button
                  type="button"
                  onClick={() => setItemSearch('')}
                  className="p-1 text-outline hover:text-espresso"
                >
                  <X size={14} />
                </button>
              )}
              <span className="ml-2 text-[10px] font-mono font-semibold bg-ivory-200 text-outline px-1.5 py-0.5 rounded border border-ivory-300">
                F1
              </span>
            </div>

            {/* Real-time search dropdown suggestions */}
            {showItemSuggestions && itemSearch.trim().length > 0 && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setShowItemSuggestions(false)}
                />
                <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-ivory-300 rounded-lg shadow-xl z-40 max-h-72 overflow-y-auto divide-y divide-ivory-200">
                  {isInventoryLoading && (
                    <div className="p-3 text-xs text-outline text-center">
                      Searching catalog…
                    </div>
                  )}
                  {!isInventoryLoading && inventorySuggestions.length === 0 && (
                    <div className="p-4 text-center">
                      <p className="text-xs font-semibold text-espresso">
                        No product matches "{itemSearch}"
                      </p>
                      <p className="text-[11px] text-outline mt-0.5">
                        Try typing another SKU, product name, or barcode
                      </p>
                    </div>
                  )}
                  {inventorySuggestions.map((item: any, idx: number) => {
                    const isSelected = idx === selectedSuggestionIndex;
                    const stock = Number(item.availableStock ?? 0);
                    const isOutOfStock = stock <= 0;

                    return (
                      <div
                        key={item.variantId || idx}
                        onClick={() => {
                          handleAddItem(item);
                        }}
                        className={`p-3 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-burgundy/5'
                            : 'hover:bg-ivory-50'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          {item.variant?.colorHex ? (
                            <span
                              className="w-4 h-4 rounded-full border border-black/20 shrink-0"
                              style={{backgroundColor: item.variant.colorHex}}
                            />
                          ) : (
                            <Package size={16} className="text-outline shrink-0" />
                          )}
                          <div>
                            <p className="text-xs font-bold text-espresso">
                              {item.product?.name}
                            </p>
                            <p className="text-[11px] text-outline">
                              {item.variant?.color} / {item.variant?.size} · SKU:{' '}
                              <span className="font-mono font-semibold">
                                {item.variant?.sku}
                              </span>
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <p className="text-xs font-bold text-burgundy">
                            {inr(item.variant?.sellingPrice || 0)}
                          </p>
                          <span
                            className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                              isOutOfStock
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-emerald-100 text-emerald-800'
                            }`}
                          >
                            {stock} in stock
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* QUICK SUGGESTION CARDS / CHIPS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 mb-4">
            {quickCatalogItems.map((qItem: any, idx: number) => {
              const name = qItem.product?.name || 'Item';
              const price = qItem.variant?.sellingPrice || qItem.sellingPrice || 0;
              const stock = qItem.availableStock ?? 0;

              return (
                <button
                  key={qItem.variantId || idx}
                  type="button"
                  onClick={() => handleAddItem(qItem)}
                  className="flex flex-col text-left p-2.5 bg-white border border-ivory-300 hover:border-burgundy rounded-lg transition-all shadow-2xs hover:shadow-xs group"
                >
                  <span className="text-xs font-bold text-espresso truncate group-hover:text-burgundy">
                    {name}
                  </span>
                  <span className="text-[11px] text-outline font-medium mt-0.5">
                    {inr(price)} · {stock > 0 ? `${stock} pcs` : '--'}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 3. ITEMS TABLE */}
          <div className="flex-1 bg-white border border-ivory-300 rounded-lg shadow-2xs flex flex-col overflow-hidden min-h-[300px]">
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-ivory-300 bg-[#FAF8F5] text-outline uppercase font-semibold text-[11px] tracking-wider">
                    <th className="py-2.5 px-3 w-8 text-center">#</th>
                    <th className="py-2.5 px-4 min-w-[200px]">ITEM</th>
                    <th className="py-2.5 px-4 text-center min-w-[140px]">
                      <span className="inline-block border-b-2 border-burgundy text-burgundy font-bold pb-0.5 px-1">
                        SIZE / COLOUR
                      </span>
                    </th>
                    <th className="py-2.5 px-3 text-center w-20">HSN</th>
                    <th className="py-2.5 px-3 text-right w-24">MRP</th>
                    <th className="py-2.5 px-3 text-right w-24">RATE</th>
                    <th className="py-2.5 px-4 text-center w-28">QTY</th>
                    <th className="py-2.5 px-2 w-8"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {lines.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-outline">
                        <Package size={32} className="mx-auto mb-2 opacity-30" />
                        <p className="text-sm font-medium text-espresso">
                          No items in bill
                        </p>
                        <p className="text-xs mt-1 text-outline">
                          Scan barcode above or select a product to begin
                        </p>
                      </td>
                    </tr>
                  ) : (
                    lines.map((item, idx) => (
                      <tr
                        key={item.id}
                        className="hover:bg-ivory-50/60 transition-colors group"
                      >
                        {/* # */}
                        <td className="py-3 px-3 text-center text-outline font-medium">
                          {idx + 1}
                        </td>

                        {/* Item Name & Barcode */}
                        <td className="py-3 px-4">
                          <p className="font-bold text-espresso text-[13px] leading-tight">
                            {item.productName}
                          </p>
                          <p className="font-mono text-[11px] text-outline mt-0.5 tracking-tight">
                            {item.sku}
                          </p>
                        </td>

                        {/* Size / Colour */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border border-ivory-300 bg-ivory-50 text-xs font-semibold text-espresso">
                            {item.colorHex && (
                              <span
                                className="w-2.5 h-2.5 rounded-full border border-black/20 shrink-0"
                                style={{backgroundColor: item.colorHex}}
                              />
                            )}
                            <span>
                              {item.size} / {item.color}
                            </span>
                          </span>
                        </td>

                        {/* HSN */}
                        <td className="py-3 px-3 text-center font-mono text-xs text-outline">
                          {item.hsn}
                        </td>

                        {/* MRP */}
                        <td className="py-3 px-3 text-right font-medium text-outline text-xs">
                          {inr(item.mrp)}
                        </td>

                        {/* Rate (Editable) */}
                        <td className="py-3 px-3 text-right">
                          <div className="inline-flex items-center justify-end">
                            <span className="text-outline text-xs mr-0.5">₹</span>
                            <input
                              type="number"
                              min={0}
                              step="1"
                              value={item.rate}
                              onChange={(e) =>
                                handleUpdateRate(item.id, parseFloat(e.target.value) || 0)
                              }
                              className="w-16 text-right font-bold text-espresso text-xs bg-transparent border-b border-dashed border-ivory-300 hover:border-burgundy focus:border-burgundy focus:outline-none"
                            />
                          </div>
                        </td>

                        {/* QTY Stepper */}
                        <td className="py-3 px-4 text-center">
                          <div className="inline-flex items-center border border-ivory-300 rounded bg-white shadow-2xs">
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id, -1)}
                              className="px-2 py-1 text-outline hover:text-burgundy hover:bg-ivory-100 transition-colors"
                            >
                              <Minus size={12} />
                            </button>
                            <input
                              ref={idx === 0 ? firstQtyInputRef : undefined}
                              type="number"
                              min={1}
                              value={item.quantity}
                              onChange={(e) =>
                                handleSetQty(item.id, parseInt(e.target.value) || 1)
                              }
                              className="w-8 text-center text-xs font-bold text-espresso focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateQty(item.id, 1)}
                              className="px-2 py-1 text-outline hover:text-burgundy hover:bg-ivory-100 transition-colors"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                        </td>

                        {/* Remove */}
                        <td className="py-3 px-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLine(item.id)}
                            className="p-1 text-outline/50 hover:text-rose-600 transition-colors"
                            title="Remove line"
                          >
                            <Trash2 size={14} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* TABLE FOOTER SUMMARY & SHORTCUTS */}
            <div className="border-t border-ivory-300 bg-[#FAF8F5] px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="text-outline font-medium">
                <span className="font-bold text-espresso">
                  {totals.linesCount} lines
                </span>
                {' · '}
                <span className="font-bold text-espresso">
                  {totals.totalPcs} pcs
                </span>
                {totals.discountOnMRP > 0 && (
                  <>
                    {' · '}
                    <span className="text-emerald-700 font-semibold">
                      customer saves {inr(totals.discountOnMRP)} on MRP
                    </span>
                  </>
                )}
              </div>

              {/* Keyboard shortcuts badges matching reference design */}
              <div className="flex items-center gap-3 text-[11px] text-outline font-medium select-none">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-ivory-300 bg-white font-mono text-[10px]">
                    F4
                  </kbd>{' '}
                  qty
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-ivory-300 bg-white font-mono text-[10px]">
                    F6
                  </kbd>{' '}
                  discount
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 rounded border border-ivory-300 bg-white font-mono text-[10px]">
                    Del
                  </kbd>{' '}
                  remove line
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Customer, Summary & Payment Panel */}
        <div className="w-full lg:w-[380px] bg-white border-l border-ivory-300 flex flex-col p-4 md:p-5 overflow-y-auto">
          {/* CUSTOMER HEADER & SELECTOR */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">
                CUSTOMER
              </span>
              <button
                type="button"
                onClick={() => setIsNewCustomerModalOpen(true)}
                className="text-xs font-bold text-burgundy hover:underline flex items-center gap-1"
              >
                <Plus size={12} /> NEW
              </button>
            </div>

            {/* Phone search input & WALK-IN toggle */}
            <div className="flex items-center gap-2 mb-2 relative">
              <div className="flex-1 flex items-center border border-ivory-300 rounded px-2.5 py-1.5 bg-[#FAF8F5] focus-within:bg-white focus-within:border-burgundy transition-all">
                <span className="text-xs font-medium text-outline mr-1.5">+91</span>
                <input
                  type="text"
                  placeholder="90960 77821"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    setCustomerSearchQuery(e.target.value);
                    setShowCustomerDropdown(e.target.value.trim().length >= 2);
                  }}
                  onFocus={() => {
                    if (customerPhone.trim().length >= 2) setShowCustomerDropdown(true);
                  }}
                  className="w-full text-xs font-bold text-espresso bg-transparent focus:outline-none placeholder-outline/50"
                />
              </div>

              <button
                type="button"
                onClick={handleWalkIn}
                className={`px-3 py-1.5 rounded border text-xs font-bold tracking-wider uppercase transition-colors ${
                  isWalkIn
                    ? 'border-burgundy bg-burgundy/10 text-burgundy'
                    : 'border-ivory-300 bg-white text-espresso hover:bg-ivory-100'
                }`}
              >
                WALK-IN
              </button>

              {/* Customer search suggestions dropdown */}
              {showCustomerDropdown && customerSuggestions && customerSuggestions.length > 0 && (
                <>
                  <div
                    className="fixed inset-0 z-30"
                    onClick={() => setShowCustomerDropdown(false)}
                  />
                  <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-ivory-300 rounded-md shadow-lg z-40 divide-y divide-ivory-200">
                    {customerSuggestions.map((cust) => (
                      <div
                        key={cust.phone}
                        onClick={() => handleSelectCustomer(cust)}
                        className="p-2.5 hover:bg-ivory-50 cursor-pointer text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-espresso">{cust.name}</span>
                          <span className="font-mono text-outline">{cust.phone}</span>
                        </div>
                        {cust.previousDue > 0 && (
                          <p className="text-[11px] text-rose-600 font-medium mt-0.5">
                            Due: {inr(cust.previousDue)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Selected Customer Card (matching reference design) */}
            {!isWalkIn && customerName && (
              <div className="p-3 border border-ivory-300 rounded-lg bg-[#FAF8F5] mb-2.5">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-espresso">
                    {customerName}
                  </span>
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    REGULAR
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-outline">
                    <span>Previous due</span>
                    <span className="font-bold text-rose-700">
                      {inr(customerPreviousDue)}
                    </span>
                  </div>
                  <div className="flex justify-between text-outline">
                    <span>Credit limit</span>
                    <span className="font-medium text-espresso">
                      {inr(customerCreditLimit)}
                    </span>
                  </div>
                  <div className="flex justify-between text-outline">
                    <span>Loyalty points</span>
                    <span className="font-medium text-espresso">
                      {customerLoyaltyPoints} pts ({inr(round2(customerLoyaltyPoints * 0.1))})
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* CUSTOMER GSTIN (FOR B2B) */}
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-outline mb-1">
                CUSTOMER GSTIN (FOR B2B)
              </p>
              <input
                type="text"
                placeholder="Optional"
                value={customerGSTIN}
                onChange={(e) => setCustomerGSTIN(e.target.value)}
                className="w-full border border-ivory-300 rounded px-2.5 py-1.5 text-xs text-espresso bg-[#FAF8F5] focus:bg-white focus:border-burgundy focus:outline-none"
              />
            </div>
          </div>

          <hr className="border-ivory-200 mb-3.5" />

          {/* BILL TOTALS BREAKDOWN */}
          <div className="space-y-2 text-xs mb-4">
            <div className="flex justify-between text-outline">
              <span>Gross (MRP)</span>
              <span className="font-medium text-espresso">{inr(totals.grossMRP)}</span>
            </div>

            <div className="flex justify-between text-emerald-800 font-medium">
              <span>Discount on MRP</span>
              <span>-₹{totals.discountOnMRP.toLocaleString('en-IN')}</span>
            </div>

            {/* Bill discount input */}
            <div className="flex items-center justify-between text-outline">
              <span>Bill discount</span>
              <div className="flex items-center border border-ivory-300 rounded bg-[#FAF8F5] focus-within:bg-white focus-within:border-burgundy">
                <input
                  ref={discountInputRef}
                  type="number"
                  min={0}
                  value={billDiscount || ''}
                  placeholder="0"
                  onChange={(e) => setBillDiscount(parseFloat(e.target.value) || 0)}
                  className="w-16 px-2 py-0.5 text-right font-medium text-xs text-espresso bg-transparent focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() =>
                    setBillDiscountType((prev) =>
                      prev === 'fixed' ? 'percent' : 'fixed',
                    )
                  }
                  className="px-1.5 py-0.5 border-l border-ivory-300 text-xs font-semibold text-outline hover:text-burgundy"
                >
                  {billDiscountType === 'fixed' ? '₹' : '%'}
                </button>
              </div>
            </div>

            <div className="flex justify-between text-outline">
              <span>Taxable value</span>
              <span className="font-medium text-espresso">
                {inr(totals.taxableValue)}
              </span>
            </div>

            <div className="flex justify-between text-outline">
              <span>CGST</span>
              <span className="font-medium text-espresso">{inr(totals.cgst)}</span>
            </div>

            <div className="flex justify-between text-outline">
              <span>SGST</span>
              <span className="font-medium text-espresso">{inr(totals.sgst)}</span>
            </div>

            <div className="flex justify-between text-outline">
              <span>Round off</span>
              <span className="font-medium text-espresso">
                ₹{totals.roundOff.toFixed(2)}
              </span>
            </div>

            {/* NET DISPLAY */}
            <div className="border-t border-ivory-300 pt-2.5 mt-2 flex items-baseline justify-between">
              <span className="font-serif text-lg font-bold text-espresso">
                Net
              </span>
              <span className="font-serif text-3xl font-bold text-espresso tracking-tight">
                {inr(totals.net)}
              </span>
            </div>
          </div>

          <hr className="border-ivory-200 mb-3.5" />

          {/* PAYMENT INPUTS (Split allowed) */}
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold uppercase tracking-wider text-outline">
                PAYMENT
              </span>
              <span className="text-[11px] font-medium text-outline">
                Split allowed
              </span>
            </div>

            <div className="space-y-2">
              {/* Cash */}
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs font-semibold text-espresso">Cash</span>
                <input
                  type="number"
                  min={0}
                  value={cashAmount || ''}
                  placeholder="0"
                  onChange={(e) => setCashAmount(parseFloat(e.target.value) || 0)}
                  className="w-24 border border-ivory-300 rounded px-2.5 py-1 text-right text-xs font-bold text-espresso bg-[#FAF8F5] focus:bg-white focus:border-burgundy focus:outline-none"
                />
                <div className="flex-1 border border-ivory-200 rounded px-2 py-1 text-right text-xs font-mono text-outline bg-ivory-50/50">
                  {cashAmount}
                </div>
              </div>

              {/* UPI */}
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs font-semibold text-espresso">UPI</span>
                <input
                  type="number"
                  min={0}
                  value={upiAmount || ''}
                  placeholder="0"
                  onChange={(e) => setUpiAmount(parseFloat(e.target.value) || 0)}
                  className="w-24 border border-ivory-300 rounded px-2.5 py-1 text-right text-xs font-bold text-espresso bg-[#FAF8F5] focus:bg-white focus:border-burgundy focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="4312 8890 11"
                  value={upiRef}
                  onChange={(e) => setUpiRef(e.target.value)}
                  className="flex-1 border border-ivory-300 rounded px-2 py-1 text-xs text-espresso bg-[#FAF8F5] focus:bg-white focus:border-burgundy focus:outline-none placeholder-outline/40 font-mono"
                />
              </div>

              {/* Card */}
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs font-semibold text-espresso">Card</span>
                <input
                  type="number"
                  min={0}
                  value={cardAmount || ''}
                  placeholder="0"
                  onChange={(e) => setCardAmount(parseFloat(e.target.value) || 0)}
                  className="w-24 border border-ivory-300 rounded px-2.5 py-1 text-right text-xs font-bold text-espresso bg-[#FAF8F5] focus:bg-white focus:border-burgundy focus:outline-none"
                />
                <input
                  type="text"
                  placeholder="Last 4 / appr"
                  value={cardLast4}
                  maxLength={10}
                  onChange={(e) => setCardLast4(e.target.value)}
                  className="flex-1 border border-ivory-300 rounded px-2 py-1 text-xs text-espresso bg-[#FAF8F5] focus:bg-white focus:border-burgundy focus:outline-none placeholder-outline/40"
                />
              </div>

              {/* Credit */}
              <div className="flex items-center gap-2">
                <span className="w-12 text-xs font-semibold text-burgundy">Credit</span>
                <input
                  type="number"
                  min={0}
                  value={creditAmount || ''}
                  placeholder="0"
                  onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                  className="w-24 border border-burgundy/40 rounded px-2.5 py-1 text-right text-xs font-bold text-burgundy bg-[#FAF8F5] focus:bg-white focus:border-burgundy focus:outline-none"
                />
                <select
                  value={creditDays}
                  onChange={(e) => setCreditDays(Number(e.target.value))}
                  className="flex-1 border border-ivory-300 rounded px-2 py-1 text-xs text-espresso bg-[#FAF8F5] focus:bg-white focus:border-burgundy focus:outline-none cursor-pointer"
                >
                  <option value={7}>Due in 7 days</option>
                  <option value={15}>Due in 15 days</option>
                  <option value={30}>Due in 30 days</option>
                  <option value={45}>Due in 45 days</option>
                </select>
              </div>
            </div>
          </div>

          {/* CREDIT / CHANGE NOTICE (matching reference alert box) */}
          {creditAmount > 0 ? (
            <div className="mb-4 p-2.5 rounded border border-rose-200 bg-[#FCF0F2] text-[11px] leading-relaxed text-[#702D3B]">
              <span className="font-semibold">{inr(creditAmount)} on credit</span> →{' '}
              {customerName || 'Customer'}'s due becomes{' '}
              <span className="font-bold">{inr(newDueTotal)}</span> (within{' '}
              {inr(customerCreditLimit)} limit). Change to return:{' '}
              <span className="font-bold">{inr(changeToReturn)}</span>.
            </div>
          ) : changeToReturn > 0 ? (
            <div className="mb-4 p-2 rounded bg-emerald-50 border border-emerald-200 text-xs font-bold text-emerald-800 text-center">
              Change to return: {inr(changeToReturn)}
            </div>
          ) : null}

          {/* ACTION BUTTONS */}
          <div className="space-y-2 mt-auto pt-2">
            <button
              type="button"
              disabled={save.isPending || lines.length === 0}
              onClick={() => handleCompleteBill('CONFIRMED')}
              className="w-full py-3 bg-burgundy hover:bg-burgundy-deep active:scale-[0.99] disabled:opacity-50 text-white font-bold text-sm rounded shadow-sm transition-all flex items-center justify-center gap-2"
            >
              {save.isPending ? (
                <span>Saving Bill…</span>
              ) : (
                <>
                  <Check size={16} />
                  <span>Save & Complete Bill · {inr(totals.net)}</span>
                </>
              )}
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={save.isPending || lines.length === 0}
                onClick={() => handleCompleteBill('DRAFT')}
                className="flex-1 py-2 border border-ivory-300 hover:bg-ivory-100 rounded text-xs font-semibold text-espresso transition-colors disabled:opacity-50"
              >
                Save as Draft
              </button>

              <button
                type="button"
                onClick={() => {
                  if (lines.length > 0 && !confirm('Clear all items on this bill?')) {
                    return;
                  }
                  setLines([]);
                  setCashAmount(0);
                  setUpiAmount(0);
                  setCardAmount(0);
                  setCreditAmount(0);
                  setBillDiscount(0);
                  setCustomerName('');
                  setCustomerPhone('');
                  setIsWalkIn(true);
                }}
                className="px-4 py-2 border border-ivory-300 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300 rounded text-xs font-semibold text-outline transition-colors"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 4. MODALS */}

      {/* NEW CUSTOMER MODAL */}
      {isNewCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-ivory-300 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-ivory-200 px-5 py-4 bg-[#FAF8F5]">
              <h3 className="font-serif text-lg font-bold text-espresso">
                Add New Customer
              </h3>
              <button
                onClick={() => setIsNewCustomerModalOpen(false)}
                className="p-1 text-outline hover:text-espresso"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCustomerSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1">
                  Customer Phone *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="9876543210"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  className="w-full border border-ivory-300 rounded px-3 py-2 text-sm text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Kavita Desai"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full border border-ivory-300 rounded px-3 py-2 text-sm text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-outline mb-1">
                  Credit Limit (₹)
                </label>
                <input
                  type="number"
                  min={0}
                  value={newCustLimit}
                  onChange={(e) => setNewCustLimit(Number(e.target.value))}
                  className="w-full border border-ivory-300 rounded px-3 py-2 text-sm text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-ivory-200">
                <button
                  type="button"
                  onClick={() => setIsNewCustomerModalOpen(false)}
                  className="px-4 py-2 border border-ivory-300 rounded text-xs font-semibold text-espresso hover:bg-ivory-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-burgundy text-white rounded text-xs font-bold hover:bg-burgundy-deep"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* HELD BILLS MODAL */}
      {showHeldModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-ivory-300 shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-ivory-200 px-5 py-4 bg-[#FAF8F5]">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-burgundy" />
                <h3 className="font-serif text-lg font-bold text-espresso">
                  Held Bills ({heldBills.length})
                </h3>
              </div>
              <button
                onClick={() => setShowHeldModal(false)}
                className="p-1 text-outline hover:text-espresso"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-4 max-h-96 overflow-y-auto divide-y divide-ivory-200">
              {heldBills.length === 0 ? (
                <p className="py-8 text-center text-xs text-outline font-medium">
                  No bills are currently on hold.
                </p>
              ) : (
                heldBills.map((hb) => {
                  const billTotal = hb.lines.reduce(
                    (sum, l) => sum + l.rate * l.quantity,
                    0,
                  );
                  return (
                    <div
                      key={hb.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-ivory-50 px-2 rounded transition-colors"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-espresso text-xs">
                            {hb.customerName}
                          </span>
                          <span className="text-[10px] text-outline font-mono">
                            {hb.heldAt}
                          </span>
                        </div>
                        <p className="text-[11px] text-outline mt-0.5">
                          {hb.lines.length} items ({hb.lines.reduce((s, l) => s + l.quantity, 0)} pcs) · {inr(billTotal)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleRecallBill(hb)}
                          className="px-3 py-1.5 bg-burgundy text-white rounded text-xs font-bold hover:bg-burgundy-deep transition-colors"
                        >
                          Recall
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setHeldBills((prev) =>
                              prev.filter((b) => b.id !== hb.id),
                            )
                          }
                          className="p-1 text-outline hover:text-rose-700"
                          title="Delete held bill"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* BILL SUCCESS / RECEIPT MODAL */}
      {lastCreatedBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-xl border border-ivory-300 shadow-2xl w-full max-w-sm p-6 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 bg-emerald-100 text-emerald-800 rounded-full flex items-center justify-center mx-auto mb-3">
              <CheckCircle2 size={24} />
            </div>
            <h3 className="font-serif text-xl font-bold text-espresso">
              Bill Completed!
            </h3>
            <p className="font-mono text-sm font-bold text-burgundy mt-1">
              #{lastCreatedBill.billNumber}
            </p>
            <p className="text-xs text-outline mt-1">
              Total Amount: {inr(lastCreatedBill.totalAmount || 0)}
            </p>

            <div className="mt-6 flex flex-col gap-2">
              <button
                type="button"
                onClick={() => {
                  window.print();
                }}
                className="w-full py-2.5 bg-burgundy text-white text-xs font-bold rounded flex items-center justify-center gap-2 hover:bg-burgundy-deep"
              >
                <Printer size={15} /> Print Receipt
              </button>

              <button
                type="button"
                onClick={() => setLastCreatedBill(null)}
                className="w-full py-2 border border-ivory-300 rounded text-xs font-semibold text-espresso hover:bg-ivory-100"
              >
                Start Next Bill
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

