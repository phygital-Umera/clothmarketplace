import BillDetailsModal from '@/components/Bills/BillDetailsModal';
import {SalesStateBadge} from '@/components/Bills/BillStatusBadge';
import {Column, GenericTable} from '@/components/Forms';
import ListToolbar from '@/components/Org/ListToolbar';
import {KpiCard, PageHeader} from '@/components/ui';
import useListState from '@/hooks/useListState';
import {exportBranchSales} from '@/lib/api/bill';
import {
  useBills,
  useBranchSalesSummary,
} from '@/lib/react-query/queriesAndMutations/bill';
import {Bill, BillStatus, BranchSalesParams, PaymentMethod} from '@/types/bill';
import {getErrorMessage} from '@/utils/axios';
import {exportSalesExcel} from '@/utils/exportSalesExcel';
import {Download, Eye} from 'lucide-react';
import {ReactNode, useState} from 'react';
import toast from 'react-hot-toast';

const PANEL = 'branch-admin';

const inr = (n?: number) =>
  n === undefined
    ? '–'
    : `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

const todayIso = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

const MODES: {label: string; value: PaymentMethod}[] = [
  {label: 'Cash', value: 'CASH'},
  {label: 'Card', value: 'CARD'},
  {label: 'UPI', value: 'UPI'},
  {label: 'Credit', value: 'CREDIT'},
];

/** Status filter: real bill statuses plus the edited / on-credit flags */
const STATUSES = [
  {label: 'Confirmed', value: 'CONFIRMED'},
  {label: 'Draft', value: 'DRAFT'},
  {label: 'Cancelled', value: 'CANCELLED'},
  {label: 'Edited', value: 'EDITED'},
  {label: 'On credit', value: 'ON_CREDIT'},
] as const;
type StatusFilter = (typeof STATUSES)[number]['value'] | '';

const selectCls =
  'border border-ivory-300 bg-white px-3 py-1.5 text-body-sm text-espresso focus:border-burgundy focus:outline-none';

const Panel = ({title, children}: {title: string; children: ReactNode}) => (
  <section className="panel p-4 md:p-5">
    <h2 className="mb-3 border-b border-ivory-300 pb-2 font-serif text-body-lg text-burgundy">
      {title}
    </h2>
    {children}
  </section>
);

/** Branch admin: every sales bill of every shop in the branch (view only) */
export default function BranchSalesBillsPage() {
  const list = useListState();
  const [date, setDate] = useState(todayIso());
  const [shopId, setShopId] = useState<string | undefined>();
  const [mode, setMode] = useState<PaymentMethod | ''>('');
  const [status, setStatus] = useState<StatusFilter>('');
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  const filters: BranchSalesParams = {
    from: date,
    to: date,
    shopId,
    paymentMethod: mode || undefined,
    ...(status === 'EDITED' || status === 'ON_CREDIT'
      ? {flag: status}
      : {status: (status || undefined) as BillStatus | undefined}),
  };
  const {data, isPending, isFetching, isError, error, refetch} = useBills(
    PANEL,
    'sales',
    {...list.params, ...filters},
  );
  const {data: summary} = useBranchSalesSummary({from: date, to: date, shopId});
  const k = summary?.kpis;

  const setFilter = (apply: () => void) => {
    apply();
    list.setPage(1);
  };

  const shopTabs = [
    {
      label: 'All shops',
      value: undefined,
      count: summary?.shopCounts.reduce((t, s) => t + s.bills, 0),
    },
    ...(summary?.shopCounts ?? []).map((s) => ({
      label: s.name,
      value: s.shopId,
      count: s.bills,
    })),
  ];
  const shopNames = (summary?.shopCounts ?? []).map((s) => s.name);

  const onExport = async () => {
    setExporting(true);
    try {
      const res = await exportBranchSales({
        ...filters,
        search: list.params.search,
      });
      if (!res.data.length) {
        toast.error('No bills match these filters.');
        return;
      }
      await exportSalesExcel(res.data, `sales-bills-${date}.xlsx`);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  const columns: Column<Bill>[] = [
    {
      header: 'Bill no',
      key: 'billNumber',
      sortable: true,
      render: (b) => (
        <span className="font-mono text-body-sm font-bold text-espresso">
          {b.billNumber}
        </span>
      ),
    },
    {header: 'Shop', render: (b) => b.shop?.name ?? '—'},
    {
      header: 'Time',
      key: 'billDate',
      sortable: true,
      render: (b) =>
        new Date(b.billDate).toLocaleTimeString('en-IN', {
          hour: 'numeric',
          minute: '2-digit',
        }),
    },
    {
      header: 'Customer',
      render: (b) => (
        <div>
          <p className="text-body-sm text-espresso">
            {b.customerName || 'Walk-in'}
          </p>
          {b.customerPhone && (
            <p className="text-technical-data text-outline">
              {b.customerPhone}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Cashier',
      hideBelow: 'md',
      render: (b) => b.createdBy?.fullname ?? '—',
    },
    {
      header: 'Disc.',
      align: 'right',
      hideBelow: 'lg',
      render: (b) => (b.discount ? inr(b.discount) : '—'),
    },
    {
      header: 'GST',
      align: 'right',
      hideBelow: 'lg',
      render: (b) => inr(b.taxAmount),
    },
    {
      header: 'Net',
      key: 'totalAmount',
      sortable: true,
      align: 'right',
      render: (b) => (
        <span className="font-medium text-espresso">{inr(b.totalAmount)}</span>
      ),
    },
    {
      header: 'Mode',
      render: (b) =>
        MODES.find((m) => m.value === b.paymentMethod)?.label ??
        b.paymentMethod,
    },
    {header: 'Status', render: (b) => <SalesStateBadge bill={b} />},
  ];

  const watch = [
    {
      label: 'Bills with discount above 10%',
      count: summary?.watch.highDiscount,
    },
    {
      label: 'Bills edited after confirming',
      count: summary?.watch.edited,
      filter: 'EDITED' as const,
    },
    {
      label: 'Bills cancelled',
      count: summary?.watch.cancelled,
      filter: 'CANCELLED' as const,
    },
    {label: 'Bills without customer mobile', count: summary?.watch.noMobile},
  ];

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Sales'}, {label: 'Sales bills'}]}
        title="Sales bills — all shops"
        subtitle={`Every bill made at ${
          shopNames.length ? shopNames.join(', ') : 'the shops of this branch'
        }. View only — bills are made at the shop POS.`}
        actions={
          <button
            type="button"
            onClick={onExport}
            disabled={exporting}
            className="btn-ghost"
          >
            <Download size={16} />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <KpiCard
          label="Bills"
          value={k ? String(k.bills) : '–'}
          note={k && `${k.creditBills} on credit · ${k.cancelled} cancelled`}
        />
        <KpiCard
          label="Net sales"
          value={inr(k?.netSales)}
          note={k && `incl. GST ${inr(k.taxAmount)}`}
        />
        <KpiCard
          label="Discount given"
          value={inr(k?.discount)}
          tone={k && k.discountPct > 10 ? 'bad' : 'muted'}
          note={k && `${k.discountPct}% of gross`}
        />
        <KpiCard
          label="On credit"
          value={inr(k?.onCredit)}
          tone={k?.onCredit ? 'bad' : 'muted'}
          note={k && `${k.creditBills} bill${k.creditBills === 1 ? '' : 's'}`}
          onClick={() => setFilter(() => setStatus('ON_CREDIT'))}
        />
        <KpiCard
          label="Edited / cancelled"
          value={k ? `${k.edited} / ${k.cancelled}` : '–'}
          note="Review"
          onClick={() => setFilter(() => setStatus('EDITED'))}
        />
      </div>

      <div className="mt-4">
        <GenericTable
          columns={columns}
          data={data?.items}
          loading={isPending}
          fetching={isFetching}
          error={isError ? error : undefined}
          errorMessage={getErrorMessage(error, 'Could not load sales bills')}
          onRetry={refetch}
          emptyTitle="No sales bills"
          emptyMessage="No bills match these filters."
          onRowClick={(b) => setViewingId(b.id)}
          rowActions={() => [
            {
              label: 'View',
              icon: <Eye size={16} />,
              onClick: (b) => setViewingId(b.id),
            },
          ]}
          pagination={data?.pagination}
          onPageChange={list.setPage}
          sort={list.sort}
          onSortChange={list.setSort}
          toolbar={
            <ListToolbar
              tabs={shopTabs}
              tab={shopId}
              onTab={(value) => setFilter(() => setShopId(value))}
              searchText={list.searchText}
              onSearch={list.setSearchText}
              placeholder="Bill no, customer, mobile"
            >
              <input
                type="date"
                value={date}
                max={todayIso()}
                onChange={(e) =>
                  setFilter(() => setDate(e.target.value || todayIso()))
                }
                title="Bill date"
                className={selectCls}
              />
              <select
                value={mode}
                onChange={(e) =>
                  setFilter(() => setMode(e.target.value as PaymentMethod | ''))
                }
                className={selectCls}
                aria-label="Payment mode"
              >
                <option value="">All modes</option>
                {MODES.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
              <select
                value={status}
                onChange={(e) =>
                  setFilter(() => setStatus(e.target.value as StatusFilter))
                }
                className={selectCls}
                aria-label="Status"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </ListToolbar>
          }
        />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Panel title="Cashier summary">
            {summary?.cashiers.length ? (
              <div className="-mx-4 overflow-x-auto md:-mx-5">
                <table className="w-full min-w-[560px]">
                  <thead className="border-b border-ivory-300">
                    <tr className="text-label-caps uppercase text-outline">
                      <th className="px-3 py-2 text-left">Cashier</th>
                      <th className="px-3 py-2 text-left">Shop</th>
                      <th className="px-3 py-2 text-right">Bills</th>
                      <th className="px-3 py-2 text-right">Sales</th>
                      <th className="px-3 py-2 text-right">Discount</th>
                      <th className="px-3 py-2 text-right">Edits / cancels</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ivory-200 text-body-sm text-espresso">
                    {summary.cashiers.map((c) => (
                      <tr key={c.id}>
                        <td className="px-3 py-2.5">{c.name}</td>
                        <td className="px-3 py-2.5">{c.shop}</td>
                        <td className="px-3 py-2.5 text-right">{c.bills}</td>
                        <td className="px-3 py-2.5 text-right">
                          {inr(c.sales)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {c.discount ? inr(c.discount) : '—'}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right ${
                            c.edits + c.cancels ? 'text-error' : ''
                          }`}
                        >
                          {c.edits + c.cancels
                            ? `${c.edits} / ${c.cancels}`
                            : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="py-4 text-body-sm text-on-surface-variant">
                No bills on this day.
              </p>
            )}
          </Panel>
        </div>

        <Panel title="Watch list">
          <ul className="divide-y divide-ivory-200">
            {watch.map((w) => (
              <li key={w.label}>
                <button
                  type="button"
                  disabled={!w.filter}
                  onClick={() =>
                    w.filter && setFilter(() => setStatus(w.filter))
                  }
                  className="flex w-full items-center justify-between gap-3 py-2.5 text-left text-body-sm text-espresso enabled:hover:text-burgundy"
                >
                  <span>{w.label}</span>
                  <span
                    className={`font-medium ${w.count ? 'text-error' : 'text-outline'}`}
                  >
                    {w.count ?? '–'}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      {viewingId && (
        <BillDetailsModal
          panel={PANEL}
          kind="sales"
          billId={viewingId}
          onClose={() => setViewingId(null)}
        />
      )}
    </>
  );
}
