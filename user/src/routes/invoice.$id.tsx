import {createFileRoute, Link} from '@tanstack/react-router';
import {ArrowLeft, Printer} from 'lucide-react';
import {useOrder} from '@/lib/queries';
import {inr, shortDate, sizeText} from '@/lib/format';
import {RequireAuth} from '@/components/checkout';
import {btn, ErrorBox, Spinner} from '@/components/ui';

export const Route = createFileRoute('/invoice/$id')({
  component: () => (
    <RequireAuth>
      <InvoicePage />
    </RequireAuth>
  ),
});

const r2 = (n: number) => Math.round(n * 100) / 100;

/** A printable tax invoice. Prices on the store include GST, so tax is worked back out of each line. */
function InvoicePage() {
  const {id} = Route.useParams();
  const {data: o, isLoading, error} = useOrder(id);
  if (isLoading) return <Spinner />;
  if (error || !o) return <ErrorBox message="We could not find this order." />;
  if (!o.can.invoice) return <ErrorBox message="The invoice is ready once the shop confirms your order." />;

  // Coupon is shared across lines by value, the same way refunds are worked out
  const share = o.subtotal > 0 ? (o.subtotal - o.couponDiscount) / o.subtotal : 1;
  const lines = o.items.map((i) => {
    const gross = r2(i.totalPrice * share);
    const taxable = r2(gross / (1 + i.taxRate / 100));
    return {...i, gross, taxable, tax: r2(gross - taxable)};
  });
  const sameState = (o.shippingAddress.state ?? '').toLowerCase() === (o.seller.state ?? '').toLowerCase();
  const sum = (k: 'taxable' | 'tax' | 'gross') => r2(lines.reduce((n, l) => n + l[k], 0));
  const a = o.shippingAddress;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex items-center justify-between print:hidden">
        <Link to="/account/order/$id" params={{id: o.id}} className="inline-flex items-center gap-1 py-2 text-sm text-ink-soft hover:text-brand">
          <ArrowLeft size={15} /> Back to order
        </Link>
        <button onClick={() => window.print()} className={btn.primary}>
          <Printer size={14} /> Print / save as PDF
        </button>
      </div>

      <article className="rounded-lg border border-line bg-white p-6 text-sm sm:p-10 print:border-0 print:p-0">
        <header className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
          <div>
            <p className="font-serif text-2xl text-brand">Cloth Pro</p>
            <p className="mt-2 font-semibold">{o.shop?.name ?? o.seller.name}</p>
            <p className="text-ink-soft">
              {o.seller.name}
              <br />
              {o.shop?.address || o.seller.address}, {o.seller.city}, {o.seller.state} {o.seller.postalCode}
            </p>
            {o.shop?.gstin && <p className="mt-1">GSTIN: {o.shop.gstin}</p>}
          </div>
          <div className="text-right">
            <h1 className="font-serif text-2xl">Tax invoice</h1>
            <dl className="mt-2 space-y-0.5 text-ink-soft">
              <div>
                Invoice no. <b className="text-ink">INV-{o.orderNumber.replace(/^ORD-/, '')}</b>
              </div>
              <div>Order {o.orderNumber}</div>
              <div>Order date {shortDate(o.createdAt)}</div>
              {o.deliveredAt && <div>Delivered {shortDate(o.deliveredAt)}</div>}
            </dl>
          </div>
        </header>

        <section className="grid gap-4 border-b border-line py-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Bill & ship to</p>
            <p className="mt-1 font-semibold">{a.recipient}</p>
            <p className="text-ink-soft">
              {a.address1}
              {a.address2 ? `, ${a.address2}` : ''}
              <br />
              {a.city}, {a.state} {a.postalCode}
              <br />
              +91 {a.phone}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Payment</p>
            <p className="mt-1">{o.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online (Razorpay)'}</p>
            <p className="text-ink-soft">{{PAID: 'Paid', PENDING: 'Due on delivery', FAILED: 'Not paid', REFUNDED: 'Refunded'}[o.paymentStatus]}</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Place of supply</p>
            <p>{a.state}</p>
          </div>
        </section>

        <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[560px] text-left">
            <thead className="border-b border-line text-[11px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="py-2 font-semibold">Item</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Taxable</th>
                <th className="py-2 text-right font-semibold">GST</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 pr-3">
                    {l.name}
                    <span className="block text-xs text-ink-faint">{[sizeText(l.size), l.color].filter(Boolean).join(' · ')}</span>
                  </td>
                  <td className="py-2.5 text-right">{l.quantity}</td>
                  <td className="py-2.5 text-right">{inr(l.taxable)}</td>
                  <td className="py-2.5 text-right">
                    {inr(l.tax)}
                    <span className="block text-xs text-ink-faint">{sameState ? `CGST+SGST ${l.taxRate / 2}%+${l.taxRate / 2}%` : `IGST ${l.taxRate}%`}</span>
                  </td>
                  <td className="py-2.5 text-right">{inr(l.gross)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-4 max-w-xs space-y-1 border-t border-line pt-3">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Taxable value</dt>
            <dd>{inr(sum('taxable'))}</dd>
          </div>
          {sameState ? (
            <>
              <div className="flex justify-between">
                <dt className="text-ink-soft">CGST</dt>
                <dd>{inr(r2(sum('tax') / 2))}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">SGST</dt>
                <dd>{inr(r2(sum('tax') - r2(sum('tax') / 2)))}</dd>
              </div>
            </>
          ) : (
            <div className="flex justify-between">
              <dt className="text-ink-soft">IGST</dt>
              <dd>{inr(sum('tax'))}</dd>
            </div>
          )}
          {o.couponDiscount > 0 && <p className="text-[11px] text-ink-faint">Coupon {o.couponCode} ({inr(o.couponDiscount)}) already taken off each line</p>}
          <div className="flex justify-between">
            <dt className="text-ink-soft">Delivery</dt>
            <dd>{o.shippingFee ? inr(o.shippingFee) : 'Free'}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{inr(o.totalAmount)}</dd>
          </div>
        </dl>

        <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-faint">
          This is a computer-generated invoice and needs no signature. Returns and exchanges are accepted within the window shown on your order.
        </footer>
      </article>
    </div>
  );
}
