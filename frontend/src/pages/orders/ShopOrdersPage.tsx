import {useEffect, useState} from 'react';
import {Column, GenericTable} from '@/components/Forms';
import {PageHeader} from '@/components/ui';
import {
  useOrderDashboard,
  useOrderReturns,
  useOrders,
} from '@/lib/react-query/queriesAndMutations/order';
import {
  Order,
  OrderListParams,
  OrderStatus,
  PaymentStatus,
  ReturnRequestItem,
  ReturnStatus,
} from '@/types/order';
import OrderStatusBadge from '@/components/Orders/OrderStatusBadge';
import PaymentStatusBadge from '@/components/Orders/PaymentStatusBadge';
import OrderDetailsModal from '@/components/Orders/OrderDetailsModal';
import OrderStatusUpdateModal from '@/components/Orders/OrderStatusUpdateModal';
import ShippingModal from '@/components/Orders/ShippingModal';
import CancellationReviewModal from '@/components/Orders/CancellationReviewModal';
import ReturnReviewModal from '@/components/Orders/ReturnReviewModal';
import {generateOrderInvoice} from '@/utils/invoiceGenerator';
import {
  AlertTriangle,
  ArrowUpDown,
  Boxes,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  IndianRupee,
  Package,
  PackageCheck,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Truck,
  XCircle,
} from 'lucide-react';

interface Props {
  panel: string;
}

const TABS: {label: string; value: string; countKey?: string}[] = [
  {label: 'All Orders', value: ''},
  {label: 'Pending', value: 'PENDING', countKey: 'pendingOrders'},
  {label: 'Confirmed', value: 'CONFIRMED', countKey: 'confirmedOrders'},
  {label: 'Processing', value: 'PROCESSING', countKey: 'processingOrders'},
  {label: 'Packed', value: 'PACKED', countKey: 'packedOrders'},
  {label: 'Shipped', value: 'SHIPPED', countKey: 'shippedOrders'},
  {label: 'Delivered', value: 'DELIVERED', countKey: 'deliveredOrders'},
  {label: 'Cancelled', value: 'CANCELLED', countKey: 'cancelledOrders'},
  {label: 'Returns & Refunds', value: 'RETURNS', countKey: 'returnRequests'},
];

export default function ShopOrdersPage({panel}: Props) {
  const [activeTab, setActiveTab] = useState<string>('');
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [paymentStatus, setPaymentStatus] = useState<string>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [cancellationOnly, setCancellationOnly] = useState(false);

  // Modals state
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isStatusUpdateOpen, setIsStatusUpdateOpen] = useState(false);
  const [isShippingOpen, setIsShippingOpen] = useState(false);
  const [isCancellationOpen, setIsCancellationOpen] = useState(false);

  const [selectedReturn, setSelectedReturn] = useState<ReturnRequestItem | null>(null);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);

  // Queries
  const {data: dashboardData, refetch: refetchDashboard} = useOrderDashboard(panel);

  const orderParams: OrderListParams = {
    page,
    limit: 15,
    status: activeTab && activeTab !== 'RETURNS' ? activeTab : undefined,
    paymentStatus: paymentStatus || undefined,
    search: search.trim() || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    cancellationPending: cancellationOnly || undefined,
  };

  const {
    data: ordersData,
    isPending: isOrdersLoading,
    isFetching: isOrdersFetching,
    refetch: refetchOrders,
  } = useOrders(panel, orderParams);

  const {
    data: returnsData,
    isPending: isReturnsLoading,
    isFetching: isReturnsFetching,
    refetch: refetchReturns,
  } = useOrderReturns(panel, {page, limit: 15});

  const handleRefreshAll = () => {
    refetchDashboard();
    refetchOrders();
    refetchReturns();
  };

  // Orders Columns
  const orderColumns: Column<Order>[] = [
    {
      header: 'Order # & Date',
      key: 'orderNumber',
      render: (o) => (
        <div>
          <button
            type="button"
            onClick={() => {
              setSelectedOrder(o);
              setIsDetailsOpen(true);
            }}
            className="font-mono font-bold text-espresso hover:text-burgundy hover:underline text-body-sm text-left block"
          >
            {o.orderNumber}
          </button>
          <span className="text-technical-data text-outline flex items-center gap-1 mt-0.5">
            <Calendar size={11} />
            {new Date(o.createdAt).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </span>
        </div>
      ),
    },
    {
      header: 'Customer',
      render: (o) => (
        <div>
          <p className="font-medium text-espresso text-body-sm">
            {o.customer?.fullname || o.shippingAddress?.recipient || 'Customer'}
          </p>
          <p className="text-technical-data text-outline font-mono">
            +91 {o.customer?.phoneNumber || o.shippingAddress?.phone}
          </p>
        </div>
      ),
    },
    {
      header: 'Items',
      render: (o) => (
        <div className="flex items-center gap-2">
          <div className="flex -space-x-2 overflow-hidden py-1">
            {o.items?.slice(0, 3).map((item, idx) => {
              const img = item.image || item.product?.images?.[0]?.url;
              return (
                <div
                  key={idx}
                  className="inline-block h-8 w-8 rounded-full ring-2 ring-white bg-ivory-200 overflow-hidden shrink-0 border border-ivory-300"
                  title={[item.productName || item.product?.name, item.color || item.variant?.color, item.size || item.variant?.size].filter(Boolean).join(' · ')}
                >
                  {img ? (
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-[10px] text-outline font-semibold">
                      {idx + 1}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <span className="min-w-0 text-xs text-outline font-medium">
            {o.items?.length || 0} item(s)
            {/* Colour and size of what was ordered */}
            {o.items?.slice(0, 2).map((item, idx) => {
              const color = item.color || item.variant?.color;
              const size = item.size || item.variant?.size;
              return color || size ? (
                <span key={idx} className="block max-w-[180px] truncate text-[11px] font-normal text-espresso">
                  {[color, size && `Size ${size}`].filter(Boolean).join(' · ')}
                  {item.quantity > 1 ? ` × ${item.quantity}` : ''}
                </span>
              ) : null;
            })}
          </span>
        </div>
      ),
    },
    {
      header: 'Total Amount',
      key: 'totalAmount',
      render: (o) => (
        <div>
          <p className="font-bold text-espresso text-body-sm">₹{o.totalAmount.toFixed(2)}</p>
          {o.couponDiscount > 0 && (
            <span className="text-[10px] text-emerald-700 font-medium">
              Saved ₹{o.couponDiscount}
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Payment',
      key: 'paymentStatus',
      render: (o) => (
        <div className="space-y-1">
          <PaymentStatusBadge status={o.paymentStatus} />
          <p className="text-[10px] text-outline uppercase font-medium">
            {o.paymentMethod}
          </p>
        </div>
      ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (o) => (
        <div className="space-y-1">
          <OrderStatusBadge status={o.status} />
          {o.cancelRequested && o.cancelApproved === null && (
            <span className="block text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
              Cancel Requested
            </span>
          )}
        </div>
      ),
    },
    {
      header: 'Actions',
      render: (o) => (
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              setSelectedOrder(o);
              setIsDetailsOpen(true);
            }}
            className="rounded p-1.5 text-outline hover:bg-ivory-200 hover:text-espresso"
            title="View Order Details"
          >
            <Eye size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              setSelectedOrder(o);
              setIsStatusUpdateOpen(true);
            }}
            className="rounded p-1.5 text-burgundy hover:bg-burgundy/10"
            title="Update Order Status"
          >
            <CheckCircle2 size={16} />
          </button>

          <button
            type="button"
            onClick={() => generateOrderInvoice(o)}
            className="rounded p-1.5 text-outline hover:bg-ivory-200 hover:text-espresso"
            title="Download Tax Invoice"
          >
            <Download size={16} />
          </button>
        </div>
      ),
    },
  ];

  // Returns Columns
  const returnColumns: Column<ReturnRequestItem>[] = [
    {
      header: 'Order #',
      render: (r) => (
        <span className="font-mono font-bold text-espresso text-body-sm">
          {r.order?.orderNumber}
        </span>
      ),
    },
    {
      header: 'Customer',
      render: (r) => (
        <div>
          <p className="font-medium text-espresso text-body-sm">{r.customer?.fullname}</p>
          <p className="text-technical-data text-outline font-mono">+91 {r.customer?.phoneNumber}</p>
        </div>
      ),
    },
    {
      header: 'Items',
      render: (r) => (
        <div className="max-w-[240px] space-y-1">
          {(r.lines ?? []).map((l) => (
            <div key={l.orderItemId} className="flex items-center gap-2">
              {l.image && <img src={l.image} alt="" className="h-9 w-7 rounded object-cover" />}
              <span className="text-xs text-espresso">
                {l.quantity} × {l.name}
                {l.size ? ` · ${l.size}` : ''}
              </span>
            </div>
          ))}
          {!!r.images?.length && <span className="text-[11px] text-outline">{r.images.length} photo{r.images.length > 1 ? 's' : ''} from customer</span>}
        </div>
      ),
    },
    {
      header: 'Reason',
      render: (r) => (
        <div className="max-w-xs">
          <p className="text-body-sm font-semibold text-espresso">{r.reason}</p>
          {r.description && <p className="text-xs text-outline line-clamp-1 italic">"{r.description}"</p>}
        </div>
      ),
    },
    {
      header: 'Customer wants',
      render: (r) =>
        r.resolution === 'EXCHANGE' ? (
          <span className="text-body-sm font-semibold text-espresso">
            Exchange{r.exchangeFor ? ` for ${r.exchangeFor}` : ''}
          </span>
        ) : (
          <span className="font-semibold text-espresso">Refund ₹{(r.refundAmount ?? 0).toLocaleString('en-IN')}</span>
        ),
    },
    {
      header: 'Return Status',
      render: (r) => (
        <span className="rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-semibold text-orange-900 border border-orange-200">
          {r.returnStatus}
        </span>
      ),
    },
    {
      header: 'Refund Status',
      render: (r) => (
        <span className="rounded-full bg-ivory-200 px-2.5 py-0.5 text-xs font-semibold text-espresso border border-ivory-300">
          {r.refundStatus}
        </span>
      ),
    },
    {
      header: 'Action',
      render: (r) => (
        <button
          type="button"
          onClick={() => {
            setSelectedReturn(r);
            setIsReturnModalOpen(true);
          }}
          className="rounded-lg bg-burgundy px-3 py-1 text-xs font-medium text-white hover:bg-burgundy/90 shadow-sm"
        >
          Review Return
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* 1. Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <PageHeader
          compact
          breadcrumbs={[{label: 'Sales & Fulfillment'}, {label: 'Order Management'}]}
          title="Order Management"
        />
        <button
          type="button"
          onClick={handleRefreshAll}
          className="flex items-center gap-1.5 rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs font-medium text-espresso shadow-sm hover:bg-ivory-100"
        >
          <RefreshCw size={13} /> Refresh Orders
        </button>
      </div>

      {/* 2. Order Dashboard Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="rounded-xl border border-ivory-300 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-outline text-xs mb-1">
            <span>Total Orders</span>
            <ShoppingBag size={15} />
          </div>
          <p className="font-serif text-2xl font-bold text-espresso">
            {dashboardData?.totalOrders ?? 0}
          </p>
          <p className="text-[11px] text-outline mt-0.5">Across all channels</p>
        </div>

        <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-amber-800 text-xs mb-1">
            <span className="font-medium">Pending Review</span>
            <Clock size={15} />
          </div>
          <p className="font-serif text-2xl font-bold text-amber-900">
            {dashboardData?.pendingOrders ?? 0}
          </p>
          <p className="text-[11px] text-amber-700 mt-0.5">Awaiting store confirmation</p>
        </div>

        <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-indigo-800 text-xs mb-1">
            <span className="font-medium">Processing / Packed</span>
            <Package size={15} />
          </div>
          <p className="font-serif text-2xl font-bold text-indigo-950">
            {(dashboardData?.processingOrders ?? 0) + (dashboardData?.packedOrders ?? 0)}
          </p>
          <p className="text-[11px] text-indigo-700 mt-0.5">Being prepared in shop</p>
        </div>

        <div className="rounded-xl border border-cyan-200 bg-cyan-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-cyan-800 text-xs mb-1">
            <span className="font-medium">Shipped / Transit</span>
            <Truck size={15} />
          </div>
          <p className="font-serif text-2xl font-bold text-cyan-950">
            {dashboardData?.shippedOrders ?? 0}
          </p>
          <p className="text-[11px] text-cyan-700 mt-0.5">With courier partners</p>
        </div>

        <div className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-4 shadow-sm">
          <div className="flex items-center justify-between text-emerald-800 text-xs mb-1">
            <span className="font-medium">Delivered</span>
            <PackageCheck size={15} />
          </div>
          <p className="font-serif text-2xl font-bold text-emerald-950">
            {dashboardData?.deliveredOrders ?? 0}
          </p>
          <p className="text-[11px] text-emerald-700 mt-0.5">Successfully fulfilled</p>
        </div>

        <div className="rounded-xl border border-burgundy/20 bg-burgundy/5 p-4 shadow-sm">
          <div className="flex items-center justify-between text-burgundy text-xs mb-1">
            <span className="font-medium">Revenue</span>
            <IndianRupee size={15} />
          </div>
          <p className="font-serif text-2xl font-bold text-burgundy">
            ₹{dashboardData?.totalRevenue ?? 0}
          </p>
          <p className="text-[11px] text-outline mt-0.5">Realized sales volume</p>
        </div>
      </div>

      {/* 3. Status Tabs Navigation */}
      <div className="flex overflow-x-auto gap-2 border-b border-ivory-300 pb-2.5 scrollbar-thin">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.value;
          const count = tab.countKey && dashboardData ? (dashboardData as any)[tab.countKey] : undefined;

          return (
            <button
              key={tab.value}
              onClick={() => {
                setActiveTab(tab.value);
                setPage(1);
              }}
              className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3.5 py-1.5 text-xs font-semibold transition ${
                isActive
                  ? 'bg-burgundy text-white shadow-sm'
                  : 'bg-ivory-100 text-espresso hover:bg-ivory-200'
              }`}
            >
              <span>{tab.label}</span>
              {count !== undefined && count > 0 && (
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                    isActive ? 'bg-white/20 text-white' : 'bg-ivory-300 text-espresso'
                  }`}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* 4. Search and Filters Bar (for Orders) */}
      {activeTab !== 'RETURNS' && (
        <div className="rounded-xl border border-ivory-300 bg-white p-4 shadow-sm space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-outline" />
              <input
                type="text"
                placeholder="Search Order #, customer, phone..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-ivory-300 bg-white pl-9 pr-3 py-1.5 text-xs text-espresso focus:border-burgundy focus:outline-none"
              />
            </div>

            {/* Payment Status Dropdown */}
            <div>
              <select
                value={paymentStatus}
                onChange={(e) => {
                  setPaymentStatus(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs text-espresso focus:border-burgundy focus:outline-none"
              >
                <option value="">All Payment Statuses</option>
                <option value="PAID">Paid</option>
                <option value="PENDING">Pending (COD/Awaiting)</option>
                <option value="FAILED">Failed</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>

            {/* Start Date */}
            <div>
              <input
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs text-espresso focus:border-burgundy focus:outline-none"
                title="Start Date"
              />
            </div>

            {/* End Date */}
            <div>
              <input
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs text-espresso focus:border-burgundy focus:outline-none"
                title="End Date"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-ivory-200">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-medium text-amber-900">
              <input
                type="checkbox"
                checked={cancellationOnly}
                onChange={(e) => {
                  setCancellationOnly(e.target.checked);
                  setPage(1);
                }}
                className="rounded border-amber-300 text-amber-600 focus:ring-amber-500 h-3.5 w-3.5"
              />
              Show only orders with pending cancellation requests
            </label>

            {(search || paymentStatus || startDate || endDate || cancellationOnly) && (
              <button
                type="button"
                onClick={() => {
                  setSearch('');
                  setPaymentStatus('');
                  setStartDate('');
                  setEndDate('');
                  setCancellationOnly(false);
                  setPage(1);
                }}
                className="text-xs text-burgundy hover:underline font-medium"
              >
                Clear all filters
              </button>
            )}
          </div>
        </div>
      )}

      {/* 5. Main Table Rendering */}
      {activeTab === 'RETURNS' ? (
        <GenericTable
          caption="Return Requests"
          columns={returnColumns}
          data={returnsData?.items || []}
          loading={isReturnsLoading}
          fetching={isReturnsFetching}
          onRetry={() => refetchReturns()}
          emptyIcon={<RotateCcw size={24} />}
          emptyTitle="No return requests found"
          pagination={returnsData?.pagination}
          onPageChange={setPage}
        />
      ) : (
        <GenericTable
          caption="Customer Orders"
          columns={orderColumns}
          data={ordersData?.items || []}
          loading={isOrdersLoading}
          fetching={isOrdersFetching}
          onRetry={() => refetchOrders()}
          emptyIcon={<ShoppingBag size={24} />}
          emptyTitle="No orders found matching criteria"
          pagination={ordersData?.pagination}
          onPageChange={setPage}
        />
      )}

      {/* 6. Modals */}
      <OrderDetailsModal
        panel={panel}
        order={selectedOrder}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onRefresh={handleRefreshAll}
      />

      <OrderStatusUpdateModal
        panel={panel}
        order={selectedOrder}
        isOpen={isStatusUpdateOpen}
        onClose={() => setIsStatusUpdateOpen(false)}
        onSuccess={handleRefreshAll}
      />

      <ShippingModal
        panel={panel}
        order={selectedOrder}
        isOpen={isShippingOpen}
        onClose={() => setIsShippingOpen(false)}
        onSuccess={handleRefreshAll}
      />

      <CancellationReviewModal
        panel={panel}
        order={selectedOrder}
        isOpen={isCancellationOpen}
        onClose={() => setIsCancellationOpen(false)}
        onSuccess={handleRefreshAll}
      />

      <ReturnReviewModal
        panel={panel}
        returnItem={selectedReturn}
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        onSuccess={handleRefreshAll}
      />
    </div>
  );
}

