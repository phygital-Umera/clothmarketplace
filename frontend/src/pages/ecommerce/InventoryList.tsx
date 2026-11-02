import {Column, GenericTable} from '@/components/Forms';
import {PageHeader} from '@/components/ui';
import {useInventory, useAdjustStock} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {AlertTriangle, Boxes, SlidersHorizontal, Search} from 'lucide-react';
import {useState} from 'react';

export default function InventoryList({
  panel,
  canAdjust = true,
}: {
  panel: string;
  /** Employees need the "Adjust stock" permission */
  canAdjust?: boolean;
}) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [adjustTarget, setAdjustTarget] = useState<any>(null);
  const [adjustQty, setAdjustQty] = useState(0);
  const [adjustType, setAdjustType] = useState<'INCREASE' | 'DECREASE' | 'CORRECTION'>('INCREASE');
  const [adjustReason, setAdjustReason] = useState('');

  const {data, isPending, isFetching, refetch} = useInventory(panel, {
    page,
    limit: 15,
    search: search || undefined,
  });

  const adjustStockMutation = useAdjustStock(panel);

  const handleAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTarget) return;

    await adjustStockMutation.mutateAsync({
      branchId: adjustTarget.branch?.id,
      variantId: adjustTarget.variant?.id,
      type: adjustType,
      quantity: Number(adjustQty),
      reason: adjustReason || 'Manual Inventory Adjustment',
    });

    setAdjustTarget(null);
    setAdjustQty(0);
    setAdjustReason('');
    refetch();
  };

  const columns: Column<any>[] = [
    {
      header: 'Product & SKU',
      render: (i) => (
        <div>
          <p className="font-medium text-espresso">{i.product?.name}</p>
          <p className="text-technical-data text-outline">SKU: {i.variant?.sku}</p>
        </div>
      ),
    },
    {
      header: 'Branch',
      render: (i) => i.branch?.name || '-',
    },
    {
      header: 'Variant',
      render: (i) => (
        <span className="text-body-sm font-medium text-espresso">
          Size: {i.variant?.size} | Color: {i.variant?.color}
        </span>
      ),
    },
    {
      header: 'Physical Stock',
      key: 'physicalStock',
      render: (i) => <span className="font-semibold text-espresso">{i.physicalStock}</span>,
    },
    {
      header: 'Reserved',
      key: 'reservedStock',
      render: (i) => <span className="text-outline">{i.reservedStock}</span>,
    },
    {
      header: 'Available',
      key: 'availableStock',
      render: (i) => (
        <span
          className={`font-semibold ${
            i.availableStock <= i.threshold ? 'text-burgundy' : 'text-emerald-700'
          }`}
        >
          {i.availableStock}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (i) =>
        i.isOutOfStock ? (
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs font-medium text-rose-800">
            <AlertTriangle size={12} /> Out of Stock
          </span>
        ) : i.isLowStock ? (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
            Low Stock
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
            In Stock
          </span>
        ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        compact
        breadcrumbs={[{label: 'Operations'}, {label: 'Inventory Overview'}]}
        title="Inventory & Stock Management"
      />

      <div className="flex items-center gap-3 rounded-lg border border-outline/20 bg-ivory-light p-3">
        <Search size={18} className="text-outline" />
        <input
          type="text"
          placeholder="Filter by product, SKU or variant..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-body-sm text-espresso focus:outline-none"
        />
      </div>

      <GenericTable
        caption="Stock List"
        columns={columns}
        data={data?.items || []}
        loading={isPending}
        fetching={isFetching}
        onRetry={() => refetch()}
        emptyIcon={<Boxes size={24} />}
        emptyTitle="No stock records found"
        pagination={data?.pagination}
        onPageChange={setPage}
        rowActions={
          canAdjust
            ? (row) => [
                {
                  label: 'Adjust Stock',
                  icon: <SlidersHorizontal size={16} />,
                  onClick: () => setAdjustTarget(row),
                },
              ]
            : undefined
        }
      />

      {/* Stock Adjustment Modal */}
      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-outline/20 bg-ivory p-6 shadow-xl">
            <h3 className="font-serif text-headline-sm text-burgundy">Adjust Stock</h3>
            <p className="mt-1 text-body-sm text-outline">
              {adjustTarget.product?.name} ({adjustTarget.variant?.size} / {adjustTarget.variant?.color})
            </p>

            <form onSubmit={handleAdjustSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-label-caps block text-espresso">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e: any) => setAdjustType(e.target.value)}
                  className="mt-1 w-full rounded border border-outline/30 bg-white p-2 text-body-sm"
                >
                  <option value="INCREASE">Increase Stock (Restock)</option>
                  <option value="DECREASE">Decrease Stock (Damage / Loss)</option>
                  <option value="CORRECTION">Set Exact Quantity (Correction)</option>
                </select>
              </div>

              <div>
                <label className="text-label-caps block text-espresso">Quantity</label>
                <input
                  type="number"
                  min="1"
                  required
                  value={adjustQty}
                  onChange={(e) => setAdjustQty(Number(e.target.value))}
                  className="mt-1 w-full rounded border border-outline/30 bg-white p-2 text-body-sm"
                />
              </div>

              <div>
                <label className="text-label-caps block text-espresso">Reason</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stock shipment received, physical audit count"
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="mt-1 w-full rounded border border-outline/30 bg-white p-2 text-body-sm"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setAdjustTarget(null)}
                  className="btn-ghost"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustStockMutation.isPending}
                  className="btn-primary"
                >
                  {adjustStockMutation.isPending ? 'Saving...' : 'Confirm Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

