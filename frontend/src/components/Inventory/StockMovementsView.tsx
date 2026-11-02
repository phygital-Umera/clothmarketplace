import {Column, GenericTable} from '@/components/Forms';
import {useStockMovements} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {ArrowDown, ArrowUp, Clock, History, Search} from 'lucide-react';
import {useState} from 'react';

interface Props {
  panel: string;
}

export default function StockMovementsView({panel}: Props) {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');

  const {data, isPending, isFetching, refetch} = useStockMovements(panel, {
    page,
    limit: 15,
    search: search || undefined,
  });

  const columns: Column<any>[] = [
    {
      header: 'Date & Time',
      key: 'createdAt',
      render: (m) => (
        <div>
          <p className="font-medium text-espresso text-body-sm">
            {new Date(m.createdAt).toLocaleDateString(undefined, {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
          <p className="text-xs text-outline">
            {new Date(m.createdAt).toLocaleTimeString(undefined, {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </p>
        </div>
      ),
    },
    {
      header: 'Product & SKU',
      render: (m) => (
        <div>
          <p className="font-medium text-espresso text-body-sm">{m.product?.name}</p>
          <p className="text-xs text-outline">SKU: {m.variant?.sku || m.product?.sku}</p>
        </div>
      ),
    },
    {
      header: 'Variant',
      render: (m) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-espresso">
          {m.variant?.colorHex && (
            <span
              className="h-2.5 w-2.5 rounded-full border border-black/20"
              style={{backgroundColor: m.variant.colorHex}}
            />
          )}
          {m.variant?.color} / {m.variant?.size}
        </span>
      ),
    },
    {
      header: 'Type',
      render: (m) => {
        const isIncrease = m.type.includes('INCREASE') || m.newPhysical > m.prevPhysical;
        return isIncrease ? (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
            <ArrowUp size={12} /> Stock In
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
            <ArrowDown size={12} /> Stock Out
          </span>
        );
      },
    },
    {
      header: 'Quantity',
      render: (m) => {
        const isIncrease = m.type.includes('INCREASE') || m.newPhysical > m.prevPhysical;
        return (
          <span className={`font-bold text-sm ${isIncrease ? 'text-emerald-700' : 'text-rose-700'}`}>
            {isIncrease ? `+${m.quantity}` : `-${m.quantity}`}
          </span>
        );
      },
    },
    {
      header: 'Physical Stock Flow',
      render: (m) => (
        <div className="text-body-sm text-espresso">
          <span className="text-outline">{m.prevPhysical}</span>
          <span className="mx-1.5 text-outline">→</span>
          <span className="font-semibold text-espresso">{m.newPhysical}</span>
        </div>
      ),
    },
    {
      header: 'Reason & Notes',
      render: (m) => (
        <div className="max-w-xs">
          <p className="text-body-sm font-medium text-espresso">{m.reason}</p>
          {m.reference && <p className="text-xs text-outline truncate">{m.reference}</p>}
        </div>
      ),
    },
    {
      header: 'Performed By',
      render: (m) => (
        <span className="text-xs text-espresso font-medium">
          {m.performedBy?.fullname || 'System'}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Search Filter */}
      <div className="flex items-center gap-3 rounded-lg border border-ivory-300 bg-white p-2.5">
        <Search size={18} className="text-outline" />
        <input
          type="text"
          placeholder="Search adjustment history by reason, product, SKU, or variant..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          className="w-full bg-transparent text-body-sm text-espresso focus:outline-none"
        />
      </div>

      <GenericTable
        caption="Stock Movements History"
        columns={columns}
        data={data?.items || []}
        loading={isPending}
        fetching={isFetching}
        onRetry={() => refetch()}
        emptyIcon={<History size={24} />}
        emptyTitle="No stock movements recorded"
        pagination={data?.pagination}
        onPageChange={setPage}
      />
    </div>
  );
}

