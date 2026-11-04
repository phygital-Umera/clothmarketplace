import {useState} from 'react';
import {useCreateBranchPurchase} from '@/lib/react-query/queriesAndMutations/branchPurchase';
import {useNavigate} from '@tanstack/react-router';
import {Upload, Plus, Trash2, ArrowLeft, PlusCircle} from 'lucide-react';
import toast from 'react-hot-toast';

const inr = (n: number) =>
  `₹${Number(n).toLocaleString('en-IN', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;

export type PurchaseItemRow = {
  id: string;
  productName: string;
  hsn: string;
  sizes: Record<string, number>;
  cost: number;
  salePrice: number;
  gstRate: number;
  allocations: {
    mens: number;
    womens: number;
    kids: number;
  };
};

interface BranchNewPurchasePageProps {
  onBack?: () => void;
}

export default function BranchNewPurchasePage({onBack}: BranchNewPurchasePageProps) {
  const navigate = useNavigate();
  const createPurchaseMutation = useCreateBranchPurchase();

  // Form states
  const [supplierName, setSupplierName] = useState('Mumbai Denim Works — 27AABCM2232');
  const [supplierInvoiceNo, setSupplierInvoiceNo] = useState('MDW/552');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().slice(0, 10));
  const [receivedAt, setReceivedAt] = useState('Branch store room');
  const [paymentTerms, setPaymentTerms] = useState('50% now, rest in 15 days');
  const [paymentMode, setPaymentMode] = useState('NEFT');
  const [paidNow, setPaidNow] = useState<number>(19950);

  // Checkboxes
  const [createTransfers, setCreateTransfers] = useState(true);
  const [printBarcodes, setPrintBarcodes] = useState(true);
  const [approvalNeeded, setApprovalNeeded] = useState(false);

  // Search/Input for adding product lines
  const [searchProduct, setSearchProduct] = useState('');

  // Items table
  const [items, setItems] = useState<PurchaseItemRow[]>([
    {
      id: 'item-1',
      productName: 'Slim Fit Denim – Blue',
      hsn: '6203',
      sizes: {'30': 15, '32': 20, '34': 15, '36': 10},
      cost: 450,
      salePrice: 1499,
      gstRate: 5,
      allocations: {
        mens: 60,
        womens: 0,
        kids: 0,
      },
    },
    {
      id: 'item-2',
      productName: 'Kids Denim Jacket',
      hsn: '6201',
      sizes: {'4Y': 5, '6Y': 8, '8Y': 7, '10Y': 5},
      cost: 440,
      salePrice: 1299,
      gstRate: 5,
      allocations: {
        mens: 0,
        womens: 0,
        kids: 25,
      },
    },
  ]);

  // Derived totals
  const totalPcs = items.reduce(
    (total, item) => total + Object.values(item.sizes).reduce((s, q) => s + (Number(q) || 0), 0),
    0,
  );

  const mensTotalPcs = items.reduce((total, item) => total + (Number(item.allocations.mens) || 0), 0);
  const womensTotalPcs = items.reduce((total, item) => total + (Number(item.allocations.womens) || 0), 0);
  const kidsTotalPcs = items.reduce((total, item) => total + (Number(item.allocations.kids) || 0), 0);

  const taxableTotal = items.reduce((total, item) => {
    const pcs = Object.values(item.sizes).reduce((s, q) => s + (Number(q) || 0), 0);
    return total + pcs * (Number(item.cost) || 0);
  }, 0);

  const cgstRate = 0.025;
  const sgstRate = 0.025;
  const cgstAmount = Math.round(taxableTotal * cgstRate * 100) / 100;
  const sgstAmount = Math.round(taxableTotal * sgstRate * 100) / 100;
  const billTotal = Math.round((taxableTotal + cgstAmount + sgstAmount) * 100) / 100;

  const balancePayable = Math.max(0, billTotal - (paidNow || 0));

  // Update item field
  const updateItemField = (itemId: string, field: 'productName' | 'hsn', val: string) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? {...item, [field]: val} : item)),
    );
  };

  const updateSizeQty = (itemId: string, sizeKey: string, val: number) => {
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        const newSizes = {...item.sizes, [sizeKey]: Math.max(0, val)};
        const newTotalPcs = Object.values(newSizes).reduce((a, b) => a + b, 0);

        let newAlloc = {...item.allocations};
        if (newAlloc.mens > 0 && newAlloc.womens === 0 && newAlloc.kids === 0) {
          newAlloc.mens = newTotalPcs;
        } else if (newAlloc.kids > 0 && newAlloc.mens === 0 && newAlloc.womens === 0) {
          newAlloc.kids = newTotalPcs;
        } else if (newAlloc.womens > 0 && newAlloc.mens === 0 && newAlloc.kids === 0) {
          newAlloc.womens = newTotalPcs;
        }

        return {...item, sizes: newSizes, allocations: newAlloc};
      }),
    );
  };

  const addCustomSize = (itemId: string) => {
    const sizeName = window.prompt('Enter size label (e.g. 38, XXL, Free):', '38');
    if (!sizeName || !sizeName.trim()) return;
    const key = sizeName.trim().toUpperCase();
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== itemId) return item;
        if (item.sizes[key] !== undefined) return item;
        return {...item, sizes: {...item.sizes, [key]: 10}};
      }),
    );
  };

  const updateAllocation = (
    itemId: string,
    shopKey: 'mens' | 'womens' | 'kids',
    val: number,
  ) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {...item, allocations: {...item.allocations, [shopKey]: Math.max(0, val)}}
          : item,
      ),
    );
  };

  const updateCost = (itemId: string, val: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? {...item, cost: Math.max(0, val)} : item)),
    );
  };

  const updateSalePrice = (itemId: string, val: number) => {
    setItems((prev) =>
      prev.map((item) => (item.id === itemId ? {...item, salePrice: Math.max(0, val)} : item)),
    );
  };

  const removeItem = (itemId: string) => {
    if (items.length <= 1) {
      toast.error('Purchase bill must have at least one product item');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    toast.success('Removed line item');
  };

  // Fixed handleAddProduct: works with typed text OR generates a fresh editable line!
  const handleAddProduct = () => {
    const title = searchProduct.trim() || `Item #${items.length + 1}`;
    const newItem: PurchaseItemRow = {
      id: `item-${Date.now()}`,
      productName: title,
      hsn: '6204',
      sizes: {'S': 5, 'M': 10, 'L': 10, 'XL': 5},
      cost: 400,
      salePrice: 1199,
      gstRate: 5,
      allocations: {
        mens: 0,
        womens: 30,
        kids: 0,
      },
    };
    setItems((prev) => [...prev, newItem]);
    setSearchProduct('');
    toast.success(`Added line: ${newItem.productName}`);
  };

  const handleSave = async (status: 'CONFIRMED' | 'DRAFT') => {
    if (!supplierName.trim()) {
      toast.error('Supplier is required');
      return;
    }
    if (!supplierInvoiceNo.trim()) {
      toast.error('Supplier invoice number is required');
      return;
    }

    try {
      const payload = {
        supplierName,
        supplierInvoiceNo,
        supplierGstin: '27AABCM2232Q1Z1',
        invoiceDate,
        receivedAt,
        paymentTerms,
        status,
        items: items.map((i) => {
          const pcs = Object.values(i.sizes).reduce((a, b) => a + b, 0);
          return {
            productName: i.productName,
            hsn: i.hsn,
            sizeBreakdown: i.sizes,
            pcs,
            cost: i.cost,
            salePrice: i.salePrice,
            gstRate: i.gstRate,
            shopAllocations: {
              "Men's Wear": i.allocations.mens,
              "Women's Wear": i.allocations.womens,
              "Kids Wear": i.allocations.kids,
            },
          };
        }),
        taxableAmount: taxableTotal,
        cgstAmount,
        sgstAmount,
        totalAmount: billTotal,
        paidAmount: paidNow,
        paymentMode,
        balanceAmount: balancePayable,
        dueDate: balancePayable > 0 ? '18 Nov' : undefined,
        createTransfers,
        printBarcodes,
        companyApprovalNeeded: billTotal >= 50000 || approvalNeeded,
      };

      await createPurchaseMutation.mutateAsync(payload);
      toast.success(status === 'CONFIRMED' ? 'Purchase bill created and stock sent to shops!' : 'Draft saved!');
      if (onBack) {
        onBack();
      } else {
        navigate({to: '/branch-admin/purchase-bills'});
      }
    } catch {
      // Handled in mutation
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      navigate({to: '/branch-admin/purchase-bills'});
    }
  };

  return (
    <div className="space-y-4 pb-8">
      {/* Back button & Header row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-stone-200/80 pb-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleBack}
            className="inline-flex items-center gap-1.5 rounded-lg border border-stone-200 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm transition hover:bg-stone-50 hover:text-[#4A1521]"
          >
            <ArrowLeft size={15} />
            <span>Back to Bills</span>
          </button>
          <div>
            <h1 className="font-serif text-xl font-bold text-[#4A1521]">
              New Purchase Bill
            </h1>
            <p className="text-xs text-stone-500">
              One supplier bill with immediate stock allocation to shops
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSave('DRAFT')}
            disabled={createPurchaseMutation.isPending}
            className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-medium text-stone-700 shadow-sm transition hover:bg-stone-50"
          >
            Save Draft
          </button>
          <button
            type="button"
            onClick={() => handleSave('CONFIRMED')}
            disabled={createPurchaseMutation.isPending}
            className="rounded-lg bg-[#4A1521] px-4 py-1.5 text-xs font-medium text-white shadow-sm transition hover:bg-[#380e18]"
          >
            {createPurchaseMutation.isPending ? 'Saving…' : 'Save & Send Stock'}
          </button>
        </div>
      </div>

      {/* Section 1: Supplier & Bill Details */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm">
        <h2 className="mb-3 font-serif text-sm font-semibold uppercase tracking-wider text-stone-600 border-b border-stone-100 pb-2">
          Supplier & Bill Details
        </h2>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {/* Supplier dropdown */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Supplier <span className="text-red-500">*</span>
            </label>
            <select
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
            >
              <option value="Mumbai Denim Works — 27AABCM2232">Mumbai Denim Works — 27AABCM2232</option>
              <option value="Surat Textile House — 24AAJCS9901M1Z4">Surat Textile House — 24AAJCS9901M1Z4</option>
              <option value="Varanasi Silk Emporium — 09AAAFV1099R1ZZ">Varanasi Silk Emporium — 09AAAFV1099R1ZZ</option>
              <option value="Ichalkaranji Weavers Co-op">Ichalkaranji Weavers Co-op</option>
              <option value="Tiruppur Knits">Tiruppur Knits</option>
              <option value="Sangli Cloth Mart">Sangli Cloth Mart</option>
            </select>
          </div>

          {/* Supplier Invoice No */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Supplier Invoice No. <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={supplierInvoiceNo}
              onChange={(e) => setSupplierInvoiceNo(e.target.value)}
              placeholder="e.g. MDW/552"
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Invoice Date */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Invoice Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
            />
          </div>

          {/* Received At */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Received At <span className="text-red-500">*</span>
            </label>
            <select
              value={receivedAt}
              onChange={(e) => setReceivedAt(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
            >
              <option value="Branch store room">Branch store room</option>
              <option value="Men's Wear">Men's Wear</option>
              <option value="Women's Wear">Women's Wear</option>
              <option value="Kids Wear">Kids Wear</option>
            </select>
          </div>

          {/* Payment Terms */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Payment Terms
            </label>
            <select
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
            >
              <option value="50% now, rest in 15 days">50% now, rest in 15 days</option>
              <option value="Full advance">Full advance</option>
              <option value="30 days credit">30 days credit</option>
              <option value="Cash on delivery">Cash on delivery</option>
            </select>
          </div>

          {/* Supplier Bill Upload */}
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">
              Attach Bill Slip
            </label>
            <button
              type="button"
              onClick={() => toast('File uploaded', {icon: '📄'})}
              className="mt-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed border-stone-300 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-600 hover:border-[#4A1521] hover:text-[#4A1521] transition"
            >
              <Upload size={14} />
              <span>Upload photo / PDF</span>
            </button>
          </div>
        </div>
      </div>

      {/* Section 2: Items & Shop Split */}
      <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-stone-100 pb-2">
          <div>
            <h2 className="font-serif text-sm font-semibold uppercase tracking-wider text-stone-600">
              Items & Shop Split
            </h2>
            <p className="text-[11px] text-stone-500">
              Enter qty by size, then specify pieces sent to each shop
            </p>
          </div>
          <button
            type="button"
            onClick={handleAddProduct}
            className="inline-flex items-center gap-1 rounded-lg bg-[#4A1521] px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-[#380e18] transition"
          >
            <Plus size={14} />
            <span>+ Add Line</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] border-collapse text-left text-xs">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-50/75 text-[11px] font-bold uppercase tracking-wider text-stone-500">
                <th className="py-2 pl-3 pr-2 w-[220px]">Product & HSN</th>
                <th className="px-2 py-2">Sizes (Qty)</th>
                <th className="px-2 py-2 text-center">Pcs</th>
                <th className="px-2 py-2 text-right">Cost (₹)</th>
                <th className="px-2 py-2 text-right">MRP (₹)</th>
                <th className="px-2 py-2 text-center">GST</th>
                <th className="px-2 py-2 text-center">Men's</th>
                <th className="px-2 py-2 text-center">Women's</th>
                <th className="px-2 py-2 text-center">Kids</th>
                <th className="py-2 pr-3 text-center w-8"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {items.map((item) => {
                const rowPcs = Object.values(item.sizes).reduce((a, b) => a + b, 0);
                return (
                  <tr key={item.id} className="hover:bg-stone-50/60 transition-colors">
                    {/* Editable Product Name & HSN */}
                    <td className="py-2.5 pl-3 pr-2">
                      <input
                        type="text"
                        value={item.productName}
                        onChange={(e) => updateItemField(item.id, 'productName', e.target.value)}
                        placeholder="Product Name"
                        className="w-full rounded border border-transparent hover:border-stone-200 focus:border-[#4A1521] bg-transparent px-1.5 py-0.5 font-medium text-stone-800 focus:bg-white focus:outline-none"
                      />
                      <div className="flex items-center gap-1 px-1.5">
                        <span className="text-[10px] text-stone-400">HSN:</span>
                        <input
                          type="text"
                          value={item.hsn}
                          onChange={(e) => updateItemField(item.id, 'hsn', e.target.value)}
                          placeholder="6203"
                          className="w-16 rounded border border-transparent hover:border-stone-200 focus:border-[#4A1521] bg-transparent text-[10px] text-stone-500 focus:bg-white focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Qty by Size */}
                    <td className="px-2 py-2.5">
                      <div className="flex flex-wrap items-center gap-1">
                        {Object.entries(item.sizes).map(([sz, qty]) => (
                          <div key={sz} className="flex flex-col items-center">
                            <span className="text-[9px] font-semibold text-stone-400">{sz}</span>
                            <input
                              type="number"
                              min={0}
                              value={qty}
                              onChange={(e) =>
                                updateSizeQty(item.id, sz, parseInt(e.target.value) || 0)
                              }
                              className="w-10 rounded border border-stone-200 bg-stone-50/60 py-0.5 text-center text-xs font-semibold text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
                            />
                          </div>
                        ))}
                        <button
                          type="button"
                          title="Add size label"
                          onClick={() => addCustomSize(item.id)}
                          className="mt-3 text-stone-400 hover:text-[#4A1521] transition"
                        >
                          <PlusCircle size={14} />
                        </button>
                      </div>
                    </td>

                    {/* Total Pcs for Row */}
                    <td className="px-2 py-2.5 text-center font-serif font-bold text-stone-800 text-sm">
                      {rowPcs}
                    </td>

                    {/* Cost */}
                    <td className="px-2 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        value={item.cost}
                        onChange={(e) => updateCost(item.id, parseFloat(e.target.value) || 0)}
                        className="w-16 rounded border border-stone-200 bg-stone-50/60 py-0.5 pr-1 text-right text-xs font-medium text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Sale Price */}
                    <td className="px-2 py-2.5 text-right">
                      <input
                        type="number"
                        min={0}
                        value={item.salePrice}
                        onChange={(e) => updateSalePrice(item.id, parseFloat(e.target.value) || 0)}
                        className="w-16 rounded border border-stone-200 bg-stone-50/60 py-0.5 pr-1 text-right text-xs font-medium text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* GST Rate */}
                    <td className="px-2 py-2.5 text-center text-stone-500 font-medium">
                      {item.gstRate}%
                    </td>

                    {/* Shop Allocation: Men's */}
                    <td className="px-2 py-2.5 text-center">
                      <input
                        type="number"
                        min={0}
                        value={item.allocations.mens}
                        onChange={(e) =>
                          updateAllocation(item.id, 'mens', parseInt(e.target.value) || 0)
                        }
                        className="w-12 rounded border border-stone-200 bg-stone-50/60 py-0.5 text-center text-xs font-semibold text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Shop Allocation: Women's */}
                    <td className="px-2 py-2.5 text-center">
                      <input
                        type="number"
                        min={0}
                        value={item.allocations.womens}
                        onChange={(e) =>
                          updateAllocation(item.id, 'womens', parseInt(e.target.value) || 0)
                        }
                        className="w-12 rounded border border-stone-200 bg-stone-50/60 py-0.5 text-center text-xs font-semibold text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Shop Allocation: Kids */}
                    <td className="px-2 py-2.5 text-center">
                      <input
                        type="number"
                        min={0}
                        value={item.allocations.kids}
                        onChange={(e) =>
                          updateAllocation(item.id, 'kids', parseInt(e.target.value) || 0)
                        }
                        className="w-12 rounded border border-stone-200 bg-stone-50/60 py-0.5 text-center text-xs font-semibold text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
                      />
                    </td>

                    {/* Remove item */}
                    <td className="py-2.5 pr-3 text-center">
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        className="text-stone-400 hover:text-red-600 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Total Row */}
              <tr className="bg-stone-50 font-semibold text-stone-800 border-t-2 border-stone-200">
                <td className="py-2 pl-3 pr-2 font-serif text-[#4A1521]">Total</td>
                <td className="px-2 py-2"></td>
                <td className="px-2 py-2 text-center font-serif text-[#4A1521] text-sm">
                  {totalPcs}
                </td>
                <td colSpan={3} className="px-2 py-2"></td>
                <td className="px-2 py-2 text-center font-bold text-stone-800">{mensTotalPcs}</td>
                <td className="px-2 py-2 text-center font-bold text-stone-800">{womensTotalPcs}</td>
                <td className="px-2 py-2 text-center font-bold text-stone-800">{kidsTotalPcs}</td>
                <td className="py-2 pr-3"></td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Scan or search line */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={searchProduct}
            onChange={(e) => setSearchProduct(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddProduct()}
            placeholder="Type product name or scan barcode to add a line (e.g. Cotton Shirt, Denim Trousers)..."
            className="flex-1 rounded-lg border border-stone-200 bg-stone-50/50 px-3 py-1.5 text-xs text-stone-800 placeholder-stone-400 focus:border-[#4A1521] focus:bg-white focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddProduct}
            className="inline-flex items-center gap-1 rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-xs font-semibold text-stone-700 shadow-sm hover:bg-stone-50 hover:text-[#4A1521] transition"
          >
            <Plus size={14} />
            <span>Add Line</span>
          </button>
        </div>
      </div>

      {/* Bottom Grid: Options & Bill Totals */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Left: Options & Transfer checklist */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm space-y-3">
          <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-stone-600 border-b border-stone-100 pb-2">
            After Saving
          </h3>

          <div className="space-y-2 text-xs">
            <label className="flex items-start gap-2 text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={createTransfers}
                onChange={(e) => setCreateTransfers(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 accent-[#4A1521]"
              />
              <span>
                Create transfers: TRF-0220 → Men's Wear ({mensTotalPcs} pcs), TRF-0221 → Kids Wear ({kidsTotalPcs} pcs)
              </span>
            </label>

            <label className="flex items-start gap-2 text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={printBarcodes}
                onChange={(e) => setPrintBarcodes(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 accent-[#4A1521]"
              />
              <span>Print {totalPcs} barcode labels at the branch</span>
            </label>

            <label className="flex items-start gap-2 text-stone-700 cursor-pointer">
              <input
                type="checkbox"
                checked={approvalNeeded || billTotal >= 50000}
                onChange={(e) => setApprovalNeeded(e.target.checked)}
                className="mt-0.5 h-3.5 w-3.5 rounded border-stone-300 accent-[#4A1521]"
              />
              <span>Send for Company Admin approval (needed above ₹50,000)</span>
            </label>
          </div>

          <div className="rounded-lg border border-[#4A1521]/10 bg-[#FAF4F5] p-2.5 text-[11px] text-[#4A1521]">
            Shops see the allocated stock as "in transit" until they count and accept receipt.
          </div>
        </div>

        {/* Right: Bill Total Calculation */}
        <div className="rounded-xl border border-stone-200/80 bg-white p-4 shadow-sm space-y-3">
          <h3 className="font-serif text-sm font-semibold uppercase tracking-wider text-stone-600 border-b border-stone-100 pb-2">
            Bill Summary & Payment
          </h3>

          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-700">
              <span>Taxable ({totalPcs} pcs)</span>
              <span className="font-semibold">{inr(taxableTotal)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>CGST (2.5%)</span>
              <span>{inr(cgstAmount)}</span>
            </div>
            <div className="flex justify-between text-stone-500">
              <span>SGST (2.5%)</span>
              <span>{inr(sgstAmount)}</span>
            </div>

            <div className="flex items-baseline justify-between border-t border-stone-200 pt-2">
              <span className="font-serif font-semibold text-[#4A1521] text-sm">Bill Total</span>
              <span className="font-serif text-lg font-bold text-[#4A1521]">
                ₹{billTotal.toLocaleString('en-IN', {maximumFractionDigits: 0})}
              </span>
            </div>
          </div>

          {/* Payment inputs */}
          <div className="grid grid-cols-2 gap-3 border-t border-stone-100 pt-2">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">Paid Now (₹)</label>
              <input
                type="number"
                min={0}
                value={paidNow}
                onChange={(e) => setPaidNow(Math.max(0, parseFloat(e.target.value) || 0))}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50/50 px-2.5 py-1 text-xs text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-stone-500">Mode</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-200 bg-stone-50/50 px-2.5 py-1 text-xs text-stone-800 focus:border-[#4A1521] focus:bg-white focus:outline-none"
              >
                <option value="NEFT">NEFT</option>
                <option value="UPI">UPI</option>
                <option value="CASH">CASH</option>
                <option value="CHEQUE">CHEQUE</option>
              </select>
            </div>
          </div>

          {/* Balance payable note */}
          <div className="flex justify-between border-t border-stone-100 pt-2 text-xs">
            <span className="font-medium text-stone-700">Balance Payable</span>
            <span className="font-bold text-red-600">
              {inr(balancePayable)} {balancePayable > 0 ? '· due 18 Nov' : ''}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
