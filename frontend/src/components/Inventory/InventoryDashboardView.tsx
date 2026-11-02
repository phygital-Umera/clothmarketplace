import {useInventoryDashboard} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  Clock,
  Layers,
  Package,
  RefreshCw,
  SlidersHorizontal,
} from 'lucide-react';
import {StockAdjustTarget} from './StockAdjustModal';

interface Props {
  panel: string;
  onAdjustClick: (target: StockAdjustTarget) => void;
  onViewAllMovements: () => void;
}

export default function InventoryDashboardView({
  panel,
  onAdjustClick,
  onViewAllMovements,
}: Props) {
  const {data, isPending, refetch, isFetching} = useInventoryDashboard(panel);

  const summary = data?.summary ?? {
    totalProducts: 0,
    totalVariants: 0,
    totalPhysicalStock: 0,
    totalAvailableStock: 0,
    inStockCount: 0,
    lowStockCount: 0,
    outOfStockCount: 0,
  };

  const alerts = data?.alerts ?? [];
  const recentMovements = data?.recentMovements ?? [];

  return (
    <div className="space-y-6">
      {/* Top Controls: Refresh */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="font-serif text-headline-sm text-espresso">Inventory Overview</h2>
          <p className="text-body-sm text-outline">Real-time stock indicators and threshold monitoring.</p>
        </div>
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="btn-ghost flex items-center gap-1.5 text-xs text-outline hover:text-espresso"
        >
          <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
          Refresh Stats
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {/* Total Products */}
        <div className="rounded-xl border border-ivory-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-label-caps uppercase text-outline">Total Products</span>
            <Package size={18} className="text-outline" />
          </div>
          <p className="mt-2 text-headline-md font-semibold text-espresso">
            {isPending ? '—' : summary.totalProducts}
          </p>
          <p className="mt-1 flex items-center gap-1 text-xs text-outline">
            <Layers size={13} /> {summary.totalVariants} variants active
          </p>
        </div>

        {/* Total Stock Available */}
        <div className="rounded-xl border border-ivory-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-label-caps uppercase text-outline">Total Stock</span>
            <Boxes size={18} className="text-emerald-700" />
          </div>
          <p className="mt-2 text-headline-md font-semibold text-emerald-800">
            {isPending ? '—' : summary.totalAvailableStock}
          </p>
          <p className="mt-1 text-xs text-outline">
            Physical: {summary.totalPhysicalStock} units
          </p>
        </div>

        {/* In Stock */}
        <div className="rounded-xl border border-ivory-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-label-caps uppercase text-outline">In Stock</span>
            <CheckCircle2 size={18} className="text-emerald-600" />
          </div>
          <p className="mt-2 text-headline-md font-semibold text-espresso">
            {isPending ? '—' : summary.inStockCount}
          </p>
          <p className="mt-1 text-xs text-emerald-700 font-medium">
            Healthy stock levels
          </p>
        </div>

        {/* Low Stock Alert */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-label-caps uppercase text-amber-800">Low Stock</span>
            <AlertTriangle size={18} className="text-amber-600" />
          </div>
          <p className="mt-2 text-headline-md font-semibold text-amber-900">
            {isPending ? '—' : summary.lowStockCount}
          </p>
          <p className="mt-1 text-xs text-amber-700">
            ≤ threshold alert
          </p>
        </div>

        {/* Out of Stock Alert */}
        <div className="col-span-2 sm:col-span-1 rounded-xl border border-rose-200 bg-rose-50/50 p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-label-caps uppercase text-rose-800">Out of Stock</span>
            <AlertCircle size={18} className="text-rose-600" />
          </div>
          <p className="mt-2 text-headline-md font-semibold text-rose-900">
            {isPending ? '—' : summary.outOfStockCount}
          </p>
          <p className="mt-1 text-xs text-rose-700 font-medium">
            Requires restocking
          </p>
        </div>
      </div>

      {/* Stock Alerts Section */}
      <div className="rounded-xl border border-ivory-300 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-ivory-200">
          <div className="flex items-center gap-2">
            <AlertTriangle size={18} className="text-burgundy" />
            <h3 className="font-serif text-headline-sm text-espresso">Attention Required: Stock Alerts</h3>
          </div>
          <span className="text-xs text-outline">{alerts.length} critical items</span>
        </div>

        {isPending ? (
          <div className="py-12 text-center text-sm text-outline">Loading stock alerts…</div>
        ) : alerts.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircle2 size={32} className="mx-auto text-emerald-600 mb-2" />
            <p className="font-medium text-espresso text-body-md">All stock levels healthy!</p>
            <p className="text-body-sm text-outline">No products or variants are currently below their low-stock threshold.</p>
          </div>
        ) : (
          <div className="mt-3 divide-y divide-ivory-100">
            {alerts.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 py-3 hover:bg-ivory-50/50 px-2 rounded-lg transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.image ? (
                    <img
                      src={item.image}
                      alt=""
                      className="h-10 w-10 shrink-0 rounded border border-ivory-300 object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded border border-ivory-300 bg-ivory-100 text-xs text-outline">
                      <Package size={16} />
                    </div>
                  )}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-espresso text-body-md">{item.productName}</p>
                      {item.status === 'OUT_OF_STOCK' ? (
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                          Out of Stock
                        </span>
                      ) : (
                        <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                          Low Stock
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-outline mt-0.5">
                      <span>SKU: {item.variantSku || item.productSku}</span>
                      <span>•</span>
                      <span className="inline-flex items-center gap-1 font-medium text-espresso">
                        {item.colorHex && (
                          <span
                            className="h-2.5 w-2.5 rounded-full border border-black/20"
                            style={{backgroundColor: item.colorHex}}
                          />
                        )}
                        {item.color} / Size {item.size}
                      </span>
                      <span>•</span>
                      <span>Category: {item.category}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4 self-end sm:self-center">
                  <div className="text-right">
                    <p className="text-xs text-outline">Available / Threshold</p>
                    <p className="text-sm font-bold text-espresso">
                      <span className={item.availableStock <= 0 ? 'text-rose-700' : 'text-amber-700'}>
                        {item.availableStock}
                      </span>{' '}
                      <span className="text-outline font-normal">/ {item.threshold}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      onAdjustClick({
                        variantId: item.variantId,
                        productName: item.productName,
                        productSku: item.productSku,
                        variantSku: item.variantSku,
                        size: item.size,
                        color: item.color,
                        colorHex: item.colorHex,
                        image: item.image,
                        currentPhysical: item.physicalStock,
                        currentReserved: item.reservedStock,
                        currentAvailable: item.availableStock,
                        threshold: item.threshold,
                      })
                    }
                    className="btn-primary flex items-center gap-1.5 py-1.5 px-3 text-xs"
                  >
                    <SlidersHorizontal size={13} />
                    Restock
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Movements Activity Card */}
      <div className="rounded-xl border border-ivory-300 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-ivory-200">
          <div className="flex items-center gap-2">
            <Clock size={18} className="text-outline" />
            <h3 className="font-serif text-headline-sm text-espresso">Recent Stock Adjustments</h3>
          </div>
          <button
            type="button"
            onClick={onViewAllMovements}
            className="text-xs font-medium text-burgundy hover:underline"
          >
            View Full History →
          </button>
        </div>

        {recentMovements.length === 0 ? (
          <p className="py-6 text-center text-body-sm text-outline">No stock adjustments recorded yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-ivory-100">
            {recentMovements.map((m: any) => {
              const isIncrease = m.type.includes('INCREASE') || m.newPhysical > m.prevPhysical;
              return (
                <div key={m.id} className="flex items-center justify-between py-2.5 text-xs">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
                        isIncrease ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {isIncrease ? <ArrowUp size={13} /> : <ArrowDown size={13} />}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate font-medium text-espresso">
                        {m.product?.name}{' '}
                        <span className="text-outline font-normal">
                          ({m.variant?.size} / {m.variant?.color})
                        </span>
                      </p>
                      <p className="text-outline truncate">
                        {m.reason} {m.performedBy?.fullname ? `• by ${m.performedBy.fullname}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span
                      className={`font-semibold ${
                        isIncrease ? 'text-emerald-700' : 'text-rose-700'
                      }`}
                    >
                      {isIncrease ? `+${m.quantity}` : `-${m.quantity}`}
                    </span>
                    <p className="text-[10px] text-outline">
                      {m.prevPhysical} → {m.newPhysical}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

