import {Column, GenericTable} from '@/components/Forms';
import {PageHeader, StatusBadge} from '@/components/ui';
import {useOrders, useUpdateOrderStatus} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {CheckCircle2, ShoppingBag, Truck} from 'lucide-react';
import {useState} from 'react';

export default function OrderList({panel}: {panel: string}) {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [trackingNumber, setTrackingNumber] = useState('');

  const {data, isPending, isFetching, refetch} = useOrders(panel, {
    page,
    limit: 15,
    status: statusFilter || undefined,
  });

  const updateStatusMutation = useUpdateOrderStatus(panel);

  const handleStatusChange = async (orderId: string, nextStatus: string, trackNum?: string) => {
    await updateStatusMutation.mutateAsync({
      id: orderId,
      data: {status: nextStatus, trackingNumber: trackNum},
    });
    setSelectedOrder(null);
    setTrackingNumber('');
    refetch();
  };

  const columns: Column<any>[] = [
    {
      header: 'Order #',
      key: 'orderNumber',
      render: (o) => (
        <div>
          <p className="font-semibold text-espresso">{o.orderNumber}</p>
          <p className="text-technical-data text-outline">
            {new Date(o.createdAt).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      header: 'Customer',
      render: (o) => (
        <div>
          <p className="font-medium text-espresso">{o.customer?.fullname}</p>
          <p className="text-technical-data text-outline">{o.customer?.phoneNumber}</p>
        </div>
      ),
    },
    {
      header: 'Branch',
      render: (o) => o.branch?.name || '-',
    },
    {
      header: 'Items',
      render: (o) => (
        <span className="text-body-sm text-espresso">
          {o.items?.length || 0} product(s)
        </span>
      ),
    },
    {
      header: 'Total Amount',
      key: 'totalAmount',
      render: (o) => (
        <span className="font-semibold text-espresso">₹{o.totalAmount}</span>
      ),
    },
    {
      header: 'Payment',
      key: 'paymentStatus',
      render: (o) => <StatusBadge status={o.paymentStatus} />,
    },
    {
      header: 'Order Status',
      key: 'status',
      render: (o) => <StatusBadge status={o.status} />,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        compact
        breadcrumbs={[{label: 'Sales'}, {label: 'Orders'}]}
        title="Order Management"
      />

      <div className="flex gap-2 border-b border-outline/20 pb-3">
        {['', 'PENDING', 'PROCESSING', 'PACKED', 'DISPATCHED', 'DELIVERED', 'CANCELLED'].map((st) => (
          <button
            key={st}
            onClick={() => setStatusFilter(st)}
            className={`rounded px-3 py-1.5 text-xs font-medium transition ${
              statusFilter === st
                ? 'bg-burgundy text-ivory'
                : 'bg-ivory-light text-espresso hover:bg-ivory/80'
            }`}
          >
            {st || 'All Orders'}
          </button>
        ))}
      </div>

      <GenericTable
        caption="Orders"
        columns={columns}
        data={data?.items || []}
        loading={isPending}
        fetching={isFetching}
        onRetry={() => refetch()}
        emptyIcon={<ShoppingBag size={24} />}
        emptyTitle="No orders found"
        pagination={data?.pagination}
        onPageChange={setPage}
        rowActions={(o) => [
          {
            label: 'Process Next Step',
            icon: <CheckCircle2 size={16} />,
            onClick: () => setSelectedOrder(o),
          },
        ]}
      />

      {/* Dispatch / Status Update Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-outline/20 bg-ivory p-6 shadow-xl">
            <h3 className="font-serif text-headline-sm text-burgundy">Update Order Status</h3>
            <p className="mt-1 text-body-sm text-outline">
              Order #{selectedOrder.orderNumber} (Current: {selectedOrder.status})
            </p>

            <div className="mt-5 space-y-3">
              {selectedOrder.status === 'PENDING' && (
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'PROCESSING')}
                  className="btn-primary w-full"
                >
                  Confirm & Start Processing
                </button>
              )}

              {selectedOrder.status === 'PROCESSING' && (
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'PACKED')}
                  className="btn-primary w-full"
                >
                  Mark as Packed
                </button>
              )}

              {selectedOrder.status === 'PACKED' && (
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="Enter Shipment / Tracking #"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    className="w-full rounded border border-outline/30 bg-white p-2 text-body-sm"
                  />
                  <button
                    onClick={() => handleStatusChange(selectedOrder.id, 'DISPATCHED', trackingNumber)}
                    className="btn-primary flex w-full items-center justify-center gap-2"
                  >
                    <Truck size={16} /> Dispatch Shipment
                  </button>
                </div>
              )}

              {selectedOrder.status === 'DISPATCHED' && (
                <button
                  onClick={() => handleStatusChange(selectedOrder.id, 'DELIVERED')}
                  className="btn-primary w-full"
                >
                  Confirm Delivery
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="btn-ghost mt-2 w-full"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

