import {useStockMovements} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {ArrowDown, ArrowUp, History, Package, X} from 'lucide-react';
import {useState} from 'react';

interface Props {
  isOpen: boolean;
  product: {id: string; name: string; sku: string} | null;
  panel: string;
  onClose: () => void;
}

export default function ProductHistoryModal({isOpen, product, panel, onClose}: Props) {
  const [page, setPage] = useState(1);
  const [actionFilter, setActionFilter] = useState<'ALL' | 'INWARD' | 'OUTWARD'>('ALL');

  const {data, isPending} = useStockMovements(panel, {
    productId: product?.id,
    action: actionFilter === 'ALL' ? undefined : actionFilter,
    page,
    limit: 15,
  });

  if (!isOpen || !product) return null;

  const movements = data?.items || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-3 sm:p-5 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4 bg-ivory-50/50">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-burgundy/10 text-burgundy">
              <History size={20} />
            </span>
            <div>
              <h3 className="font-serif text-headline-sm text-espresso">
                Stock History: {product.name}
              </h3>
              <p className="text-xs text-outline">
                SKU: {product.sku} • Full record of Inward & Outward stock submissions.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* Inward / Outward Filter Buttons */}
            <div className="flex items-center gap-1 rounded-lg border border-ivory-300 bg-white p-0.5 text-xs shadow-xs">
              <button
                type="button"
                onClick={() => {
                  setActionFilter('ALL');
                  setPage(1);
                }}
                className={`rounded px-2.5 py-1 font-medium transition ${
                  actionFilter === 'ALL'
                    ? 'bg-burgundy text-white'
                    : 'text-outline hover:text-espresso hover:bg-ivory-100'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionFilter('INWARD');
                  setPage(1);
                }}
                className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition ${
                  actionFilter === 'INWARD'
                    ? 'bg-emerald-700 text-white'
                    : 'text-emerald-800 hover:bg-emerald-50'
                }`}
              >
                <ArrowUp size={11} /> Inward
              </button>
              <button
                type="button"
                onClick={() => {
                  setActionFilter('OUTWARD');
                  setPage(1);
                }}
                className={`flex items-center gap-1 rounded px-2.5 py-1 font-medium transition ${
                  actionFilter === 'OUTWARD'
                    ? 'bg-rose-700 text-white'
                    : 'text-rose-800 hover:bg-rose-50'
                }`}
              >
                <ArrowDown size={11} /> Outward
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-outline hover:bg-ivory-200 hover:text-espresso"
              aria-label="Close"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          {isPending ? (
            <div className="py-16 text-center text-body-sm text-outline">Loading movement history…</div>
          ) : movements.length === 0 ? (
            <div className="py-16 text-center">
              <Package size={28} className="mx-auto text-outline mb-2" />
              <p className="font-medium text-espresso text-body-sm">No adjustments found</p>
              <p className="text-xs text-outline">No inward or outward stock has been recorded yet for this product.</p>
            </div>
          ) : (
            <table className="w-full text-left text-body-sm">
              <thead className="sticky top-0 bg-white z-10 border-b border-ivory-200 text-label-caps uppercase text-outline">
                <tr>
                  <th className="py-2.5">Date & Time</th>
                  <th className="py-2.5">Variant (Size / Color)</th>
                  <th className="py-2.5">Action</th>
                  <th className="py-2.5 text-center">Qty</th>
                  <th className="py-2.5 text-center">Stock Flow</th>
                  <th className="py-2.5">Reason & Ref</th>
                  <th className="py-2.5">By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ivory-100">
                {movements.map((m: any) => {
                  const isIncrease = m.type.includes('INCREASE') || m.newPhysical > m.prevPhysical;
                  return (
                    <tr key={m.id} className="hover:bg-ivory-50/50">
                      <td className="py-2.5 whitespace-nowrap text-xs text-espresso">
                        <div>
                          {new Date(m.createdAt).toLocaleDateString(undefined, {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </div>
                        <div className="text-[10px] text-outline">
                          {new Date(m.createdAt).toLocaleTimeString(undefined, {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                      </td>
                      <td className="py-2.5 whitespace-nowrap text-xs">
                        <span className="inline-flex items-center gap-1.5 font-medium text-espresso">
                          {m.variant?.colorHex && (
                            <span
                              className="h-2.5 w-2.5 rounded-full border border-black/20"
                              style={{backgroundColor: m.variant.colorHex}}
                            />
                          )}
                          {m.variant?.color} / Size {m.variant?.size}
                        </span>
                      </td>
                      <td className="py-2.5 whitespace-nowrap">
                        {isIncrease ? (
                          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                            <ArrowUp size={11} /> Inward
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                            <ArrowDown size={11} /> Outward
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-center whitespace-nowrap">
                        <span
                          className={`font-bold text-xs ${
                            isIncrease ? 'text-emerald-700' : 'text-rose-700'
                          }`}
                        >
                          {isIncrease ? `+${m.quantity}` : `-${m.quantity}`}
                        </span>
                      </td>
                      <td className="py-2.5 text-center text-xs whitespace-nowrap text-espresso">
                        <span className="text-outline">{m.prevPhysical}</span>
                        <span className="mx-1 text-outline">→</span>
                        <span className="font-semibold">{m.newPhysical}</span>
                      </td>
                      <td className="py-2.5 text-xs">
                        <p className="font-medium text-espresso">{m.reason}</p>
                        {m.reference && <p className="text-[10px] text-outline">{m.reference}</p>}
                      </td>
                      <td className="py-2.5 text-xs text-outline whitespace-nowrap">
                        {m.performedBy?.fullname || 'System'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-ivory-200 px-6 py-3 bg-ivory-50/50 text-xs">
          <span className="text-outline">
            Showing {movements.length} record(s) for {product.name}
          </span>
          <button type="button" onClick={onClose} className="btn-primary py-1.5 px-4 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

