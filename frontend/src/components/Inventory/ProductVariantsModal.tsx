import {ArrowDown, ArrowUp, History, Layers, Package, Sliders, X} from 'lucide-react';

interface Props {
  isOpen: boolean;
  product: any | null;
  canAdjust?: boolean;
  onClose: () => void;
  onInwardClick: (product: any) => void;
  onOutwardClick: (product: any) => void;
  onHistoryClick: (product: any) => void;
  onEditThresholdClick: (variant: any, productName: string) => void;
}

export default function ProductVariantsModal({
  isOpen,
  product,
  canAdjust = true,
  onClose,
  onInwardClick,
  onOutwardClick,
  onHistoryClick,
  onEditThresholdClick,
}: Props) {
  if (!isOpen || !product) return null;

  const variants = product.variants || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-3 sm:p-5 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[85vh] rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4 bg-ivory-50/50">
          <div className="flex items-center gap-3">
            {product.mainImage ? (
              <img
                src={product.mainImage}
                alt=""
                className="h-10 w-10 rounded object-cover border border-ivory-300 shrink-0"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded border border-ivory-300 bg-ivory-100 text-xs text-outline shrink-0">
                <Package size={18} />
              </div>
            )}
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-serif text-headline-sm text-espresso">{product.name}</h3>
                <span className="rounded-full bg-ivory-200 px-2 py-0.5 text-[10px] font-semibold text-espresso">
                  {variants.length} variants
                </span>
              </div>
              <p className="text-xs text-outline">
                SKU: {product.sku} • Category: {product.category} • Total Stock: {product.physicalStock} units
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {canAdjust && (
              <>
                <button
                  type="button"
                  onClick={() => onInwardClick(product)}
                  className="flex items-center gap-1 rounded border border-emerald-600 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
                >
                  <ArrowUp size={12} /> Inward
                </button>
                <button
                  type="button"
                  onClick={() => onOutwardClick(product)}
                  className="flex items-center gap-1 rounded border border-rose-600 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition"
                >
                  <ArrowDown size={12} /> Outward
                </button>
              </>
            )}
            <button
              type="button"
              onClick={() => onHistoryClick(product)}
              className="flex items-center gap-1 rounded border border-ivory-300 bg-white px-2.5 py-1 text-xs font-medium text-espresso hover:bg-ivory-100 transition"
            >
              <History size={12} /> History
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-outline hover:bg-ivory-200 hover:text-espresso ml-2"
              aria-label="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="flex-1 overflow-y-auto px-6 py-3">
          <table className="w-full text-left text-body-sm">
            <thead className="sticky top-0 bg-white z-10 border-b border-ivory-200 text-label-caps uppercase text-outline">
              <tr>
                <th className="py-2.5">Variant SKU</th>
                <th className="py-2.5">Size & Color</th>
                <th className="py-2.5 text-center">Physical</th>
                <th className="py-2.5 text-center">Reserved</th>
                <th className="py-2.5 text-center">Available</th>
                <th className="py-2.5 text-center">Threshold</th>
                <th className="py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {variants.map((v: any) => (
                <tr key={v.id} className="hover:bg-ivory-50/50">
                  <td className="py-2.5 font-mono text-xs text-outline">{v.sku}</td>
                  <td className="py-2.5">
                    <span className="inline-flex items-center gap-1.5 font-medium text-espresso text-xs">
                      {v.colorHex && (
                        <span
                          className="h-2.5 w-2.5 rounded-full border border-black/20 shrink-0"
                          style={{backgroundColor: v.colorHex}}
                        />
                      )}
                      {v.color} / Size {v.size}
                    </span>
                  </td>
                  <td className="py-2.5 text-center font-semibold text-espresso">{v.physicalStock}</td>
                  <td className="py-2.5 text-center text-outline">{v.reservedStock}</td>
                  <td className="py-2.5 text-center font-bold">
                    <span
                      className={
                        v.availableStock <= 0
                          ? 'text-rose-700'
                          : v.isLowStock
                            ? 'text-amber-700'
                            : 'text-emerald-700'
                      }
                    >
                      {v.availableStock}
                    </span>
                  </td>
                  <td className="py-2.5 text-center text-xs text-outline">
                    <span className="inline-flex items-center gap-1">
                      ≤ {v.threshold}
                      {canAdjust && (
                        <button
                          type="button"
                          onClick={() => onEditThresholdClick(v, product.name)}
                          className="text-outline hover:text-burgundy"
                          title="Edit Threshold"
                        >
                          <Sliders size={11} />
                        </button>
                      )}
                    </span>
                  </td>
                  <td className="py-2.5">
                    {v.isOutOfStock ? (
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800">
                        Out of Stock
                      </span>
                    ) : v.isLowStock ? (
                      <span className="rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800">
                        Low Stock
                      </span>
                    ) : (
                      <span className="rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800">
                        In Stock
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-ivory-200 px-6 py-3 bg-ivory-50/50 text-xs">
          <span className="text-outline">
            Total {variants.length} variant(s) configured for this product.
          </span>
          <button type="button" onClick={onClose} className="btn-primary py-1.5 px-4 text-xs">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

