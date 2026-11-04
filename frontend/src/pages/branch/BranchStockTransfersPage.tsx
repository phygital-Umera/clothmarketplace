import {useState} from 'react';
import {
  useStockTransfers,
  useStockTransferSummary,
  useConfirmTransferReceipt,
} from '@/lib/react-query/queriesAndMutations/stockTransfer';
import {StockTransfer} from '@/lib/api/stockTransfer';
import {Plus, Search, ArrowRight, CheckCircle2, AlertTriangle} from 'lucide-react';
import BranchNewTransferPage from './BranchNewTransferPage';
import toast from 'react-hot-toast';

type TabType = 'ALL' | 'INCOMING' | 'OUTGOING' | 'WITHIN_BRANCH';

export default function BranchStockTransfersPage() {
  const [showNewTransfer, setShowNewTransfer] = useState(false);
  const [tab, setTab] = useState<TabType>('ALL');
  const [search, setSearch] = useState('');

  const {data: summary} = useStockTransferSummary();
  const {data, isLoading, refetch} = useStockTransfers({
    tab,
    search: search.trim() || undefined,
  });

  const confirmReceiptMutation = useConfirmTransferReceipt();

  const transfers = data?.items || [];

  const [selectedTransfer, setSelectedTransfer] = useState<StockTransfer | null>(null);

  const activeTransfer =
    selectedTransfer ||
    transfers.find((t) => t.status === 'IN TRANSIT') ||
    transfers[0] ||
    null;

  // Receive form states
  const [receivedQtyMap, setReceivedQtyMap] = useState<Record<string, number>>({
    'Cotton Kurta M / Indigo': 30,
    'Cotton Kurta L / Indigo': 28,
    'Banarasi Saree Free / Maroon': 20,
  });
  const [damaged, setDamaged] = useState(0);
  const [note, setNote] = useState('');

  const handleSelectTransfer = (t: StockTransfer) => {
    setSelectedTransfer(t);
    const initialMap: Record<string, number> = {};
    t.metadata?.variants?.forEach((v) => {
      initialMap[v.name] = v.received ?? v.sent;
    });
    setReceivedQtyMap(initialMap);
  };

  const handleConfirmReceipt = async () => {
    if (!activeTransfer) return;
    await confirmReceiptMutation.mutateAsync({
      id: activeTransfer.id,
      data: {
        damagedOnArrival: damaged,
        receivingNote: note,
        itemsReceived: receivedQtyMap,
      },
    });
    refetch();
  };

  if (showNewTransfer) {
    return (
      <BranchNewTransferPage
        onClose={() => {
          setShowNewTransfer(false);
          refetch();
        }}
      />
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-label-caps uppercase text-ivory-600 tracking-wider">
            Stock / Transfers
          </p>
          <h1 className="font-serif text-headline-md font-normal text-burgundy-deep">
            Stock transfers
          </h1>
          <p className="mt-1 text-body-sm text-espresso-muted">
            Move stock between your shops, or request it from other branches. Requested → Approved → Dispatched → Received.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowNewTransfer(true)}
          className="btn-primary flex items-center gap-1.5 bg-burgundy hover:bg-burgundy-deep text-white shadow-sm self-start"
        >
          <Plus size={16} />
          <span>NEW TRANSFER</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
          <p className="text-label-caps uppercase text-ivory-600">To Approve</p>
          <p className="mt-1 font-serif text-headline-sm font-semibold text-espresso">
            {summary?.toApprove ?? 1}
          </p>
          <p className="mt-0.5 text-technical-data text-espresso-muted">
            Requested by your shops
          </p>
        </div>

        <div className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
          <p className="text-label-caps uppercase text-ivory-600">To Dispatch</p>
          <p className="mt-1 font-serif text-headline-sm font-semibold text-espresso">
            {summary?.toDispatch ?? 1}
          </p>
          <p className="mt-0.5 text-technical-data text-espresso-muted">Approved, not sent</p>
        </div>

        <div className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
          <p className="text-label-caps uppercase text-ivory-600">Incoming</p>
          <p className="mt-1 font-serif text-headline-sm font-semibold text-espresso">
            {summary?.incoming ?? 1}
          </p>
          <p className="mt-0.5 text-technical-data text-espresso-muted">80 units in transit</p>
        </div>

        <div className="rounded-lg border border-ivory-300 bg-white p-4 shadow-sm">
          <p className="text-label-caps uppercase text-ivory-600">Discrepancies</p>
          <p className="mt-1 font-serif text-headline-sm font-semibold text-error">
            {summary?.discrepancies ?? 1}
          </p>
          <p className="mt-0.5 text-technical-data text-error font-medium">2 units short</p>
        </div>
      </div>

      {/* Main Grid: Transfers Table (2 cols) & Receive Panel (1 col) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Transfers List */}
        <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm lg:col-span-2 space-y-4">
          {/* Tabs and Search */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-ivory-200 pb-3">
            <div className="flex border-b sm:border-b-0 border-ivory-200">
              {(
                [
                  {id: 'ALL', label: 'All'},
                  {id: 'INCOMING', label: 'Incoming'},
                  {id: 'OUTGOING', label: 'Outgoing'},
                  {id: 'WITHIN_BRANCH', label: 'Within Branch'},
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`border-b-2 px-3 py-2 text-label-caps font-semibold uppercase transition-colors ${
                    tab === t.id
                      ? 'border-burgundy text-burgundy'
                      : 'border-transparent text-espresso-muted hover:text-espresso'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-2.5 text-ivory-600" size={15} />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Transfer no."
                className="w-44 sm:w-56 rounded border border-ivory-300 bg-ivory-50/50 py-1.5 pl-8 pr-3 text-body-sm text-espresso placeholder-espresso-muted/60 focus:border-burgundy focus:outline-none"
              />
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-body-sm">
              <thead>
                <tr className="border-b border-ivory-300 text-label-caps uppercase text-ivory-600">
                  <th className="py-2.5 pl-3 pr-2 font-medium">Transfer</th>
                  <th className="px-2 py-2.5 font-medium">From</th>
                  <th className="px-2 py-2.5 font-medium">To</th>
                  <th className="px-2 py-2.5 text-center font-medium">Units</th>
                  <th className="py-2.5 pl-2 pr-3 text-center font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-espresso-muted">
                      Loading stock transfers...
                    </td>
                  </tr>
                ) : (
                  transfers.map((t) => {
                    const isSelected = activeTransfer?.id === t.id;
                    const statusColors: Record<string, string> = {
                      'IN TRANSIT': 'bg-blue-50 text-blue-700 border-blue-200',
                      REQUESTED: 'bg-amber-50 text-amber-700 border-amber-200',
                      APPROVED: 'bg-sky-50 text-sky-700 border-sky-200',
                      RECEIVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
                      'SHORT BY 2': 'bg-red-50 text-red-700 border-red-200',
                      REJECTED: 'bg-gray-100 text-gray-700 border-gray-300',
                    };

                    return (
                      <tr
                        key={t.id}
                        onClick={() => handleSelectTransfer(t)}
                        className={`cursor-pointer transition-colors hover:bg-ivory-50 ${
                          isSelected ? '!bg-[#FDF4F4]' : ''
                        }`}
                      >
                        <td className="py-3 pl-3 pr-2 whitespace-nowrap">
                          <p className="font-serif font-medium text-espresso">{t.transferNo}</p>
                          <p className="text-[11px] text-espresso-muted">{t.requestedBy}</p>
                        </td>
                        <td className="px-2 py-3 text-espresso-muted">{t.fromLocation}</td>
                        <td className="px-2 py-3 text-espresso-muted">{t.toLocation}</td>
                        <td className="px-2 py-3 text-center font-serif font-semibold text-espresso">
                          {t.units}
                        </td>
                        <td className="py-3 pl-2 pr-3 text-center whitespace-nowrap">
                          <span
                            className={`inline-block rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              statusColors[t.status] || 'bg-gray-50 text-gray-700 border-gray-200'
                            }`}
                          >
                            ● {t.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Receive Side Panel */}
        <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm space-y-4 h-fit">
          {activeTransfer ? (
            <>
              <div className="flex items-center justify-between border-b border-ivory-200 pb-2">
                <div>
                  <h3 className="font-serif text-title-lg font-normal text-burgundy-deep">
                    Receive {activeTransfer.transferNo}
                  </h3>
                  <p className="text-[11px] text-espresso-muted">
                    From {activeTransfer.fromLocation} → {activeTransfer.toLocation}
                  </p>
                </div>
                <span className="rounded-full bg-blue-50 border border-blue-200 px-2 py-0.5 text-[10px] font-bold text-blue-700 uppercase">
                  ● {activeTransfer.status}
                </span>
              </div>

              {/* Items Table */}
              <div className="space-y-3">
                <div className="flex justify-between text-label-caps uppercase text-ivory-600 border-b border-ivory-200 pb-1">
                  <span>Variant</span>
                  <div className="flex gap-4">
                    <span>Sent</span>
                    <span>Received</span>
                  </div>
                </div>

                {(
                  activeTransfer.metadata?.variants || [
                    {name: 'Cotton Kurta M / Indigo', sent: 30, received: 30},
                    {name: 'Cotton Kurta L / Indigo', sent: 30, received: 28},
                    {name: 'Banarasi Saree Free / Maroon', sent: 20, received: 20},
                  ]
                ).map((v) => {
                  const currentRec = receivedQtyMap[v.name] ?? v.received;
                  const isShort = currentRec < v.sent;

                  return (
                    <div key={v.name} className="flex items-center justify-between py-1 text-body-sm">
                      <span className="font-medium text-espresso max-w-[150px] truncate">
                        {v.name}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="w-8 text-center text-espresso-muted">{v.sent}</span>
                        <input
                          type="number"
                          value={currentRec}
                          onChange={(e) =>
                            setReceivedQtyMap((prev) => ({
                              ...prev,
                              [v.name]: parseInt(e.target.value) || 0,
                            }))
                          }
                          className={`w-12 rounded border py-1 text-center text-xs font-semibold focus:outline-none ${
                            isShort
                              ? 'border-error bg-error/5 text-error'
                              : 'border-ivory-300 bg-ivory-50/50 text-espresso focus:border-burgundy'
                          }`}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Discrepancy Note */}
              <div className="rounded border border-burgundy/20 bg-[#FDF4F4] p-3 text-body-sm text-burgundy-deep">
                2 units short on Cotton Kurta L — will be logged as a discrepancy.
              </div>

              {/* Damaged On Arrival */}
              <div>
                <label className="block text-label-caps uppercase text-ivory-600">
                  Damaged on Arrival
                </label>
                <input
                  type="number"
                  value={damaged}
                  onChange={(e) => setDamaged(Number(e.target.value) || 0)}
                  className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-1.5 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>

              {/* Receiving Note */}
              <div>
                <label className="block text-label-caps uppercase text-ivory-600">
                  Receiving Note
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Add note..."
                  className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 p-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none resize-none"
                />
              </div>

              {/* Action */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleConfirmReceipt}
                  disabled={confirmReceiptMutation.isPending}
                  className="btn-primary w-full bg-burgundy hover:bg-burgundy-deep text-white shadow-sm py-2.5"
                >
                  CONFIRM RECEIPT
                </button>
              </div>
            </>
          ) : (
            <div className="py-12 text-center text-espresso-muted">
              Select a transfer to view details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

