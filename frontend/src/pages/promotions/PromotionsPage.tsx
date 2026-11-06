import {Column, GenericTable} from '@/components/Forms';
import {PageHeader} from '@/components/ui';
import CouponFormModal from '@/components/Promotions/CouponFormModal';
import CouponValidateModal from '@/components/Promotions/CouponValidateModal';
import OfferDetailsModal from '@/components/Promotions/OfferDetailsModal';
import OfferFormModal from '@/components/Promotions/OfferFormModal';
import {
  useCoupons,
  useDeleteCoupon,
  useDeleteOffer,
  useOffers,
  usePromotionsDashboard,
  useToggleCouponStatus,
  useToggleOfferStatus,
} from '@/lib/react-query/queriesAndMutations/promotion';
import {Coupon, Offer} from '@/types/promotion';
import {
  Calendar,
  CheckCircle2,
  Clock,
  Copy,
  DollarSign,
  Eye,
  Gift,
  HelpCircle,
  History,
  Image as ImageIcon,
  Layers,
  Package,
  Pencil,
  Percent,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Tag,
  TicketPercent,
  Trash2,
} from 'lucide-react';
import React, {useEffect, useState} from 'react';
import toast from 'react-hot-toast';

interface Props {
  panel: string;
}

type MainTab = 'offers' | 'coupons' | 'dashboard';
type StatusFilter = 'all' | 'active' | 'scheduled' | 'expired' | 'inactive';

export default function PromotionsPage({panel}: Props) {
  const [activeTab, setActiveTab] = useState<MainTab>('offers');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  // Modals state
  const [offerModal, setOfferModal] = useState<{isOpen: boolean; offer?: Offer | null}>({
    isOpen: false,
    offer: null,
  });
  const [couponModal, setCouponModal] = useState<{isOpen: boolean; coupon?: Coupon | null}>({
    isOpen: false,
    coupon: null,
  });
  const [viewOffer, setViewOffer] = useState<Offer | null>(null);
  const [testCouponCode, setTestCouponCode] = useState<string | null>(null);

  // Queries
  const {data: dashboardData, refetch: refetchDashboard} = usePromotionsDashboard(panel);
  const summary = dashboardData?.summary ?? {
    totalOffers: 0,
    activeOffers: 0,
    scheduledOffers: 0,
    expiredOffers: 0,
    inactiveOffers: 0,
    totalCoupons: 0,
    activeCoupons: 0,
    scheduledCoupons: 0,
    expiredCoupons: 0,
    totalRedemptions: 0,
    totalDiscountGiven: 0,
  };

  const {
    data: offersData,
    isPending: offersPending,
    isFetching: offersFetching,
    refetch: refetchOffers,
  } = useOffers(
    panel,
    {
      page,
      limit: 12,
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }
  );

  const {
    data: couponsData,
    isPending: couponsPending,
    isFetching: couponsFetching,
    refetch: refetchCoupons,
  } = useCoupons(
    panel,
    {
      page,
      limit: 12,
      search: search || undefined,
      status: statusFilter === 'all' ? undefined : statusFilter,
    }
  );

  // Mutations
  const toggleOfferStatusMutation = useToggleOfferStatus(panel);
  const deleteOfferMutation = useDeleteOffer(panel);
  const toggleCouponStatusMutation = useToggleCouponStatus(panel);
  const deleteCouponMutation = useDeleteCoupon(panel);

  const isFetching =
    activeTab === 'offers'
      ? offersFetching
      : activeTab === 'coupons'
        ? couponsFetching
        : false;

  const handleRefresh = () => {
    refetchDashboard();
    refetchOffers();
    refetchCoupons();
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success(`Copied "${code}" to clipboard!`);
  };

  const handleDeleteOffer = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete offer "${name}"?`)) return;
    await deleteOfferMutation.mutateAsync(id);
  };

  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!window.confirm(`Are you sure you want to delete coupon "${code}"?`)) return;
    await deleteCouponMutation.mutateAsync(id);
  };

  // Status Badge Component
  const renderStatusBadge = (st: string) => {
    switch (st) {
      case 'ACTIVE':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800 whitespace-nowrap">
            <CheckCircle2 size={11} /> Active
          </span>
        );
      case 'SCHEDULED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-800 whitespace-nowrap">
            <Clock size={11} /> Scheduled
          </span>
        );
      case 'EXPIRED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-rose-100 px-2 py-0.5 text-xs font-semibold text-rose-800 whitespace-nowrap">
            Expired
          </span>
        );
      case 'EXHAUSTED':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-800 whitespace-nowrap">
            Exhausted
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-ivory-200 px-2 py-0.5 text-xs font-semibold text-outline whitespace-nowrap">
            Inactive
          </span>
        );
    }
  };

  // 1. Columns for Offers Table
  const offerColumns: Column<Offer>[] = [
    {
      header: 'Creative / Banner',
      render: (o) => (
        <button
          type="button"
          onClick={() => setViewOffer(o)}
          className="relative h-11 w-20 rounded-md overflow-hidden border border-ivory-300 bg-ivory-100 shrink-0 group hover:border-burgundy transition"
          title="Click to view banner"
        >
          {o.bannerUrl ? (
            <img src={o.bannerUrl} alt="" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-outline">
              <ImageIcon size={16} />
            </div>
          )}
        </button>
      ),
    },
    {
      header: 'Offer Details',
      render: (o) => (
        <div className="min-w-[190px]">
          <button
            type="button"
            onClick={() => setViewOffer(o)}
            className="font-semibold text-espresso text-body-sm hover:text-burgundy transition text-left truncate block max-w-xs"
          >
            {o.name}
          </button>
          {o.description && (
            <p className="text-[11px] text-outline truncate max-w-xs">{o.description}</p>
          )}
        </div>
      ),
    },
    {
      header: 'Discount',
      render: (o) => (
        <span className="inline-flex items-center gap-1 rounded bg-burgundy/10 px-2.5 py-1 text-xs font-bold text-burgundy whitespace-nowrap">
          {o.type === 'PERCENTAGE' ? `${o.discountValue}% OFF` : `₹${o.discountValue} FLAT OFF`}
        </span>
      ),
    },
    {
      header: 'Applicable On',
      render: (o) => {
        let label = 'All Products';
        if (o.applicableOn === 'SELECTED_CATEGORIES') {
          label = `${o.categories?.length || 0} Categories`;
        } else if (o.applicableOn === 'SELECTED_SUBCATEGORIES') {
          label = `${o.subcategories?.length || 0} Subcategories`;
        } else if (o.applicableOn === 'SELECTED_PRODUCTS') {
          label = `${o.products?.length || 0} Products`;
        }
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-ivory-100 border border-ivory-300 px-2.5 py-0.5 text-xs font-medium text-espresso whitespace-nowrap">
            <Tag size={11} className="text-outline" /> {label}
          </span>
        );
      },
    },
    {
      header: 'Min Order / Cap',
      render: (o) => (
        <div className="text-xs whitespace-nowrap">
          <p className="text-espresso">
            Min: <span className="font-semibold">{o.minOrderValue > 0 ? `₹${o.minOrderValue}` : '₹0'}</span>
          </p>
          <p className="text-[11px] text-outline">
            Cap: {o.maxDiscountLimit ? `₹${o.maxDiscountLimit}` : 'None'}
          </p>
        </div>
      ),
    },
    {
      header: 'Validity Period',
      render: (o) => (
        <div className="text-xs whitespace-nowrap text-outline">
          <p>
            From:{' '}
            <span className="text-espresso font-medium">
              {new Date(o.startDate).toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </p>
          <p>
            To:{' '}
            <span className="text-espresso font-medium">
              {new Date(o.endDate).toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (o) => renderStatusBadge(o.status),
    },
    {
      header: 'Actions',
      render: (o) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {/* Active switch */}
          <button
            type="button"
            onClick={() => toggleOfferStatusMutation.mutate({id: o.id, isActive: !o.isActive})}
            disabled={toggleOfferStatusMutation.isPending}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              o.isActive ? 'bg-emerald-600' : 'bg-ivory-300'
            }`}
            title={o.isActive ? 'Deactivate offer' : 'Activate offer'}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                o.isActive ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>

          {/* View Details */}
          <button
            type="button"
            onClick={() => setViewOffer(o)}
            className="p-1.5 rounded border border-ivory-300 bg-white hover:bg-ivory-100 text-outline hover:text-espresso transition"
            title="View offer details"
          >
            <Eye size={13} />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => setOfferModal({isOpen: true, offer: o})}
            className="p-1.5 rounded border border-ivory-300 bg-white hover:bg-ivory-100 text-outline hover:text-espresso transition"
            title="Edit offer"
          >
            <Pencil size={13} />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => handleDeleteOffer(o.id, o.name)}
            disabled={deleteOfferMutation.isPending}
            className="p-1.5 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
            title="Delete offer"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  // 2. Columns for Coupons Table
  const couponColumns: Column<Coupon>[] = [
    {
      header: 'Coupon Code',
      render: (c) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          <span className="font-mono font-bold text-xs bg-ivory-200 border border-ivory-300 px-2.5 py-1 rounded-md text-burgundy tracking-wider">
            {c.code}
          </span>
          <button
            type="button"
            onClick={() => copyCode(c.code)}
            className="text-outline hover:text-burgundy p-1"
            title="Copy coupon code"
          >
            <Copy size={12} />
          </button>
        </div>
      ),
    },
    {
      header: 'Name & Promo',
      render: (c) => (
        <div className="min-w-[170px]">
          <p className="font-semibold text-espresso text-body-sm truncate">{c.name || c.code}</p>
          {c.description && <p className="text-[11px] text-outline truncate">{c.description}</p>}
        </div>
      ),
    },
    {
      header: 'Discount',
      render: (c) => (
        <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-xs font-bold text-emerald-800 whitespace-nowrap">
          {c.type === 'PERCENTAGE' ? `${c.discountValue}% OFF` : `₹${c.discountValue} FLAT OFF`}
        </span>
      ),
    },
    {
      header: 'Min Purchase / Cap',
      render: (c) => (
        <div className="text-xs whitespace-nowrap">
          <p className="text-espresso">
            Min: <span className="font-semibold">{c.minPurchaseAmount > 0 ? `₹${c.minPurchaseAmount}` : '₹0'}</span>
          </p>
          <p className="text-[11px] text-outline">
            Cap: {c.maxDiscountLimit ? `₹${c.maxDiscountLimit}` : 'None'}
          </p>
        </div>
      ),
    },
    {
      header: 'Usage Progress',
      render: (c) => {
        const hasLimit = c.usageLimit != null && c.usageLimit > 0;
        const percent = hasLimit ? Math.min(100, Math.round((c.usedCount / c.usageLimit!) * 100)) : 0;
        return (
          <div className="min-w-[120px] text-xs">
            <div className="flex justify-between text-[11px] font-medium text-espresso mb-1">
              <span>{c.usedCount} used</span>
              <span className="text-outline">{hasLimit ? `/ ${c.usageLimit}` : '(Unlimited)'}</span>
            </div>
            {hasLimit && (
              <div className="h-1.5 w-full bg-ivory-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full ${
                    percent >= 100 ? 'bg-rose-600' : percent >= 75 ? 'bg-amber-600' : 'bg-emerald-600'
                  }`}
                  style={{width: `${percent}%`}}
                />
              </div>
            )}
            <p className="text-[10px] text-outline mt-0.5">{c.perCustomerLimit} per customer</p>
          </div>
        );
      },
    },
    {
      header: 'Validity Period',
      render: (c) => (
        <div className="text-xs whitespace-nowrap text-outline">
          <p>
            From:{' '}
            <span className="text-espresso font-medium">
              {new Date(c.startDate).toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
              })}
            </span>
          </p>
          <p>
            To:{' '}
            <span className="text-espresso font-medium">
              {new Date(c.endDate).toLocaleDateString(undefined, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </span>
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      render: (c) => renderStatusBadge(c.status),
    },
    {
      header: 'Actions',
      render: (c) => (
        <div className="flex items-center gap-1.5 whitespace-nowrap">
          {/* Test Coupon button */}
          <button
            type="button"
            onClick={() => setTestCouponCode(c.code)}
            className="flex items-center gap-1 rounded border border-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800 transition"
            title="Test discount on cart"
          >
            <Sparkles size={11} /> Test
          </button>

          {/* Active switch */}
          <button
            type="button"
            onClick={() => toggleCouponStatusMutation.mutate({id: c.id, isActive: !c.isActive})}
            disabled={toggleCouponStatusMutation.isPending}
            className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${
              c.isActive ? 'bg-emerald-600' : 'bg-ivory-300'
            }`}
            title={c.isActive ? 'Disable coupon' : 'Enable coupon'}
          >
            <span
              className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${
                c.isActive ? 'translate-x-4.5' : 'translate-x-0.5'
              }`}
            />
          </button>

          {/* Edit */}
          <button
            type="button"
            onClick={() => setCouponModal({isOpen: true, coupon: c})}
            className="p-1.5 rounded border border-ivory-300 bg-white hover:bg-ivory-100 text-outline hover:text-espresso transition"
            title="Edit coupon"
          >
            <Pencil size={13} />
          </button>

          {/* Delete */}
          <button
            type="button"
            onClick={() => handleDeleteCoupon(c.id, c.code)}
            disabled={deleteCouponMutation.isPending}
            className="p-1.5 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 transition"
            title="Delete coupon"
          >
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {/* Top Page Header */}
      <PageHeader
        compact
        breadcrumbs={[{label: 'Operations'}, {label: 'Offers & Promotions'}]}
        title="Offers & Promotions Management"
        actions={
          <div className="flex items-center gap-2">
            {activeTab === 'offers' ? (
              <button
                type="button"
                onClick={() => setOfferModal({isOpen: true, offer: null})}
                className="flex items-center gap-1.5 rounded-lg bg-burgundy px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-burgundy/90 transition"
              >
                <Plus size={14} /> Create Offer
              </button>
            ) : activeTab === 'coupons' ? (
              <button
                type="button"
                onClick={() => setCouponModal({isOpen: true, coupon: null})}
                className="flex items-center gap-1.5 rounded-lg bg-burgundy px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-burgundy/90 transition"
              >
                <Plus size={14} /> Create Coupon
              </button>
            ) : null}

            <button
              type="button"
              onClick={() => setTestCouponCode('')}
              className="flex items-center gap-1.5 rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs font-semibold text-espresso hover:bg-ivory-100 transition"
            >
              <TicketPercent size={14} className="text-burgundy" /> Test Discount
            </button>
          </div>
        }
      />

      {/* Metric Cards Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-xl border border-ivory-300 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-outline mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Active Offers</span>
            <Tag size={15} className="text-burgundy" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-espresso">
              {summary.activeOffers}
            </span>
            <span className="text-xs text-outline">of {summary.totalOffers} total</span>
          </div>
          <p className="mt-1 text-[11px] text-outline">
            {summary.scheduledOffers} scheduled • {summary.expiredOffers} expired
          </p>
        </div>

        <div className="rounded-xl border border-ivory-300 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-outline mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Active Coupons</span>
            <TicketPercent size={15} className="text-emerald-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-espresso">
              {summary.activeCoupons}
            </span>
            <span className="text-xs text-outline">of {summary.totalCoupons} total</span>
          </div>
          <p className="mt-1 text-[11px] text-outline">
            {summary.scheduledCoupons} scheduled • {summary.expiredCoupons} expired
          </p>
        </div>

        <div className="rounded-xl border border-ivory-300 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-outline mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Total Redemptions</span>
            <Sparkles size={15} className="text-amber-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-espresso">
              {summary.totalRedemptions}
            </span>
            <span className="text-xs text-outline">orders with coupon</span>
          </div>
          <p className="mt-1 text-[11px] text-emerald-700 font-medium">Customer checkouts</p>
        </div>

        <div className="rounded-xl border border-ivory-300 bg-white p-3.5 shadow-xs">
          <div className="flex items-center justify-between text-outline mb-1">
            <span className="text-xs font-medium uppercase tracking-wider">Customer Savings</span>
            <DollarSign size={15} className="text-emerald-700" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="font-serif text-2xl font-bold text-emerald-800">
              ₹{summary.totalDiscountGiven.toLocaleString()}
            </span>
          </div>
          <p className="mt-1 text-[11px] text-outline">Total promotion discounts granted</p>
        </div>
      </div>

      {/* Main Tab Switch & Toolbar */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-xl border border-ivory-300 bg-white p-3 shadow-sm">
          {/* Tabs: Offers / Coupons / Audit Dashboard */}
          <div className="flex items-center gap-1.5 self-start sm:self-center">
            <button
              type="button"
              onClick={() => {
                setActiveTab('offers');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition border ${
                activeTab === 'offers'
                  ? 'border-burgundy bg-burgundy text-white'
                  : 'border-ivory-300 bg-ivory-100 text-outline hover:text-espresso hover:border-outline'
              }`}
            >
              <Tag size={13} />
              <span>Offers & Campaigns ({summary.totalOffers})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('coupons');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition border ${
                activeTab === 'coupons'
                  ? 'border-burgundy bg-burgundy text-white'
                  : 'border-ivory-300 bg-ivory-100 text-outline hover:text-espresso hover:border-outline'
              }`}
            >
              <TicketPercent size={13} />
              <span>Coupons ({summary.totalCoupons})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('dashboard');
                setPage(1);
              }}
              className={`flex items-center gap-1.5 rounded-full px-4 py-1.5 text-xs font-semibold transition border ${
                activeTab === 'dashboard'
                  ? 'border-burgundy bg-burgundy text-white'
                  : 'border-ivory-300 bg-ivory-100 text-outline hover:text-espresso hover:border-outline'
              }`}
            >
              <History size={13} />
              <span>Recent Activity</span>
            </button>
          </div>

          {/* Right Toolbar: Search & Status Filters (for Offers & Coupons) */}
          {activeTab !== 'dashboard' && (
            <div className="flex flex-wrap items-center gap-2 self-start sm:self-center w-full sm:w-auto">
              {/* Search */}
              <div className="flex items-center gap-2 rounded-lg border border-ivory-300 bg-ivory-50 px-3 py-1 w-full sm:w-60">
                <Search size={14} className="text-outline shrink-0" />
                <input
                  type="text"
                  placeholder={
                    activeTab === 'offers' ? 'Search offers by name...' : 'Search coupon code...'
                  }
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="w-full bg-transparent text-xs text-espresso focus:outline-none"
                />
              </div>

              {/* Status Filter Pills */}
              <div className="flex items-center gap-1">
                {(
                  [
                    {id: 'all', label: 'All'},
                    {id: 'active', label: 'Active'},
                    {id: 'scheduled', label: 'Scheduled'},
                    {id: 'expired', label: 'Expired'},
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(tab.id);
                      setPage(1);
                    }}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition border ${
                      statusFilter === tab.id
                        ? 'border-espresso bg-espresso text-white'
                        : 'border-ivory-300 bg-ivory-100 text-outline hover:border-outline hover:text-espresso'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Refresh Button */}
              <button
                type="button"
                onClick={handleRefresh}
                title="Refresh promotions"
                className="p-1.5 rounded-lg border border-ivory-300 bg-ivory-50 text-outline hover:text-espresso hover:bg-ivory-100 transition"
              >
                <RefreshCw size={13} className={isFetching ? 'animate-spin' : ''} />
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Offers Table */}
        {activeTab === 'offers' && (
          <GenericTable
            caption="Offers & Campaign Creatives"
            columns={offerColumns}
            data={offersData?.items || []}
            loading={offersPending}
            fetching={offersFetching}
            onRetry={refetchOffers}
            emptyIcon={<Tag size={24} />}
            emptyTitle="No promotional offers found"
            pagination={offersData?.pagination}
            onPageChange={setPage}
          />
        )}

        {/* Tab 2: Coupons Table */}
        {activeTab === 'coupons' && (
          <GenericTable
            caption="Checkout Coupon Codes"
            columns={couponColumns}
            data={couponsData?.items || []}
            loading={couponsPending}
            fetching={couponsFetching}
            onRetry={refetchCoupons}
            emptyIcon={<TicketPercent size={24} />}
            emptyTitle="No coupon codes found"
            pagination={couponsData?.pagination}
            onPageChange={setPage}
          />
        )}

        {/* Tab 3: Recent Activity Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Recent Offers Spotlight */}
            <div className="rounded-xl border border-ivory-300 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-ivory-200 pb-2.5">
                <h4 className="font-serif text-body-md font-semibold text-espresso flex items-center gap-1.5">
                  <Sparkles size={16} className="text-burgundy" /> Recent Promotional Offers
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('offers')}
                  className="text-xs font-semibold text-burgundy hover:underline"
                >
                  View All ({summary.totalOffers})
                </button>
              </div>

              <div className="space-y-2.5">
                {dashboardData?.recentOffers?.length ? (
                  dashboardData.recentOffers.map((o) => (
                    <div
                      key={o.id}
                      onClick={() => setViewOffer(o)}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-ivory-200 bg-ivory-50/50 hover:bg-ivory-100 cursor-pointer transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-16 rounded bg-ivory-200 overflow-hidden border border-ivory-300 shrink-0">
                          {o.bannerUrl ? (
                            <img src={o.bannerUrl} alt="" className="h-full w-full object-cover" />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-outline">
                              <ImageIcon size={14} />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-semibold text-xs text-espresso">{o.name}</p>
                          <p className="text-[11px] text-outline">
                            {o.type === 'PERCENTAGE' ? `${o.discountValue}% OFF` : `₹${o.discountValue} FLAT`}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">{renderStatusBadge(o.status)}</div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-outline py-8 text-center">No promotional offers created yet.</p>
                )}
              </div>
            </div>

            {/* Recent Coupon Redemptions */}
            <div className="rounded-xl border border-ivory-300 bg-white p-4 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-ivory-200 pb-2.5">
                <h4 className="font-serif text-body-md font-semibold text-espresso flex items-center gap-1.5">
                  <History size={16} className="text-emerald-700" /> Recent Coupon Usages
                </h4>
                <button
                  type="button"
                  onClick={() => setActiveTab('coupons')}
                  className="text-xs font-semibold text-burgundy hover:underline"
                >
                  View Coupons ({summary.totalCoupons})
                </button>
              </div>

              <div className="space-y-2.5">
                {dashboardData?.recentUsages?.length ? (
                  dashboardData.recentUsages.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between p-2.5 rounded-lg border border-ivory-200 bg-ivory-50/50"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-burgundy bg-ivory-200 px-1.5 py-0.5 rounded">
                            {u.coupon?.code || 'COUPON'}
                          </span>
                          <span className="text-xs text-espresso font-medium">
                            {u.user?.fullname || 'Customer'}
                          </span>
                        </div>
                        <p className="text-[10px] text-outline mt-0.5">
                          {new Date(u.usedAt).toLocaleString()}
                        </p>
                      </div>
                      <span className="font-semibold text-xs text-emerald-700">
                        - ₹{u.discountAmount}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-outline py-8 text-center">No coupon redemptions recorded yet.</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Offer Form Modal */}
      <OfferFormModal
        isOpen={offerModal.isOpen}
        offer={offerModal.offer}
        panel={panel}
        onClose={() => setOfferModal({isOpen: false, offer: null})}
        onSuccess={handleRefresh}
      />

      {/* Coupon Form Modal */}
      <CouponFormModal
        isOpen={couponModal.isOpen}
        coupon={couponModal.coupon}
        panel={panel}
        onClose={() => setCouponModal({isOpen: false, coupon: null})}
        onSuccess={handleRefresh}
      />

      {/* View Offer Details Modal */}
      <OfferDetailsModal
        offer={viewOffer}
        onClose={() => setViewOffer(null)}
        onEdit={(o) => {
          setViewOffer(null);
          setOfferModal({isOpen: true, offer: o});
        }}
      />

      {/* Test Coupon Live Discount Modal */}
      <CouponValidateModal
        isOpen={testCouponCode !== null}
        panel={panel}
        initialCode={testCouponCode || ''}
        onClose={() => setTestCouponCode(null)}
      />
    </div>
  );
}
