import {Column, GenericTable} from '@/components/Forms';
import {PageHeader} from '@/components/ui';
import BatchStockModal from '@/components/Inventory/BatchStockModal';
import ProductHistoryModal from '@/components/Inventory/ProductHistoryModal';
import ProductVariantsModal from '@/components/Inventory/ProductVariantsModal';
import ThresholdModal, {ThresholdTarget} from '@/components/Inventory/ThresholdModal';
import {useInventory, useStockMovements} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  Boxes,
  CheckCircle2,
  History,
  Package,
  RefreshCw,
  Search,
} from 'lucide-react';
import {useState} from 'react';

interface Props {
  panel: string;
  canAdjust?: boolean;
}

type ViewTab = 'products' | 'inward' | 'outward' | 'all_history';

const VIEW_TABS = [
  {id: 'products' as const, label: 'Products', icon: Package},
  {id: 'inward' as const, label: 'Inward History', icon: ArrowUp},
  {id: 'outward' as const, label: 'Outward History', icon: ArrowDown},
  {id: 'all_history' as const, label: 'All History', icon: History},
];

export default function InventoryList({panel, canAdjust = true}: Props) {
  const [viewMode, setViewMode] = useState<ViewTab>('products');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  // Modal states
  const [batchModal, setBatchModal] = useState<{
    isOpen: boolean;
    mode: 'INWARD' | 'OUTWARD';
    targetProduct?: any | null;
  }>({
    isOpen: false,
    mode: 'INWARD',
    targetProduct: null,
  });

  const [historyProduct, setHistoryProduct] = useState<{id: string; name: string; sku: string} | null>(null);
  const [viewProductVariants, setViewProductVariants] = useState<any | null>(null);
  const [thresholdTarget, setThresholdTarget] = useState<ThresholdTarget | null>(null);

  // 1. Products Inventory Query (enabled when viewing Products)
  const {
    data: productsData,
    isPending: productsPending,
    isFetching: productsFetching,
    refetch: refetchProducts,
  } = useInventory(
    panel,
    {
      page,
      limit: 15,
      search: search || undefined,
      view: 'product',
    },
    {enabled: viewMode === 'products'}
  );

  // 2. Stock Movements History Query (enabled when viewing Inward, Outward, or All History)
  const movementAction =
    viewMode === 'inward' ? 'INWARD' : viewMode === 'outward' ? 'OUTWARD' : undefined;

  const {
    data: movementsData,
    isPending: movementsPending,
    isFetching: movementsFetching,
    refetch: refetchMovements,
  } = useStockMovements(
    panel,
    {
      page,
      limit: 15,
      search: search || undefined,
      action: movementAction,
    },
    {enabled: viewMode !== 'products'}
  );

  const isFetching = viewMode === 'products' ? productsFetching : movementsFetching;

  const handleRefresh = () => {
    if (viewMode === 'products') {
      refetchProducts();
    } else {
      refetchMovements();
    }
  };

  const handleModalSuccess = () => {
    refetchProducts();
    refetchMovements();
  };

  // Table Columns: One Row per Product
  const productColumns: Column<any>[] = [
    {
      header: 'Product',
      render: (p) => (
        <button
          type="button"
          onClick={() => setViewProductVariants(p)}
          className="flex items-center gap-2.5 text-left group min-w-[200px]"
          title="Click to view all variant stock"
        >
          {p.mainImage ? (
            <img
              src={p.mainImage}
              alt=""
              className="h-9 w-9 rounded shrink-0 object-cover border border-ivory-300 group-hover:border-burgundy transition"
            />
          ) : (
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded border border-ivory-300 bg-ivory-100 text-xs text-outline group-hover:border-burgundy transition">
              <Package size={15} />
            </div>
          )}
          <div className="min-w-0">
            <p className="font-medium text-espresso text-body-sm group-hover:text-burgundy transition truncate">
              {p.name}
            </p>
            <p className="text-[11px] text-outline truncate">{p.category || 'Apparel'}</p>
          </div>
        </button>
      ),
    },
    {
      header: 'Product SKU',
      render: (p) => <span className="font-mono text-xs text-outline whitespace-nowrap">{p.sku}</span>,
    },
    {
      header: 'Variants Configured',
      render: (p) => (
        <button
          type="button"
          onClick={() => setViewProductVariants(p)}
          className="inline-flex items-center gap-1 rounded-full bg-ivory-200 hover:bg-ivory-300 px-2.5 py-0.5 text-xs font-semibold text-espresso transition"
          title="Click to view variants breakdown"
        >
          <span>{p.totalVariants} variants</span>
        </button>
      ),
    },
    {
      header: 'Physical Stock',
      key: 'physicalStock',
      render: (p) => <span className="font-semibold text-espresso">{p.physicalStock}</span>,
    },
    {
      header: 'Reserved',
      key: 'reservedStock',
      render: (p) => <span className="text-outline">{p.reservedStock}</span>,
    },
    {
      header: 'Available Stock',
      key: 'availableStock',
      render: (p) => (
        <span
          className={`font-bold text-sm ${
            p.availableStock <= 0
              ? 'text-rose-700'
              : p.isLowStock
                ? 'text-amber-700'
                : 'text-emerald-700'
          }`}
        >
          {p.availableStock}
        </span>
      ),
    },
    {
      header: 'Status',
      render: (p) =>
        p.isOutOfStock ? (
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 whitespace-nowrap">
            <AlertCircle size={11} /> Out of Stock
          </span>
        ) : p.isLowStock ? (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 whitespace-nowrap">
            <AlertTriangle size={11} /> Low Stock Variant
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 whitespace-nowrap">
            <CheckCircle2 size={11} /> In Stock
          </span>
        ),
    },
    {
      header: 'Actions',
      render: (p) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {canAdjust && (
            <>
              {/* Inward Button: Opens Inward Popup for this product */}
              <button
                type="button"
                onClick={() => setBatchModal({isOpen: true, mode: 'INWARD', targetProduct: p})}
                className="flex items-center gap-1 rounded border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-800 transition"
                title={`Inward stock for ${p.name}`}
              >
                <ArrowUp size={12} /> Inward
              </button>

              {/* Outward Button: Opens Outward Popup for this product */}
              <button
                type="button"
                onClick={() => setBatchModal({isOpen: true, mode: 'OUTWARD', targetProduct: p})}
                className="flex items-center gap-1 rounded border border-rose-600 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 text-xs font-semibold text-rose-800 transition"
                title={`Outward stock for ${p.name}`}
              >
                <ArrowDown size={12} /> Outward
              </button>
            </>
          )}

          {/* History Button: Opens History Popup for this product */}
          <button
            type="button"
            onClick={() => setHistoryProduct({id: p.id, name: p.name, sku: p.sku})}
            className="flex items-center gap-1 rounded border border-ivory-300 bg-white hover:bg-ivory-100 px-2 py-1 text-xs font-medium text-espresso transition"
            title={`View submission history for ${p.name}`}
          >
            <History size={12} /> History
          </button>
        </div>
      ),
    },
  ];

  // Table Columns: Stock Movements History (Inward / Outward / All)
  const movementColumns: Column<any>[] = [
    {
      header: 'Date & Time',
      key: 'createdAt',
      render: (m) => (
        <div>
          <p className="font-medium text-espresso text-body-sm whitespace-nowrap">
            {new Date(m.createdAt).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p className="text-[11px] text-outline whitespace-nowrap">
            {new Date(m.createdAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ),
    },
    {
      header: 'Product',
      render: (m) => (
        <div className="min-w-[170px]">
          <p className="font-medium text-espresso text-body-sm truncate">{m.product?.name}</p>
          <p className="font-mono text-[11px] text-outline truncate">SKU: {m.product?.sku}</p>
        </div>
      ),
    },
    {
      header: 'Variant (Size / Color)',
      render: (m) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-espresso whitespace-nowrap">
          {m.variant?.colorHex && (
            <span
              className="h-2.5 w-2.5 rounded-full border border-black/20"
              style={{backgroundColor: m.variant.colorHex}}
            />
          )}
          {m.variant?.color} / Size {m.variant?.size}
        </span>
      ),
    },
    {
      header: 'Action',
      render: (m) => {
        const isIncrease = m.type?.includes('INCREASE') || m.newPhysical > m.prevPhysical;
        return isIncrease ? (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 whitespace-nowrap">
            <ArrowUp size={11} /> Inward
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 whitespace-nowrap">
            <ArrowDown size={11} /> Outward
          </span>
        );
      },
    },
    {
      header: 'Quantity',
      render: (m) => {
        const isIncrease = m.type?.includes('INCREASE') || m.newPhysical > m.prevPhysical;
        return (
          <span
            className={`font-bold text-xs whitespace-nowrap ${
              isIncrease ? 'text-emerald-700' : 'text-rose-700'
            }`}
          >
            {isIncrease ? `+${m.quantity}` : `-${m.quantity}`}
          </span>
        );
      },
    },
    {
      header: 'Stock Flow',
      render: (m) => (
        <div className="text-xs text-espresso whitespace-nowrap">
          <span className="text-outline">{m.prevPhysical}</span>
          <span className="mx-1 text-outline">→</span>
          <span className="font-semibold">{m.newPhysical}</span>
        </div>
      ),
    },
    {
      header: 'Reason & Ref',
      render: (m) => (
        <div className="text-xs max-w-[200px]">
          <p className="font-medium text-espresso truncate">{m.reason}</p>
          {m.reference && <p className="text-[10px] text-outline font-mono truncate">{m.reference}</p>}
        </div>
      ),
    },
    {
      header: 'Submitted By',
      render: (m) => (
        <span className="text-xs text-outline whitespace-nowrap">
          {m.performedBy?.fullname || 'System'}
        </span>
      ),
    },
  ];

  const searchPlaceholder =
    viewMode === 'products'
      ? 'Search product by name or SKU...'
      : viewMode === 'inward'
        ? 'Search inward history by product, SKU, reason, ref...'
        : viewMode === 'outward'
          ? 'Search outward history by product, SKU, reason, ref...'
          : 'Search stock history by product, SKU, reason, ref...';

  return (
    <div className="space-y-4">
      {/* Top Header */}
      <PageHeader
        compact
        breadcrumbs={[{label: 'Operations'}, {label: 'Inventory Management'}]}
        title="Inventory Management"
      />

      {/* Main Single-Line Product / Movement History Area */}
      <div className="space-y-3">
        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-ivory-300 bg-white p-3 shadow-sm">
          {/* Search Input */}
          <div className="flex items-center gap-2.5 rounded-lg border border-ivory-300 bg-ivory-50 px-3 py-1.5 w-full sm:w-80">
            <Search size={15} className="text-outline shrink-0" />
            <input
              type="text"
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full bg-transparent text-body-sm text-espresso focus:outline-none"
            />
          </div>

          {/* Inward & Outward History / Products Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
            <div className="flex flex-wrap items-center gap-1.5">
              {VIEW_TABS.map((tab) => {
                const Icon = tab.icon;
                const isActive = viewMode === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setViewMode(tab.id);
                      setPage(1);
                    }}
                    className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition border ${
                      isActive
                        ? tab.id === 'inward'
                          ? 'border-emerald-700 bg-emerald-700 text-white'
                          : tab.id === 'outward'
                            ? 'border-rose-700 bg-rose-700 text-white'
                            : 'border-burgundy bg-burgundy text-white'
                        : 'border-ivory-300 bg-ivory-100 text-outline hover:border-outline hover:text-espresso'
                    }`}
                  >
                    <Icon
                      size={12}
                      className={
                        !isActive && tab.id === 'inward'
                          ? 'text-emerald-700'
                          : !isActive && tab.id === 'outward'
                            ? 'text-rose-700'
                            : ''
                      }
                    />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={handleRefresh}
              title="Refresh current view"
              className="p-1.5 rounded-lg border border-ivory-300 bg-ivory-50 text-outline hover:text-espresso hover:bg-ivory-100 transition"
            >
              <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* View Switch: Products Table vs History Table */}
        {viewMode === 'products' ? (
          <GenericTable
            caption="Product Inventory"
            columns={productColumns}
            data={productsData?.items || []}
            loading={productsPending}
            fetching={productsFetching}
            onRetry={() => refetchProducts()}
            emptyIcon={<Boxes size={24} />}
            emptyTitle="No product inventory records found"
            pagination={productsData?.pagination}
            onPageChange={setPage}
          />
        ) : (
          <GenericTable
            caption={
              viewMode === 'inward'
                ? 'Inward Stock History'
                : viewMode === 'outward'
                  ? 'Outward Stock History'
                  : 'All Stock Movement History'
            }
            columns={movementColumns}
            data={movementsData?.items || []}
            loading={movementsPending}
            fetching={movementsFetching}
            onRetry={() => refetchMovements()}
            emptyIcon={<History size={24} />}
            emptyTitle={
              viewMode === 'inward'
                ? 'No inward stock history records found'
                : viewMode === 'outward'
                  ? 'No outward stock history records found'
                  : 'No stock history records found'
            }
            pagination={movementsData?.pagination}
            onPageChange={setPage}
          />
        )}
      </div>

      {/* Product-Specific Inward / Outward Modal */}
      <BatchStockModal
        isOpen={batchModal.isOpen}
        mode={batchModal.mode}
        panel={panel}
        targetProduct={batchModal.targetProduct}
        onClose={() => setBatchModal({isOpen: false, mode: 'INWARD', targetProduct: null})}
        onSuccess={handleModalSuccess}
      />

      {/* Product-Specific History Modal */}
      <ProductHistoryModal
        isOpen={!!historyProduct}
        product={historyProduct}
        panel={panel}
        onClose={() => setHistoryProduct(null)}
      />

      {/* Product Variants Breakdown Modal */}
      <ProductVariantsModal
        isOpen={!!viewProductVariants}
        product={viewProductVariants}
        canAdjust={canAdjust}
        onClose={() => setViewProductVariants(null)}
        onInwardClick={(p) => {
          setViewProductVariants(null);
          setBatchModal({isOpen: true, mode: 'INWARD', targetProduct: p});
        }}
        onOutwardClick={(p) => {
          setViewProductVariants(null);
          setBatchModal({isOpen: true, mode: 'OUTWARD', targetProduct: p});
        }}
        onHistoryClick={(p) => {
          setViewProductVariants(null);
          setHistoryProduct({id: p.id, name: p.name, sku: p.sku});
        }}
        onEditThresholdClick={(v, prodName) => {
          setThresholdTarget({
            variantId: v.id,
            productName: prodName,
            size: v.size,
            color: v.color,
            currentThreshold: v.threshold,
          });
        }}
      />

      {/* Threshold Modal */}
      <ThresholdModal
        target={thresholdTarget}
        panel={panel}
        onClose={() => setThresholdTarget(null)}
        onSuccess={handleModalSuccess}
      />
    </div>
  );
}
