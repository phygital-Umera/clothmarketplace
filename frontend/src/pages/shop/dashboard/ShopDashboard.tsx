import BillDetailsModal from '@/components/Bills/BillDetailsModal';
import BillFormModal from '@/components/Bills/BillFormModal';
import {ExpenseModal, OpenCounterModal} from '@/components/Bills/CounterModals';
import PaymentStatusBadge from '@/components/Bills/PaymentStatusBadge';
import RecordPaymentModal from '@/components/Bills/RecordPaymentModal';
import SalesReturnModal from '@/components/Bills/SalesReturnModal';
import {StatCard} from '@/components/ui';
import {useShopDashboard} from '@/lib/react-query/queriesAndMutations/shopOps';
import {BillKind} from '@/types/bill';
import {ShopDashboard as Dashboard} from '@/types/shopOps';
import {getErrorMessage} from '@/utils/axios';
import {inr, inrShort} from '@/utils/money';
import {Link, useNavigate} from '@tanstack/react-router';
import {Plus} from 'lucide-react';
import {ReactNode, useEffect, useState} from 'react';

const PANEL = 'shop-admin';

/** 1:42 PM */
const time = (d: string) =>
  new Date(d).toLocaleTimeString('en-US', {hour: 'numeric', minute: '2-digit'});
/** 28 Oct */
const day = (d: string) =>
  new Date(d).toLocaleDateString('en-IN', {day: 'numeric', month: 'short'});
/** Tue, 3 Nov 2026 */
const today = () => {
  const d = new Date();
  const weekday = d.toLocaleDateString('en-IN', {weekday: 'short'});
  return `${weekday}, ${day(d.toISOString())} ${d.getFullYear()}`;
};

type Due = Dashboard['duesToCollect'][number];
type Payable = Dashboard['supplierPayments'][number];
type Paying = {kind: BillKind; party: string; bills: Due['bills']};

/** Panel with a serif title and an optional caps link on the right */
const Section = ({
  title,
  link,
  children,
  className = '',
}: {
  title: string;
  link?: ReactNode;
  children: ReactNode;
  className?: string;
}) => (
  <section className={`panel min-w-0 ${className}`}>
    <div className="flex items-center justify-between gap-3 border-b border-ivory-300 px-4 py-3">
      <h2 className="font-serif text-subheading text-espresso">{title}</h2>
      {link}
    </div>
    {children}
  </section>
);

const Empty = ({children}: {children: ReactNode}) => (
  <p className="px-4 py-6 text-center text-body-sm text-outline">{children}</p>
);

const capsLink =
  'text-label-caps uppercase text-burgundy hover:underline underline-offset-4';

const dueLine = (d: Due) => {
  if (d.overdueDays > 0)
    return `Overdue ${d.overdueDays} day${d.overdueDays > 1 ? 's' : ''}`;
  if (d.dueDate) return `Due ${day(d.dueDate)}`;
  const last = d.lastPayment ? ` · last paid ${inr(d.lastPayment.amount)}` : '';
  return `Since ${day(d.since)}${last}`;
};

const payableLine = (s: Payable) => {
  if (s.overdueDays > 0)
    return `Overdue ${s.overdueDays} day${s.overdueDays > 1 ? 's' : ''}`;
  if (s.dueDate) return `Due ${day(s.dueDate)}`;
  return `${s.bills.length} bill${s.bills.length > 1 ? 's' : ''}`;
};

/**
 * Shop admin home: today's counter at a glance. Every figure comes from
 * GET /shop-admin/dashboard and refreshes after any bill, return, payment,
 * expense or counter change.
 */
export default function ShopDashboard() {
  const navigate = useNavigate();
  const {data, isPending, isError, error} = useShopDashboard(PANEL);
  const [newBill, setNewBill] = useState<BillKind | null>(null);
  const [returning, setReturning] = useState(false);
  const [openingCounter, setOpeningCounter] = useState(false);
  const [addingExpense, setAddingExpense] = useState(false);
  const [viewing, setViewing] = useState<string | null>(null);
  const [paying, setPaying] = useState<Paying | null>(null);

  const modalOpen =
    !!newBill ||
    returning ||
    openingCounter ||
    addingExpense ||
    !!viewing ||
    !!paying;

  // F2 = new sales bill, as on the counter keyboard
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'F2' && !modalOpen) {
        e.preventDefault();
        navigate({to: '/shop-admin/new-bill'});
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [modalOpen]);

  const k = data?.kpis;
  const mixMax = Math.max(1, ...(data?.paymentMix ?? []).map((m) => m.amount));

  return (
    <div>
      {/* Heading + counter actions */}
      <header className="mb-5 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <p className="text-label-caps uppercase text-outline">
            Overview · {today()}
          </p>
          <h1 className="mt-2 font-serif text-headline-lg-mobile text-burgundy md:text-headline-md">
            {data?.shop.name ?? 'Dashboard'}
          </h1>
          {data && (
            <p className="mt-1 text-body-sm text-on-surface-variant">
              {data.counter ? (
                <>
                  Counter open since {time(data.counter.openedAt)} · opening
                  cash {inr(data.counter.openingCash)}
                </>
              ) : (
                <>
                  Counter not opened ·{' '}
                  <button
                    type="button"
                    className="text-burgundy underline underline-offset-4"
                    onClick={() => setOpeningCounter(true)}
                  >
                    Open counter
                  </button>
                </>
              )}
              {' · '}
              {data.staff.in} of {data.staff.total} staff in
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setNewBill('purchase')}
          >
            <Plus size={14} /> Purchase
          </button>
          <Link
            to="/shop-admin/sales-return"
            className="btn-ghost"
          >
            Return
          </Link>
          <button
            type="button"
            className="btn-primary"
            onClick={() => setNewBill('sales')}
          >
            <Plus size={14} /> New Bill
            <kbd className="ml-1 border border-ivory/40 px-1 font-sans text-[10px]">
              F2
            </kbd>
          </button>
        </div>
      </header>

      {isError && (
        <p role="alert" className="mb-4 text-body-sm text-error">
          {getErrorMessage(error, 'Dashboard figures could not be loaded.')}
        </p>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatCard
          label="Sales today"
          display={k && inr(k.salesToday)}
          sub={
            k && (
              <>
                {k.billsToday} bill{k.billsToday === 1 ? '' : 's'}
                {k.changePct !== null && (
                  <span
                    className={
                      k.changePct >= 0 ? 'text-emerald-700' : 'text-error'
                    }
                  >
                    {' '}
                    · {k.changePct >= 0 ? '▲' : '▼'} {Math.abs(k.changePct)}% vs
                    last{' '}
                    {new Date().toLocaleDateString('en-IN', {weekday: 'short'})}
                  </span>
                )}
              </>
            )
          }
        />
        <StatCard
          label="Cash in drawer"
          display={k ? (k.cash ? inr(k.cash.inDrawer) : '—') : undefined}
          sub={
            k && (
              <>
                {k.cash
                  ? `Opening ${inr(k.cash.openingCash)} + cash sales − refunds − expenses${
                      k.cash.supplierPayments ? ' − supplier cash' : ''
                    }`
                  : 'Counter not opened'}
                <button
                  type="button"
                  className="mt-1 block text-label-caps uppercase text-burgundy hover:underline"
                  onClick={() => setAddingExpense(true)}
                >
                  + Expense
                </button>
              </>
            )
          }
        />
        <StatCard
          label="Gross profit today"
          display={k && inr(k.grossProfit)}
          sub={
            k && (
              <>
                {k.marginPct !== null
                  ? `${k.marginPct}% margin`
                  : 'No sales yet'}
                {k.costMissingItems > 0 && (
                  <span title="Items never purchased are counted at zero cost">
                    {' '}
                    · {k.costMissingItems} item(s) without cost
                  </span>
                )}
              </>
            )
          }
        />
        <StatCard
          label="Sales this month"
          display={k && inr(k.salesThisMonth)}
          sub={k && `Since ${day(k.monthStart)}`}
        />
        <StatCard
          label="Customer dues"
          display={k && inr(k.customerDues)}
          sub={
            k && (
              <span className={k.customersOverdue ? 'text-error' : undefined}>
                {k.customersWithDues} customer
                {k.customersWithDues === 1 ? '' : 's'} · {k.customersOverdue}{' '}
                overdue
              </span>
            )
          }
        />
        <StatCard
          label="Supplier payable"
          display={k && inr(k.supplierPayable)}
          sub={
            k && (
              <span
                className={k.supplierBillsOverdue ? 'text-error' : undefined}
              >
                {k.supplierBillsOverdue} overdue
              </span>
            )
          }
        />
        <StatCard
          label="Stock value"
          display={k && inrShort(k.stockValue)}
          sub={k && `${k.stockPieces.toLocaleString('en-IN')} pcs at cost`}
        />
        <StatCard
          label="Low / out of stock"
          display={k && `${k.lowStock} / ${k.outOfStock}`}
          sub={
            k &&
            (k.lowStock + k.outOfStock > 0 ? (
              <Link
                to="/shop-admin/inventory"
                className="text-error hover:underline"
              >
                Reorder now
              </Link>
            ) : (
              'All stocked'
            ))
          }
        />
      </div>

      {/* Today's bills | payment mix + dues */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section
          title="Today's bills"
          className="lg:col-span-2"
          link={
            <Link to="/shop-admin/sales-bills" className={capsLink}>
              Sales register
            </Link>
          }
        >
          {isPending ? (
            <Empty>Loading…</Empty>
          ) : !data?.todaysBills.length ? (
            <Empty>No bills yet today. Press F2 to start a new bill.</Empty>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[620px] text-left text-body-sm">
                <thead className="bg-ivory-100 text-label-caps uppercase text-outline">
                  <tr>
                    <th className="px-4 py-2.5 font-semibold">Bill no.</th>
                    <th className="px-3 py-2.5 font-semibold">Time</th>
                    <th className="px-3 py-2.5 font-semibold">Customer</th>
                    <th className="px-3 py-2.5 font-semibold">Paid by</th>
                    <th className="px-3 py-2.5 text-right font-semibold">
                      Amount
                    </th>
                    <th className="px-4 py-2.5 font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-ivory-200">
                  {data.todaysBills.map((b) => (
                    <tr key={`${b.kind}-${b.id}`}>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          className="font-mono text-espresso underline underline-offset-2 hover:text-burgundy"
                          onClick={() =>
                            setViewing(
                              b.kind === 'BILL'
                                ? b.id
                                : (b.salesBillId ?? null),
                            )
                          }
                        >
                          {b.number}
                        </button>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5">
                        {time(b.at)}
                      </td>
                      <td className="px-3 py-2.5">{b.customer}</td>
                      <td className="px-3 py-2.5">{b.paidBy.join(' + ')}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-semibold">
                        {inr(b.amount)}
                      </td>
                      <td className="px-4 py-2.5">
                        <PaymentStatusBadge status={b.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        <div className="flex min-w-0 flex-col gap-4">
          <Section title="Payment mix today">
            <ul className="space-y-2.5 px-4 py-4">
              {(data?.paymentMix ?? []).map((m) => (
                <li
                  key={m.mode}
                  className="grid grid-cols-[3.5rem_1fr_auto] items-center gap-3 text-body-sm"
                >
                  <span>{m.label}</span>
                  <span className="h-2 bg-ivory-200" aria-hidden="true">
                    <span
                      className="block h-full bg-burgundy"
                      style={{width: `${(m.amount / mixMax) * 100}%`}}
                    />
                  </span>
                  <span className="text-right font-semibold">
                    {inr(m.amount)}
                  </span>
                </li>
              ))}
              {isPending && (
                <li className="text-body-sm text-outline">Loading…</li>
              )}
            </ul>
          </Section>

          <Section
            title="Dues to collect"
            link={
              <Link
                to="/shop-admin/sales-bills"
                search={{payment: 'DUE'} as never}
                className={capsLink}
              >
                Ledger
              </Link>
            }
          >
            {!data?.duesToCollect.length ? (
              <Empty>{isPending ? 'Loading…' : 'No customer dues.'}</Empty>
            ) : (
              <ul className="divide-y divide-ivory-200">
                {data.duesToCollect.map((d) => (
                  <li
                    key={`${d.name}-${d.phone}`}
                    className="flex items-center gap-3 px-4 py-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-body-sm text-espresso">
                        {d.name}
                      </p>
                      <p
                        className={`text-technical-data ${d.overdueDays ? 'text-error' : 'text-outline'}`}
                      >
                        {dueLine(d)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-body-sm font-semibold">
                        {inr(d.outstanding)}
                      </p>
                      <button
                        type="button"
                        className="text-label-caps uppercase text-burgundy hover:underline"
                        onClick={() =>
                          setPaying({
                            kind: 'sales',
                            party: d.name,
                            bills: d.bills,
                          })
                        }
                      >
                        Collect
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>
      </div>

      {/* Low stock | supplier payments */}
      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Section
          title="Low stock — reorder"
          className="lg:col-span-2"
          link={
            <button
              type="button"
              className={capsLink}
              onClick={() => setNewBill('purchase')}
            >
              Make purchase
            </button>
          }
        >
          {!data?.lowStock.length ? (
            <Empty>{isPending ? 'Loading…' : 'Nothing is running low.'}</Empty>
          ) : (
            <ul className="divide-y divide-ivory-200">
              {data.lowStock.map((s) => (
                <li
                  key={s.variantId}
                  className="flex items-center gap-3 px-4 py-2.5"
                >
                  {s.colorHex && (
                    <span
                      className="h-3 w-3 shrink-0 rounded-full border border-black/20"
                      style={{backgroundColor: s.colorHex}}
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm text-espresso">
                      {s.productName}
                    </p>
                    <p className="text-technical-data text-outline">
                      {s.color} / Size {s.size} ·{' '}
                      <span className="font-mono">{s.variantSku}</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-body-sm font-semibold ${
                        s.status === 'OUT_OF_STOCK'
                          ? 'text-error'
                          : 'text-espresso'
                      }`}
                    >
                      {s.status === 'OUT_OF_STOCK'
                        ? 'Out of stock'
                        : `${s.available} left`}
                    </p>
                    <p className="text-technical-data text-outline">
                      Reorder at {s.threshold}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section
          title="Supplier payments due"
          link={
            <Link
              to="/shop-admin/purchase-bills"
              search={{payment: 'DUE'} as never}
              className={capsLink}
            >
              Suppliers
            </Link>
          }
        >
          {!data?.supplierPayments.length ? (
            <Empty>
              {isPending ? 'Loading…' : 'Nothing due to suppliers.'}
            </Empty>
          ) : (
            <ul className="divide-y divide-ivory-200">
              {data.supplierPayments.map((s) => (
                <li
                  key={`${s.name}-${s.phone}`}
                  className="flex items-center gap-3 px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-body-sm text-espresso">
                      {s.name}
                    </p>
                    <p
                      className={`text-technical-data ${s.overdueDays ? 'text-error' : 'text-outline'}`}
                    >
                      {payableLine(s)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-body-sm font-semibold">
                      {inr(s.outstanding)}
                    </p>
                    <button
                      type="button"
                      className="text-label-caps uppercase text-burgundy hover:underline"
                      onClick={() =>
                        setPaying({
                          kind: 'purchase',
                          party: s.name,
                          bills: s.bills,
                        })
                      }
                    >
                      Pay
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      {newBill && (
        <BillFormModal
          panel={PANEL}
          kind={newBill}
          onClose={() => setNewBill(null)}
        />
      )}
      {returning && (
        <SalesReturnModal panel={PANEL} onClose={() => setReturning(false)} />
      )}
      {openingCounter && (
        <OpenCounterModal
          panel={PANEL}
          onClose={() => setOpeningCounter(false)}
        />
      )}
      {addingExpense && (
        <ExpenseModal panel={PANEL} onClose={() => setAddingExpense(false)} />
      )}
      {viewing && (
        <BillDetailsModal
          panel={PANEL}
          kind="sales"
          billId={viewing}
          onClose={() => setViewing(null)}
        />
      )}
      {paying && (
        <RecordPaymentModal
          panel={PANEL}
          kind={paying.kind}
          party={paying.party}
          bills={paying.bills}
          onClose={() => setPaying(null)}
        />
      )}
    </div>
  );
}
