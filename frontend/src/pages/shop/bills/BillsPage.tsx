import {Column, ConfirmDialog, GenericTable} from '@/components/Forms';
import ListToolbar from '@/components/Org/ListToolbar';
import {PageHeader} from '@/components/ui';
import BillDetailsModal from '@/components/Bills/BillDetailsModal';
import BillFormModal from '@/components/Bills/BillFormModal';
import BillStatusBadge from '@/components/Bills/BillStatusBadge';
import PaymentStatusBadge from '@/components/Bills/PaymentStatusBadge';
import RecordPaymentModal from '@/components/Bills/RecordPaymentModal';
import useListState from '@/hooks/useListState';
import {
  useBill,
  useBills,
  useCancelBill,
  useConfirmBill,
  useDeleteBill,
} from '@/lib/react-query/queriesAndMutations/bill';
import {Bill, BillKind, BillListParams, BillStatus} from '@/types/bill';
import {getErrorMessage} from '@/utils/axios';
import {Link, useSearch} from '@tanstack/react-router';
import {
  Ban,
  CheckCircle2,
  Eye,
  FileText,
  IndianRupee,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {useEffect, useState} from 'react';

type PaymentFilter = NonNullable<BillListParams['paymentStatus']>;
const PAYMENT_FILTERS: PaymentFilter[] = [
  'PAID',
  'PART_CREDIT',
  'CREDIT',
  'DUE',
];

interface Props {
  panel: string;
  kind: BillKind;
}

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Confirmed', value: 'CONFIRMED'},
  {label: 'Draft', value: 'DRAFT'},
  {label: 'Cancelled', value: 'CANCELLED'},
];

const money = (n: number) =>
  `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;

/** Loads the full bill (with items) before opening the edit form */
const EditBill = ({
  panel,
  kind,
  id,
  onClose,
}: {
  panel: string;
  kind: BillKind;
  id: string;
  onClose: () => void;
}) => {
  const {data: bill} = useBill(panel, kind, id);
  return bill ? (
    <BillFormModal panel={panel} kind={kind} bill={bill} onClose={onClose} />
  ) : null;
};

export default function BillsPage({panel, kind}: Props) {
  console.log(`[Shop Panel] Rendering BillsPage (panel: ${panel}, kind: ${kind})`);
  useEffect(() => {
    console.log(`[Shop Panel] BillsPage mounted (panel: ${panel}, kind: ${kind})`);
  }, [panel, kind]);
  const isPurchase = kind === 'purchase';
  const label = isPurchase ? 'Purchase Bills' : 'Sales Bills';
  const list = useListState();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  // The dashboard's Ledger / Suppliers links open this list filtered to dues
  const {payment: linked} = useSearch({strict: false}) as {payment?: string};
  const [payment, setPayment] = useState<PaymentFilter | ''>(
    PAYMENT_FILTERS.includes(linked as PaymentFilter)
      ? (linked as PaymentFilter)
      : '',
  );
  const [paying, setPaying] = useState<Bill | null>(null);

  const {data, isPending, isFetching, isError, error, refetch} = useBills(
    panel,
    kind,
    {
      ...list.params,
      status: list.filters.status as BillStatus | undefined,
      from: from || undefined,
      to: to || undefined,
      paymentStatus: payment || undefined,
    },
  );
  const confirm = useConfirmBill(panel, kind);
  const cancel = useCancelBill(panel, kind);
  const remove = useDeleteBill(panel, kind);

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [toConfirm, setToConfirm] = useState<Bill | null>(null);
  const [toCancel, setToCancel] = useState<Bill | null>(null);
  const [toDelete, setToDelete] = useState<Bill | null>(null);

  const stockWord = isPurchase ? 'added to' : 'deducted from';
  const reverseWord = isPurchase ? 'removed from' : 'returned to';

  const columns: Column<Bill>[] = [
    {
      header: 'Bill # & Date',
      key: 'billNumber',
      sortable: true,
      render: (b) => (
        <div>
          <p className="font-mono text-body-sm font-bold text-espresso">
            {b.billNumber}
          </p>
          <p className="text-technical-data text-outline">
            {new Date(b.billDate).toLocaleDateString('en-IN', {
              day: '2-digit',
              month: 'short',
              year: 'numeric',
            })}
          </p>
        </div>
      ),
    },
    {
      header: isPurchase ? 'Supplier' : 'Customer',
      render: (b) => (
        <div>
          <p className="text-body-sm font-medium text-espresso">
            {(isPurchase ? b.supplierName : b.customerName) ||
              'Walk-in customer'}
          </p>
          <p className="text-technical-data text-outline">
            {isPurchase
              ? b.supplierInvoiceNo && `Inv: ${b.supplierInvoiceNo}`
              : b.paymentMethod}
          </p>
        </div>
      ),
    },
    {
      header: 'Items',
      hideBelow: 'md',
      render: (b) => (
        <span className="text-body-sm">{b._count?.items ?? 0} item(s)</span>
      ),
    },
    {
      header: 'Total',
      key: 'totalAmount',
      sortable: true,
      align: 'right',
      render: (b) => (
        <span className="font-bold text-espresso">{money(b.totalAmount)}</span>
      ),
    },
    {
      header: 'Payment',
      hideBelow: 'md',
      render: (b) =>
        b.status === 'CONFIRMED' ? (
          <div>
            <PaymentStatusBadge status={b.paymentStatus} />
            {b.balanceDue > 0 && (
              <p className="mt-0.5 text-technical-data text-outline">
                Due {money(b.balanceDue)}
              </p>
            )}
          </div>
        ) : (
          <span className="text-outline">—</span>
        ),
    },
    {
      header: 'Status',
      key: 'status',
      render: (b) => <BillStatusBadge status={b.status} />,
    },
    {
      header: 'Created By',
      hideBelow: 'lg',
      render: (b) => (
        <span className="text-body-sm text-outline">
          {b.createdBy?.fullname}
        </span>
      ),
    },
  ];

  return (
    <div>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Shop'}, {label}]}
        title={label}
        subtitle={
          isPurchase
            ? 'Stock is added automatically when a purchase bill is confirmed.'
            : 'Stock is deducted automatically when a sales bill is confirmed.'
        }
        actions={
          isPurchase ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className="btn-primary"
            >
              <Plus size={14} /> New Purchase Bill
            </button>
          ) : (
            <Link
              to="/shop-admin/new-bill"
              className="btn-primary"
            >
              <Plus size={14} /> New Bill (POS)
            </Link>
          )
        }
      />

      <GenericTable
        caption={label}
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorMessage={getErrorMessage(
          error,
          `Failed to load ${label.toLowerCase()}`,
        )}
        onRetry={() => refetch()}
        emptyIcon={<FileText size={22} strokeWidth={1.5} />}
        emptyTitle={
          list.hasFilters || from || to || payment
            ? 'No matching bills'
            : `No ${label.toLowerCase()} yet`
        }
        onRowClick={(b) => setViewingId(b.id)}
        rowActions={(b) => [
          {
            label: 'View',
            icon: <Eye size={16} />,
            onClick: () => setViewingId(b.id),
          },
          ...(b.status !== 'CANCELLED'
            ? [
                {
                  label: 'Edit',
                  icon: <Pencil size={16} />,
                  onClick: () => setEditingId(b.id),
                },
              ]
            : []),
          ...(b.status === 'CONFIRMED' && b.balanceDue > 0
            ? [
                {
                  label: isPurchase ? 'Pay Supplier' : 'Collect Due',
                  icon: <IndianRupee size={16} />,
                  onClick: () => setPaying(b),
                },
              ]
            : []),
          ...(b.status === 'DRAFT'
            ? [
                {
                  label: 'Confirm',
                  icon: <CheckCircle2 size={16} />,
                  onClick: () => setToConfirm(b),
                },
              ]
            : []),
          ...(b.status !== 'CANCELLED'
            ? [
                {
                  label: 'Cancel Bill',
                  icon: <Ban size={16} />,
                  tone: 'danger' as const,
                  onClick: () => setToCancel(b),
                },
              ]
            : []),
          {
            label: 'Delete',
            icon: <Trash2 size={16} />,
            tone: 'danger',
            onClick: () => setToDelete(b),
          },
        ]}
        pagination={data?.pagination}
        onPageChange={list.setPage}
        sort={list.sort}
        onSortChange={list.setSort}
        toolbar={
          <ListToolbar
            tabs={STATUS_TABS}
            tab={list.filters.status}
            onTab={(status) => list.setFilter({status})}
            searchText={list.searchText}
            onSearch={list.setSearchText}
            placeholder={
              isPurchase
                ? 'Search bill #, supplier, invoice, SKU'
                : 'Search bill #, customer, SKU'
            }
          >
            <input
              type="date"
              value={from}
              max={to || undefined}
              onChange={(e) => {
                setFrom(e.target.value);
                list.setPage(1);
              }}
              title="From date"
              className="rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs text-espresso focus:border-burgundy focus:outline-none"
            />
            <input
              type="date"
              value={to}
              min={from || undefined}
              onChange={(e) => {
                setTo(e.target.value);
                list.setPage(1);
              }}
              title="To date"
              className="rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs text-espresso focus:border-burgundy focus:outline-none"
            />
            <select
              value={payment}
              onChange={(e) => {
                setPayment(e.target.value as PaymentFilter | '');
                list.setPage(1);
              }}
              title="Payment"
              className="rounded-lg border border-ivory-300 bg-white px-3 py-1.5 text-xs text-espresso focus:border-burgundy focus:outline-none"
            >
              <option value="">All payments</option>
              <option value="DUE">{isPurchase ? 'Payable' : 'Due'}</option>
              <option value="PAID">Paid</option>
              <option value="PART_CREDIT">Part credit</option>
              <option value="CREDIT">Credit</option>
            </select>
          </ListToolbar>
        }
      />

      {creating && (
        <BillFormModal
          panel={panel}
          kind={kind}
          onClose={() => setCreating(false)}
        />
      )}
      {editingId && (
        <EditBill
          panel={panel}
          kind={kind}
          id={editingId}
          onClose={() => setEditingId(null)}
        />
      )}
      {viewingId && (
        <BillDetailsModal
          panel={panel}
          kind={kind}
          billId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}

      {paying && (
        <RecordPaymentModal
          panel={panel}
          kind={kind}
          party={
            (isPurchase ? paying.supplierName : paying.customerName) ||
            paying.billNumber
          }
          bills={[
            {
              id: paying.id,
              billNumber: paying.billNumber,
              balanceDue: paying.balanceDue,
            },
          ]}
          onClose={() => setPaying(null)}
        />
      )}

      <ConfirmDialog
        open={!!toConfirm}
        title={`Confirm ${toConfirm?.billNumber ?? ''}?`}
        message={`All quantities on this bill will be ${stockWord} stock now.`}
        confirmLabel="Confirm Bill"
        isLoading={confirm.isPending}
        onConfirm={() =>
          toConfirm &&
          confirm.mutate(toConfirm.id, {onSettled: () => setToConfirm(null)})
        }
        onCancel={() => setToConfirm(null)}
      />
      <ConfirmDialog
        open={!!toCancel}
        tone="danger"
        title={`Cancel ${toCancel?.billNumber ?? ''}?`}
        message={
          toCancel?.status === 'CONFIRMED'
            ? `Its quantities will be ${reverseWord} stock. The bill is kept as cancelled.`
            : 'This draft has not changed stock. It will be kept as cancelled.'
        }
        confirmLabel="Cancel Bill"
        requireReason
        reasonLabel="Cancel reason"
        isLoading={cancel.isPending}
        onConfirm={(reason) =>
          toCancel &&
          cancel.mutate(
            {id: toCancel.id, reason: reason ?? ''},
            {onSettled: () => setToCancel(null)},
          )
        }
        onCancel={() => setToCancel(null)}
      />
      <ConfirmDialog
        open={!!toDelete}
        tone="danger"
        title={`Delete ${toDelete?.billNumber ?? ''}?`}
        message={
          toDelete?.status === 'CONFIRMED'
            ? `Its quantities will be ${reverseWord} stock before it is deleted.`
            : 'This bill has no stock effect and will be removed.'
        }
        confirmLabel="Delete"
        isLoading={remove.isPending}
        onConfirm={() =>
          toDelete &&
          remove.mutate(toDelete.id, {onSettled: () => setToDelete(null)})
        }
        onCancel={() => setToDelete(null)}
      />
    </div>
  );
}
