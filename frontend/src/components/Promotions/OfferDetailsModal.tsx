import {Offer} from '@/types/promotion';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Edit2,
  Image as ImageIcon,
  Package,
  Percent,
  Sparkles,
  Tag,
  X,
} from 'lucide-react';

interface Props {
  offer: Offer | null;
  onClose: () => void;
  onEdit?: (offer: Offer) => void;
}

export default function OfferDetailsModal({offer, onClose, onEdit}: Props) {
  if (!offer) return null;

  const isPercent = offer.type === 'PERCENTAGE';
  const now = new Date();
  const start = new Date(offer.startDate);
  const end = new Date(offer.endDate);

  const getStatusBadge = () => {
    if (!offer.isActive) {
      return (
        <span className="rounded-full bg-ivory-200 px-3 py-1 text-xs font-semibold text-outline">
          Inactive
        </span>
      );
    }
    if (now < start) {
      return (
        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-800 flex items-center gap-1">
          <Clock size={12} /> Scheduled
        </span>
      );
    }
    if (now > end) {
      return (
        <span className="rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-800">
          Expired
        </span>
      );
    }
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 flex items-center gap-1">
        <CheckCircle2 size={12} /> Active
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-3 sm:p-5 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden">
        {/* Banner Area */}
        {offer.bannerUrl ? (
          <div className="relative w-full h-52 bg-espresso overflow-hidden">
            <img
              src={offer.bannerUrl}
              alt={offer.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-espresso/80 via-transparent to-black/30" />
            <button
              type="button"
              onClick={onClose}
              className="absolute top-3 right-3 rounded-full bg-black/50 p-1.5 text-white hover:bg-black/70 transition"
              aria-label="Close"
            >
              <X size={18} />
            </button>
            <div className="absolute bottom-4 left-6 right-6 flex items-end justify-between">
              <div>
                <span className="inline-block rounded bg-burgundy px-2.5 py-0.5 text-xs font-bold uppercase tracking-wider text-white shadow mb-1">
                  {isPercent ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} FLAT OFF`}
                </span>
                <h3 className="font-serif text-headline-sm text-white drop-shadow">
                  {offer.name}
                </h3>
              </div>
              <div>{getStatusBadge()}</div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4 bg-ivory-50/70">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-burgundy/10 text-burgundy">
                <Sparkles size={22} />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-serif text-headline-sm text-espresso">{offer.name}</h3>
                  {getStatusBadge()}
                </div>
                <p className="text-xs font-semibold text-burgundy">
                  {isPercent ? `${offer.discountValue}% DISCOUNT` : `₹${offer.discountValue} FLAT DISCOUNT`}
                </p>
              </div>
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
        )}

        {/* Details Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {offer.description && (
            <div>
              <p className="text-xs uppercase tracking-wider font-semibold text-outline mb-1">
                Description
              </p>
              <p className="text-body-sm text-espresso bg-ivory-50/70 p-3 rounded-lg border border-ivory-200">
                {offer.description}
              </p>
            </div>
          )}

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="rounded-xl border border-ivory-200 bg-ivory-50/50 p-3">
              <p className="text-[11px] text-outline font-medium">Discount Value</p>
              <p className="text-body-md font-bold text-burgundy">
                {isPercent ? `${offer.discountValue}%` : `₹${offer.discountValue}`}
              </p>
            </div>
            <div className="rounded-xl border border-ivory-200 bg-ivory-50/50 p-3">
              <p className="text-[11px] text-outline font-medium">Min Order Value</p>
              <p className="text-body-md font-bold text-espresso">
                {offer.minOrderValue > 0 ? `₹${offer.minOrderValue}` : 'None (₹0)'}
              </p>
            </div>
            <div className="rounded-xl border border-ivory-200 bg-ivory-50/50 p-3">
              <p className="text-[11px] text-outline font-medium">Max Discount Limit</p>
              <p className="text-body-md font-bold text-espresso">
                {offer.maxDiscountLimit ? `₹${offer.maxDiscountLimit}` : 'No Cap'}
              </p>
            </div>
          </div>

          {/* Validity Timeline */}
          <div className="rounded-xl border border-ivory-200 bg-white p-3 space-y-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-outline flex items-center gap-1.5">
              <Calendar size={13} className="text-burgundy" /> Campaign Validity Period
            </p>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2 pt-1">
              <div>
                <span className="text-outline">Starts:</span>{' '}
                <strong className="text-espresso">{start.toLocaleString()}</strong>
              </div>
              <span className="hidden sm:inline text-outline">→</span>
              <div>
                <span className="text-outline">Ends:</span>{' '}
                <strong className="text-espresso">{end.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Applicable On Targets */}
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-wider font-semibold text-outline flex items-center gap-1.5">
              <Tag size={13} className="text-burgundy" /> Applicable Target
            </p>
            <div className="p-3 rounded-xl border border-ivory-200 bg-ivory-50/40">
              <span className="font-semibold text-xs text-espresso block mb-2">
                {offer.applicableOn === 'ALL_PRODUCTS'
                  ? 'Applies to all products across the store'
                  : offer.applicableOn === 'SELECTED_CATEGORIES'
                    ? `Applies to ${offer.categories?.length || 0} selected categories:`
                    : offer.applicableOn === 'SELECTED_SUBCATEGORIES'
                      ? `Applies to ${offer.subcategories?.length || 0} selected subcategories:`
                      : `Applies to ${offer.products?.length || 0} selected products:`}
              </span>

              {offer.applicableOn === 'SELECTED_CATEGORIES' && (
                <div className="flex flex-wrap gap-1.5">
                  {offer.categories?.map((c) => (
                    <span
                      key={c.id}
                      className="rounded-full bg-white border border-ivory-300 px-2.5 py-0.5 text-xs text-espresso"
                    >
                      {c.name}
                    </span>
                  ))}
                </div>
              )}

              {offer.applicableOn === 'SELECTED_SUBCATEGORIES' && (
                <div className="flex flex-wrap gap-1.5">
                  {offer.subcategories?.map((s) => (
                    <span
                      key={s.id}
                      className="rounded-full bg-white border border-ivory-300 px-2.5 py-0.5 text-xs text-espresso"
                    >
                      {s.name}
                    </span>
                  ))}
                </div>
              )}

              {offer.applicableOn === 'SELECTED_PRODUCTS' && (
                <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto">
                  {offer.products?.map((p) => (
                    <span
                      key={p.id}
                      className="rounded-lg bg-white border border-ivory-300 px-2.5 py-1 text-xs text-espresso flex items-center gap-1"
                    >
                      <Package size={11} className="text-outline" />
                      <span>{p.name}</span>
                      <span className="font-mono text-[10px] text-outline">({p.sku})</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-ivory-200 px-6 py-3.5 bg-ivory-50/50">
          <div className="text-[11px] text-outline">
            Created: {new Date(offer.createdAt).toLocaleDateString()}
          </div>
          <div className="flex items-center gap-2">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(offer);
                }}
                className="flex items-center gap-1.5 rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs font-semibold text-espresso hover:bg-ivory-100"
              >
                <Edit2 size={13} /> Edit Offer
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-espresso px-4 py-1.5 text-xs font-semibold text-white hover:bg-espresso/90"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

