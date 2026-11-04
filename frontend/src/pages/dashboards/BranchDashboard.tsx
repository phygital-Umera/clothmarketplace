import {KpiCard as Kpi, PageHeader} from '@/components/ui';
import useCurrentUser from '@/hooks/useCurrentUser';
import {useBranchOverview} from '@/lib/react-query/queriesAndMutations/org';
import {BranchOverview} from '@/types/org';
import {Link} from '@tanstack/react-router';
import {ReactNode} from 'react';

const inr = (n?: number) =>
  n === undefined
    ? '–'
    : `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

/** ₹22.6 L / ₹1.2 Cr for large figures */
const inrShort = (n?: number) => {
  if (n === undefined) return '–';
  if (n >= 1e7) return `₹${(n / 1e7).toFixed(1)} Cr`;
  if (n >= 1e5) return `₹${(n / 1e5).toFixed(1)} L`;
  return inr(n);
};

const today = new Date().toLocaleDateString('en-IN', {
  weekday: 'short',
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

const Section = ({
  title,
  link,
  children,
}: {
  title: string;
  link?: {label: string; to: string};
  children: ReactNode;
}) => (
  <section className="panel p-4 md:p-5">
    <div className="mb-3 flex items-center justify-between border-b border-ivory-300 pb-2">
      <h2 className="font-serif text-body-lg text-burgundy">{title}</h2>
      {link && (
        <Link to={link.to} className="btn-text">
          {link.label}
        </Link>
      )}
    </div>
    {children}
  </section>
);

const Empty = ({children}: {children: ReactNode}) => (
  <p className="py-4 text-body-sm text-on-surface-variant">{children}</p>
);

const ShopsTable = ({data}: {data?: BranchOverview}) => {
  const rows = data?.shops.rows ?? [];
  const total = rows.reduce(
    (t, r) => ({
      bills: t.bills + r.bills,
      sales: t.sales + r.sales,
      cash: t.cash + r.cash,
      digital: t.digital + r.digital,
      monthSales: t.monthSales + r.monthSales,
    }),
    {bills: 0, sales: 0, cash: 0, digital: 0, monthSales: 0},
  );
  const th = 'px-3 py-2 text-left text-label-caps uppercase text-outline';
  const td = 'px-3 py-3 text-body-sm text-espresso';

  if (!rows.length) return <Empty>No shops in this branch yet.</Empty>;

  return (
    <div className="-mx-4 overflow-x-auto md:-mx-5">
      <table className="w-full min-w-[720px]">
        <thead className="border-b border-ivory-300">
          <tr>
            <th className={th}>Shop</th>
            <th className={`${th} text-right`}>Bills</th>
            <th className={`${th} text-right`}>Sales</th>
            <th className={`${th} text-right`}>Cash</th>
            <th className={`${th} text-right`}>UPI / Card</th>
            <th className={`${th} text-right`}>Sales (MTD)</th>
            <th className={`${th} text-center`}>Counter</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ivory-200">
          {rows.map((r) => (
            <tr key={r.id}>
              <td className={td}>
                <p className="font-medium">{r.name}</p>
                <p className="text-technical-data text-outline">
                  {r.manager ?? 'Shop admin not assigned'}
                </p>
              </td>
              <td className={`${td} text-right`}>{r.bills}</td>
              <td className={`${td} text-right`}>{inr(r.sales)}</td>
              <td className={`${td} text-right`}>{inr(r.cash)}</td>
              <td className={`${td} text-right`}>{inr(r.digital)}</td>
              <td className={`${td} text-right`}>{inr(r.monthSales)}</td>
              <td className={`${td} text-center`}>
                {r.status === 'ACTIVE' ? (
                  <span className="badge-active">Open</span>
                ) : (
                  <span className="badge-inactive">Closed</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t border-ivory-300 bg-ivory-100">
          <tr className="font-medium">
            <td className={td}>Branch total</td>
            <td className={`${td} text-right`}>{total.bills}</td>
            <td className={`${td} text-right`}>{inr(total.sales)}</td>
            <td className={`${td} text-right`}>{inr(total.cash)}</td>
            <td className={`${td} text-right`}>{inr(total.digital)}</td>
            <td className={`${td} text-right`}>{inr(total.monthSales)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
};

const RankList = ({
  rows,
  empty,
}: {
  rows?: {name: string; bills: number; amount: number}[];
  empty: string;
}) =>
  rows?.length ? (
    <ul className="divide-y divide-ivory-200">
      {rows.map((r) => (
        <li key={r.name} className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <p className="truncate text-body-sm text-espresso">{r.name}</p>
            <p className="text-technical-data text-outline">
              {r.bills} bill{r.bills === 1 ? '' : 's'} this month
            </p>
          </div>
          <p className="text-body-sm font-medium text-burgundy">
            {inr(r.amount)}
          </p>
        </li>
      ))}
    </ul>
  ) : (
    <Empty>{empty}</Empty>
  );

/** Branch admin home: every shop of the branch at a glance */
const BranchDashboard = () => {
  const {data: me} = useCurrentUser();
  const {data, isError} = useBranchOverview();
  const branchName = me?.branch?.name ?? 'Branch';
  const pending = [
    ...(data?.pending.sales ?? []).map((b) => ({
      ...b,
      kind: 'Sales bill',
      party: b.customerName ?? 'Walk-in customer',
    })),
    ...(data?.pending.purchases ?? []).map((b) => ({
      ...b,
      kind: 'Purchase bill',
      party: b.supplierName,
    })),
  ];
  const change = data?.today.changePct;

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: `Overview · ${today}`}]}
        title={branchName}
        subtitle={
          data
            ? `${data.shops.active} of ${data.shops.total} shops open · ${data.staff.active} of ${data.staff.total} staff active · ${data.pending.count} draft bill${data.pending.count === 1 ? '' : 's'} waiting`
            : undefined
        }
        actions={
          <>
            <Link to="/branch-admin/approvals" className="btn-ghost">
              Approvals
              {!!data?.pending.count && (
                <span className="bg-burgundy px-1.5 text-ivory">
                  {data.pending.count}
                </span>
              )}
            </Link>
            <Link to="/branch-admin/new-purchase" className="btn-ghost">
              + Purchase
            </Link>
            <Link to="/branch-admin/stock-transfers" className="btn-primary">
              + Stock Transfer
            </Link>
          </>
        }
      />

      {isError && (
        <p role="alert" className="mb-4 text-body-sm text-error">
          Dashboard figures could not be loaded.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Branch sales today"
          value={inr(data?.today.sales)}
          tone={change == null ? 'muted' : change >= 0 ? 'good' : 'bad'}
          note={
            data &&
            `${data.today.bills} bills${
              change == null
                ? ''
                : ` · ${change >= 0 ? '▲' : '▼'} ${Math.abs(change)}%`
            }`
          }
        />
        <Kpi
          label="Sales this month"
          value={inr(data?.month.sales)}
          note={
            data && `${data.month.salesBills} bills · ${data.shops.total} shops`
          }
        />
        <Kpi
          label="Cash collected today"
          value={inr(data?.today.cash)}
          note={data && `Across ${data.shops.active} counters`}
        />
        <Kpi
          label="UPI / Card today"
          value={inr(data?.today.digital)}
          note="Digital payments"
        />
        <Kpi
          label="Purchases this month"
          value={inr(data?.month.purchases)}
          note={data && `${data.month.purchaseBills} purchase bills`}
        />
        <Kpi
          label="Stock value"
          value={inrShort(data?.stock.value)}
          note={
            data &&
            `${data.stock.units.toLocaleString('en-IN')} pcs at selling price`
          }
        />
        <Kpi
          label="Low stock items"
          value={data ? String(data.stock.lowStock) : '–'}
          tone={data?.stock.lowStock ? 'bad' : 'muted'}
          note="At or below threshold"
        />
        <Kpi
          label="GST payable (month)"
          value={inr(data?.month.netTax)}
          note={
            data &&
            `Output ${inr(data.month.outputTax)} − input ${inr(data.month.inputTax)}`
          }
        />
      </div>

      <div className="mt-4">
        <Section
          title="Shops today"
          link={{label: 'Day close status', to: '/branch-admin/day-close'}}
        >
          <ShopsTable data={data} />
        </Section>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section
            title="Waiting for your approval"
            link={{label: 'All approvals', to: '/branch-admin/approvals'}}
          >
            {pending.length ? (
              <ul className="divide-y divide-ivory-200">
                {pending.map((b) => (
                  <li key={b.id} className="flex items-center gap-3 py-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm font-medium text-espresso">
                        {b.kind} {b.billNumber} · {inr(b.totalAmount)}
                      </p>
                      <p className="truncate text-technical-data text-outline">
                        {b.shop.name} · {b.party}
                        {b.createdBy ? ` · by ${b.createdBy.fullname}` : ''}
                      </p>
                    </div>
                    <span className="badge-ribbon">Draft</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>Nothing is waiting for you.</Empty>
            )}
          </Section>
        </div>

        <div className="space-y-4">
          <Section
            title="Top customers"
            link={{label: 'All dues', to: '/branch-admin/customers'}}
          >
            <RankList
              rows={data?.topCustomers}
              empty="No named customers this month."
            />
          </Section>
          <Section
            title="Top suppliers"
            link={{label: 'Suppliers', to: '/branch-admin/suppliers'}}
          >
            <RankList
              rows={data?.topSuppliers}
              empty="No purchases this month."
            />
          </Section>
        </div>
      </div>
    </>
  );
};

export default BranchDashboard;
