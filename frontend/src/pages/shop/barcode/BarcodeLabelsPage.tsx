import React, {useState, useEffect, useMemo} from 'react';
import {
  usePurchaseBillsForLabels,
  useBillItemsForLabels,
  useProductsForLabels,
  useReprintBatches,
  useRecordPrintJob,
} from '@/lib/react-query/queriesAndMutations/barcodeLabel';
import {
  BarcodeLabelRow,
  LabelSetupConfig,
  PrintJobPayload,
} from '@/types/barcodeLabel';
import {
  Search,
  Printer,
  ChevronDown,
  Plus,
  RefreshCw,
  Check,
  Tag,
  Barcode as BarcodeIcon,
} from 'lucide-react';
import toast from 'react-hot-toast';

interface BarcodeLabelsPageProps {
  panel?: 'shop-admin' | 'branch-admin';
}

/** Escapes text written into the print window's HTML (product names are user data, and that window shares our origin) */
const escapeHtml = (value: unknown) =>
  String(value ?? '').replace(
    /[&<>"']/g,
    (c) => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'})[c]!
  );

/**
 * Clean SVG Barcode generator that renders crisp vector stripes
 */
const BarcodeSvg: React.FC<{
  value: string;
  width?: number;
  height?: number;
  className?: string;
}> = ({value, width = 170, height = 40, className = ''}) => {
  const bars = useMemo(() => {
    const str = String(value || '8901234011012');
    const pattern: number[] = [2, 1, 1, 2]; // start guard
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) % 10007;
      const charCode = str.charCodeAt(i);
      pattern.push(((charCode + i) % 3) + 1);
      pattern.push(((charCode * 2 + i) % 2) + 1);
      pattern.push(((charCode + 3) % 3) + 1);
    }
    pattern.push(1, 2, 1, 1, 2); // end guard

    let totalUnits = pattern.reduce((acc, w) => acc + w, 0);
    const unitWidth = width / totalUnits;

    let x = 0;
    const rects: Array<{x: number; w: number}> = [];
    pattern.forEach((w, idx) => {
      const isBlack = idx % 2 === 0;
      const rectW = w * unitWidth;
      if (isBlack) {
        rects.push({x, w: rectW});
      }
      x += rectW;
    });

    return rects;
  }, [value, width]);

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="overflow-visible"
      >
        {bars.map((b, i) => (
          <rect key={i} x={b.x} y={0} width={b.w} height={height} fill="#000000" />
        ))}
      </svg>
      <span className="mt-1 font-mono text-[10px] tracking-[0.2em] font-semibold text-stone-800">
        {value}
      </span>
    </div>
  );
};

export default function BarcodeLabelsPage({
  panel = 'shop-admin',
}: BarcodeLabelsPageProps) {

  // Tabs: FROM_PURCHASE_BILL | PICK_PRODUCTS | REPRINT
  const [activeTab, setActiveTab] = useState<'FROM_PURCHASE_BILL' | 'PICK_PRODUCTS' | 'REPRINT'>(
    'FROM_PURCHASE_BILL'
  );

  // Purchase bills query
  const {data: bills = [], isLoading: isBillsLoading} = usePurchaseBillsForLabels(panel);

  // Selected Bill State
  const [selectedBillId, setSelectedBillId] = useState<string>('');

  // Default to PB/26-27/0042 if available, else first bill
  useEffect(() => {
    if (!selectedBillId && bills.length > 0) {
      const bill42 = bills.find((b) => b.billNumber.includes('0042'));
      setSelectedBillId(bill42 ? bill42.id : bills[0].id);
    }
  }, [bills, selectedBillId]);

  // Bill items query
  const {data: billItemsData, isLoading: isItemsLoading} = useBillItemsForLabels(
    panel,
    selectedBillId
  );

  // Active Label rows in the table
  const [tableRows, setTableRows] = useState<BarcodeLabelRow[]>([]);

  // Synchronize table rows when bill items change
  useEffect(() => {
    if (activeTab === 'FROM_PURCHASE_BILL' && billItemsData?.items) {
      setTableRows(billItemsData.items);
    }
  }, [activeTab, billItemsData]);

  // Product Pick state
  const [productSearch, setProductSearch] = useState('');
  const {data: searchProducts = []} = useProductsForLabels(panel, productSearch);

  // Reprint Batches query
  const {data: reprintBatches = []} = useReprintBatches(panel);

  // Label Setup state
  const [labelSetup, setLabelSetup] = useState<LabelSetupConfig>({
    labelSize: '50 × 30 mm · 1 across (thermal roll)',
    printer: 'System Default Printer (PDF / Print Dialog)',
    showShopName: true,
    showItemNameSize: true,
    showMrp: true,
    showSalePrice: true,
    showCostCode: false,
  });

  // Calculate total labels across selected rows
  const totalLabels = useMemo(() => {
    return tableRows
      .filter((r) => r.selected)
      .reduce((acc, r) => acc + (Number(r.labels) || 0), 0);
  }, [tableRows]);

  // Toggle row selected
  const handleToggleRow = (id: string) => {
    setTableRows((prev) =>
      prev.map((r) => (r.id === id ? {...r, selected: !r.selected} : r))
    );
  };

  // Toggle all rows
  const allSelected = useMemo(() => {
    return tableRows.length > 0 && tableRows.every((r) => r.selected);
  }, [tableRows]);

  const handleToggleAll = () => {
    const next = !allSelected;
    setTableRows((prev) => prev.map((r) => ({...r, selected: next})));
  };

  // Update label count for a row
  const handleUpdateLabels = (id: string, count: number) => {
    setTableRows((prev) =>
      prev.map((r) => (r.id === id ? {...r, labels: Math.max(1, count)} : r))
    );
  };

  // Add a product from "PICK PRODUCTS" to the table
  const handleAddProductRow = (item: BarcodeLabelRow) => {
    setTableRows((prev) => {
      const exists = prev.find((r) => r.barcode === item.barcode);
      if (exists) {
        return prev.map((r) =>
          r.barcode === item.barcode ? {...r, labels: r.labels + 1, selected: true} : r
        );
      }
      return [...prev, {...item, selected: true, labels: 1}];
    });
    toast.success(`Added ${item.productName} (${item.size})`);
  };

  // Load a reprint batch into the table
  const handleLoadReprintBatch = (batch: any) => {
    if (Array.isArray(batch.itemsSummary) && batch.itemsSummary.length > 0) {
      const mapped: BarcodeLabelRow[] = batch.itemsSummary.map((item: any, idx: number) => ({
        id: `reprint-${idx}-${Date.now()}`,
        productId: item.productId || '',
        variantId: item.variantId || '',
        productName: item.productName,
        size: item.size || 'Free',
        barcode: item.barcode,
        mrp: item.mrp || 0,
        price: item.price || 0,
        labels: item.labelCount || 1,
        selected: true,
      }));
      setTableRows(mapped);
      setActiveTab('FROM_PURCHASE_BILL');
      toast.success(`Loaded ${mapped.length} items from ${batch.jobId}`);
    }
  };

  // Preview Item: First selected item or Cotton Kurta M
  const previewItem = useMemo(() => {
    const selected = tableRows.find((r) => r.selected);
    if (selected) return selected;
    if (tableRows.length > 0) return tableRows[0];
    return {
      id: 'preview-default',
      productName: 'Cotton Kurta Indigo',
      size: 'M',
      barcode: '8901234011012',
      mrp: 1299,
      price: 1099,
      labels: 35,
      selected: true,
      productId: 'prod-default',
    };
  }, [tableRows]);

  const recordPrintMutation = useRecordPrintJob(panel);

  // Trigger Thermal / Browser Print
  const handlePrintLabels = async (isTest: boolean = false) => {
    const selectedRows = tableRows.filter((r) => r.selected);
    if (!isTest && selectedRows.length === 0) {
      toast.error('Select at least one item to print');
      return;
    }

    const countToPrint = isTest ? 1 : totalLabels;
    const itemsToPrint = isTest
      ? [
          {
            productName: previewItem.productName,
            size: previewItem.size,
            barcode: previewItem.barcode,
            mrp: previewItem.mrp,
            price: previewItem.price,
            labelCount: 1,
          },
        ]
      : selectedRows.map((r) => ({
          productId: r.productId,
          variantId: r.variantId,
          productName: r.productName,
          size: r.size,
          barcode: r.barcode,
          mrp: r.mrp,
          price: r.price,
          labelCount: r.labels,
        }));

    const selectedBill = bills.find((b) => b.id === selectedBillId);

    const payload: PrintJobPayload = {
      sourceType: activeTab === 'FROM_PURCHASE_BILL' ? 'PURCHASE_BILL' : 'PRODUCT_PICK',
      sourceRef: selectedBill ? selectedBill.billNumber : undefined,
      labelSize: labelSetup.labelSize,
      printer: labelSetup.printer,
      showShopName: labelSetup.showShopName,
      showItemNameSize: labelSetup.showItemNameSize,
      showMrp: labelSetup.showMrp,
      showSalePrice: labelSetup.showSalePrice,
      showCostCode: labelSetup.showCostCode,
      items: itemsToPrint,
      totalLabels: countToPrint,
    };

    try {
      await recordPrintMutation.mutateAsync(payload);

      // Open clean print layout window for thermal or regular printer
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (printWindow) {
        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Print Barcode Labels - ${escapeHtml(labelSetup.printer)}</title>
              <style>
                @page {
                  size: 50mm 30mm;
                  margin: 0;
                }
                body {
                  margin: 0;
                  padding: 0;
                  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
                  background: white;
                }
                .label-container {
                  width: 50mm;
                  height: 30mm;
                  box-sizing: border-box;
                  padding: 2mm 3mm;
                  display: flex;
                  flex-direction: column;
                  justify-content: space-between;
                  page-break-after: always;
                  text-align: center;
                }
                .shop-name {
                  font-size: 7.5pt;
                  font-weight: 800;
                  text-transform: uppercase;
                  letter-spacing: 0.5px;
                  color: #000;
                }
                .item-name {
                  font-size: 7pt;
                  font-weight: 600;
                  color: #111;
                  white-space: nowrap;
                  overflow: hidden;
                  text-overflow: ellipsis;
                }
                .barcode-img {
                  margin: 0.5mm auto;
                }
                .barcode-num {
                  font-family: monospace;
                  font-size: 6.5pt;
                  font-weight: 700;
                  letter-spacing: 1px;
                }
                .price-row {
                  display: flex;
                  justify-content: space-between;
                  align-items: baseline;
                  font-size: 7pt;
                  font-weight: 700;
                  border-top: 0.5px solid #000;
                  padding-top: 0.5mm;
                }
              </style>
            </head>
            <body>
              ${itemsToPrint
                .flatMap((item) =>
                  Array.from({length: item.labelCount}).map(
                    () => `
                    <div class="label-container">
                      ${
                        labelSetup.showShopName
                          ? `<div class="shop-name">MATOSHRI FASHIONS</div>`
                          : ''
                      }
                      ${
                        labelSetup.showItemNameSize
                          ? `<div class="item-name">${escapeHtml(item.productName)} · ${escapeHtml(item.size)}</div>`
                          : ''
                      }
                      <div class="barcode-img">
                        <svg width="150" height="28" viewBox="0 0 150 28">
                          ${Array.from({length: 36})
                            .map(
                              (_, i) =>
                                `<rect x="${i * 4.1}" y="0" width="${
                                  (i % 3) + 1.2
                                }" height="28" fill="#000" />`
                            )
                            .join('')}
                        </svg>
                        <div class="barcode-num">${escapeHtml(item.barcode)}</div>
                      </div>
                      <div class="price-row">
                        ${labelSetup.showMrp ? `<span>MRP ₹${escapeHtml(item.mrp)}</span>` : ''}
                        ${labelSetup.showSalePrice ? `<span>₹${escapeHtml(item.price)}</span>` : ''}
                      </div>
                    </div>
                  `
                  )
                )
                .join('')}
              <script>
                window.onload = function() {
                  window.print();
                  setTimeout(() => window.close(), 1000);
                };
              </script>
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    } catch (e) {
      // error handled by mutation
    }
  };

  return (
    <div className="space-y-6 pb-12 font-sans text-stone-800">
      {/* Header */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">
          Stock / Barcode Labels
        </p>
        <h1 className="mt-1 font-serif text-3xl font-normal tracking-tight text-[#4A1521]">
          Barcode labels
        </h1>
        <p className="mt-0.5 text-xs text-stone-500">
          Print price tags for new stock. The cashier scans these at the counter.
        </p>
      </div>

      {/* Main Grid: Left Table Card (8 cols) & Right Label Setup/Preview (4 cols) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Card: Tabs & Table */}
        <div className="lg:col-span-8 flex flex-col rounded-lg border border-stone-200/90 bg-white p-5 shadow-sm">
          {/* Top Tabs */}
          <div className="flex items-center gap-6 border-b border-stone-200/80">
            <button
              type="button"
              onClick={() => setActiveTab('FROM_PURCHASE_BILL')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
                activeTab === 'FROM_PURCHASE_BILL'
                  ? 'text-[#7A2232] border-b-2 border-[#7A2232]'
                  : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              FROM PURCHASE BILL
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('PICK_PRODUCTS')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
                activeTab === 'PICK_PRODUCTS'
                  ? 'text-[#7A2232] border-b-2 border-[#7A2232]'
                  : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              PICK PRODUCTS
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('REPRINT')}
              className={`pb-3 text-xs font-bold uppercase tracking-wider transition-all relative ${
                activeTab === 'REPRINT'
                  ? 'text-[#7A2232] border-b-2 border-[#7A2232]'
                  : 'text-stone-400 hover:text-stone-700'
              }`}
            >
              REPRINT
            </button>
          </div>

          {/* Tab Content Controls */}
          <div className="mt-4">
            {activeTab === 'FROM_PURCHASE_BILL' && (
              <div className="relative max-w-md">
                <select
                  value={selectedBillId}
                  onChange={(e) => setSelectedBillId(e.target.value)}
                  className="w-full appearance-none rounded border border-stone-200 bg-white py-2 pl-3.5 pr-9 text-xs font-medium text-stone-800 shadow-xs focus:border-[#7A2232] focus:outline-none focus:ring-1 focus:ring-[#7A2232]"
                >
                  {isBillsLoading ? (
                    <option value="">Loading bills...</option>
                  ) : (
                    bills.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.label}
                      </option>
                    ))
                  )}
                </select>
                <ChevronDown
                  size={15}
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"
                />
              </div>
            )}

            {activeTab === 'PICK_PRODUCTS' && (
              <div className="space-y-3">
                <div className="relative max-w-md">
                  <Search
                    size={14}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"
                  />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    placeholder="Search product name, SKU or barcode to add..."
                    className="w-full rounded border border-stone-200 bg-white py-2 pl-9 pr-3 text-xs text-stone-800 placeholder-stone-400 focus:border-[#7A2232] focus:outline-none focus:ring-1 focus:ring-[#7A2232]"
                  />
                </div>

                {searchProducts.length > 0 && (
                  <div className="max-h-48 overflow-y-auto divide-y divide-stone-100 rounded border border-stone-200 bg-stone-50/50">
                    {searchProducts.slice(0, 5).map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between p-2.5 text-xs"
                      >
                        <div>
                          <p className="font-semibold text-stone-800">
                            {p.productName} ({p.size})
                          </p>
                          <p className="font-mono text-[10px] text-stone-500">
                            {p.barcode} · ₹{p.price}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddProductRow(p)}
                          className="flex items-center gap-1 rounded bg-[#7A2232] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#5E1724]"
                        >
                          <Plus size={12} />
                          <span>Add</span>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'REPRINT' && (
              <div className="max-h-44 overflow-y-auto divide-y divide-stone-100 rounded border border-stone-200">
                {reprintBatches.length === 0 ? (
                  <p className="p-4 text-center text-xs text-stone-400">
                    No recent print jobs found
                  </p>
                ) : (
                  reprintBatches.map((b) => (
                    <div
                      key={b.id}
                      className="flex items-center justify-between p-3 text-xs"
                    >
                      <div>
                        <p className="font-semibold text-stone-800">
                          {b.jobId} · {b.totalLabels} labels
                        </p>
                        <p className="text-[11px] text-stone-500">
                          {b.sourceRef || b.sourceType} · {b.labelSize} · {b.printer}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleLoadReprintBatch(b)}
                        className="rounded border border-[#7A2232] px-3 py-1 text-xs font-bold text-[#7A2232] hover:bg-[#FDF2F4]"
                      >
                        Load Batch
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Labels Table */}
          <div className="mt-5 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-[10px] font-bold uppercase tracking-wider text-stone-400">
                  <th className="py-2.5 pr-2 w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleAll}
                      className="h-3.5 w-3.5 rounded border-stone-300 text-[#7A2232] focus:ring-[#7A2232] accent-[#7A2232]"
                    />
                  </th>
                  <th className="py-2.5 px-3">ITEM</th>
                  <th className="py-2.5 px-3">SIZE</th>
                  <th className="py-2.5 px-3 font-mono">BARCODE</th>
                  <th className="py-2.5 px-3 text-right">MRP</th>
                  <th className="py-2.5 px-3 text-right">PRICE</th>
                  <th className="py-2.5 pl-3 pr-2 text-right w-24">LABELS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-stone-700">
                {isItemsLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-stone-400">
                      Loading bill items...
                    </td>
                  </tr>
                ) : tableRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-xs text-stone-400">
                      No items to display
                    </td>
                  </tr>
                ) : (
                  tableRows.map((row) => (
                    <tr
                      key={row.id}
                      className={`hover:bg-stone-50/70 transition-colors ${
                        row.selected ? 'bg-white' : 'opacity-60 bg-stone-50/30'
                      }`}
                    >
                      <td className="py-3 pr-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={() => handleToggleRow(row.id)}
                          className="h-3.5 w-3.5 rounded border-stone-300 text-[#7A2232] focus:ring-[#7A2232] accent-[#7A2232]"
                        />
                      </td>
                      <td className="py-3 px-3 font-medium text-stone-900">
                        {row.productName}
                      </td>
                      <td className="py-3 px-3 font-medium text-stone-600">
                        {row.size}
                      </td>
                      <td className="py-3 px-3 font-mono text-[11px] text-stone-700">
                        {row.barcode}
                      </td>
                      <td className="py-3 px-3 text-right font-serif text-stone-800">
                        ₹{row.mrp.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-3 text-right font-serif font-medium text-stone-900">
                        ₹{row.price.toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 pl-3 pr-2 text-right">
                        <input
                          type="number"
                          min="1"
                          value={row.labels}
                          onChange={(e) =>
                            handleUpdateLabels(row.id, parseInt(e.target.value, 10) || 1)
                          }
                          className="w-16 rounded border border-stone-200 bg-stone-50/70 px-2 py-1 text-center font-mono text-xs font-semibold text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                        />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer: Total Labels */}
          <div className="mt-4 pt-3 border-t border-stone-200 flex items-center justify-between text-xs font-bold text-stone-800">
            <span>Total labels</span>
            <span className="font-mono text-sm font-bold text-[#7A2232]">
              {totalLabels}
            </span>
          </div>
        </div>

        {/* Right Column: Label Setup & Preview */}
        <div className="lg:col-span-4 space-y-6">
          {/* Label Setup Card */}
          <div className="rounded-lg border border-stone-200/90 bg-white p-5 shadow-sm">
            <h3 className="font-serif text-base font-bold text-[#4A1521]">Label setup</h3>

            <div className="mt-4 space-y-4">
              {/* Label Size */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  LABEL SIZE
                </label>
                <div className="relative">
                  <select
                    value={labelSetup.labelSize}
                    onChange={(e) =>
                      setLabelSetup({...labelSetup, labelSize: e.target.value})
                    }
                    className="w-full appearance-none rounded border border-stone-200 bg-stone-50/60 py-2 pl-3 pr-8 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  >
                    <option value="50 × 30 mm · 1 across (thermal roll)">
                      50 × 30 mm · 1 across (thermal roll)
                    </option>
                    <option value="38 × 25 mm · 2 across">38 × 25 mm · 2 across</option>
                    <option value="50 × 25 mm · 1 across">50 × 25 mm · 1 across</option>
                    <option value="A4 sheet · 24 labels (3 × 8)">
                      A4 sheet · 24 labels (3 × 8)
                    </option>
                    <option value="A4 sheet · 40 labels (4 × 10)">
                      A4 sheet · 40 labels (4 × 10)
                    </option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"
                  />
                </div>
              </div>

              {/* Printer */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1">
                  PRINTER
                </label>
                <div className="relative">
                  <select
                    value={labelSetup.printer}
                    onChange={(e) =>
                      setLabelSetup({...labelSetup, printer: e.target.value})
                    }
                    className="w-full appearance-none rounded border border-stone-200 bg-stone-50/60 py-2 pl-3 pr-8 text-xs font-medium text-stone-800 focus:border-[#7A2232] focus:bg-white focus:outline-none"
                  >
                    <option value="TSC TE244 (USB)">TSC TE244 (USB)</option>
                    <option value="Zebra ZD220 (USB)">Zebra ZD220 (USB)</option>
                    <option value="TVS LP 46 Neo (USB)">TVS LP 46 Neo (USB)</option>
                    <option value="System Default Printer (PDF / Print Dialog)">
                      System Default Printer (PDF / Print Dialog)
                    </option>
                  </select>
                  <ChevronDown
                    size={14}
                    className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-stone-500"
                  />
                </div>
              </div>

              {/* Show On Label checkboxes */}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-2">
                  SHOW ON LABEL
                </label>
                <div className="space-y-2 text-xs text-stone-700">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labelSetup.showShopName}
                      onChange={(e) =>
                        setLabelSetup({...labelSetup, showShopName: e.target.checked})
                      }
                      className="h-3.5 w-3.5 rounded border-stone-300 text-[#7A2232] focus:ring-[#7A2232] accent-[#7A2232]"
                    />
                    <span>Shop name</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labelSetup.showItemNameSize}
                      onChange={(e) =>
                        setLabelSetup({
                          ...labelSetup,
                          showItemNameSize: e.target.checked,
                        })
                      }
                      className="h-3.5 w-3.5 rounded border-stone-300 text-[#7A2232] focus:ring-[#7A2232] accent-[#7A2232]"
                    />
                    <span>Item name &amp; size</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labelSetup.showMrp}
                      onChange={(e) =>
                        setLabelSetup({...labelSetup, showMrp: e.target.checked})
                      }
                      className="h-3.5 w-3.5 rounded border-stone-300 text-[#7A2232] focus:ring-[#7A2232] accent-[#7A2232]"
                    />
                    <span>MRP (incl. of all taxes)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labelSetup.showSalePrice}
                      onChange={(e) =>
                        setLabelSetup({...labelSetup, showSalePrice: e.target.checked})
                      }
                      className="h-3.5 w-3.5 rounded border-stone-300 text-[#7A2232] focus:ring-[#7A2232] accent-[#7A2232]"
                    />
                    <span>Sale price</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={labelSetup.showCostCode}
                      onChange={(e) =>
                        setLabelSetup({...labelSetup, showCostCode: e.target.checked})
                      }
                      className="h-3.5 w-3.5 rounded border-stone-300 text-[#7A2232] focus:ring-[#7A2232] accent-[#7A2232]"
                    />
                    <span>Cost code (hidden letters)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Preview Card */}
          <div className="rounded-lg border border-stone-200/90 bg-white p-5 shadow-sm">
            <h3 className="font-serif text-base font-bold text-[#4A1521]">Preview</h3>

            {/* Sticker Graphic Container */}
            <div className="mt-4 flex items-center justify-center rounded-lg bg-stone-100/70 p-4">
              <div className="w-[200px] rounded border border-stone-300 bg-white p-2.5 shadow-sm flex flex-col justify-between text-center select-none">
                {labelSetup.showShopName && (
                  <p className="font-extrabold uppercase tracking-wider text-[8.5px] text-stone-900 leading-tight">
                    MATOSHRI FASHIONS
                  </p>
                )}

                {labelSetup.showItemNameSize && (
                  <p className="mt-0.5 text-[8px] font-semibold text-stone-800 truncate">
                    {previewItem.productName} · {previewItem.size}
                  </p>
                )}

                <div className="my-1.5 flex flex-col items-center">
                  <BarcodeSvg value={previewItem.barcode} width={140} height={28} />
                </div>

                <div className="flex items-baseline justify-between border-t border-stone-200/80 pt-1 text-[8.5px] font-bold text-stone-900">
                  {labelSetup.showMrp ? (
                    <span className="text-[7.5px] text-stone-600 font-semibold">
                      MRP ₹{previewItem.mrp.toLocaleString('en-IN')}
                    </span>
                  ) : (
                    <span />
                  )}
                  {labelSetup.showSalePrice && (
                    <span className="font-serif font-bold text-stone-900 text-[9.5px]">
                      ₹{previewItem.price.toLocaleString('en-IN')}
                    </span>
                  )}
                </div>

                {labelSetup.showCostCode && (
                  <p className="text-[6.5px] font-mono text-stone-400 mt-0.5 text-right">
                    KRT
                  </p>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handlePrintLabels(true)}
                className="flex items-center justify-center gap-1.5 rounded border border-[#7A2232] py-2 text-xs font-bold uppercase tracking-wider text-[#7A2232] transition-colors hover:bg-[#FDF2F4]"
              >
                TEST PRINT
              </button>

              <button
                type="button"
                disabled={totalLabels === 0 || recordPrintMutation.isPending}
                onClick={() => handlePrintLabels(false)}
                className="flex items-center justify-center gap-1.5 rounded bg-[#7A2232] py-2 text-xs font-bold uppercase tracking-wider text-white shadow-sm transition-all hover:bg-[#5E1724] disabled:opacity-50"
              >
                PRINT {totalLabels}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
