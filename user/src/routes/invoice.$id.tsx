import {createFileRoute, Link} from '@tanstack/react-router';
import {ArrowLeft, Printer} from 'lucide-react';
import {useOrder, useOrderInvoice} from '@/lib/queries';
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

/**
 * A printable GST tax invoice. Everything on it comes from the server (P4-07):
 * the invoice number (the same one the shop's panel prints), the shop's GSTIN,
 * each line's HSN and rate, and CGST + SGST or IGST by place of supply.
 */
function InvoicePage() {
  const {id} = Route.useParams();
  const {data: o, isLoading, error} = useOrder(id);
  const ready = !!o?.can.invoice;
  const {data: inv, isLoading: invLoading, error: invError} = useOrderInvoice(id, ready);
  if (isLoading || (ready && invLoading)) return <Spinner />;
  if (error || !o) return <ErrorBox message="We could not find this order." />;
  if (!ready) return <ErrorBox message="The invoice is ready once the shop confirms your order." />;
  if (invError || !inv) return <ErrorBox message="We could not load the invoice. Please try again." />;

  const s = inv.seller;
  const b = inv.buyer;
  const gst = inv.taxBreakup;

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
            <p className="font-serif text-2xl text-brand">{s.name}</p>
            <p className="mt-1 text-ink-soft">
              {s.address}
              {s.address && <br />}
              {[s.city, s.state, s.postalCode].filter(Boolean).join(', ')}
            </p>
            <p className="mt-1">{s.gstin ? `GSTIN: ${s.gstin}` : 'GSTIN: not registered'}</p>
          </div>
          <div className="text-right">
            <h1 className="font-serif text-2xl">Tax invoice</h1>
            <dl className="mt-2 space-y-0.5 text-ink-soft">
              <div>
                Invoice no. <b className="text-ink">{inv.invoiceNumber}</b>
              </div>
              <div>Invoice date {shortDate(inv.invoiceDate)}</div>
              <div>Order {inv.orderNumber}</div>
              <div>Order date {shortDate(inv.orderDate)}</div>
            </dl>
          </div>
        </header>

        <section className="grid gap-4 border-b border-line py-5 sm:grid-cols-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Bill & ship to</p>
            <p className="mt-1 font-semibold">{b.name}</p>
            <p className="text-ink-soft">
              {[b.address1, b.address2].filter(Boolean).join(', ')}
              <br />
              {[b.city, b.state, b.postalCode].filter(Boolean).join(', ')}
              {b.phone && (
                <>
                  <br />
                  +91 {b.phone}
                </>
              )}
            </p>
          </div>
          <div className="sm:text-right">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Payment</p>
            <p className="mt-1">{inv.paymentMethod === 'COD' ? 'Cash on delivery' : 'Online (Razorpay)'}</p>
            <p className="text-ink-soft">{{PAID: 'Paid', PENDING: 'Due on delivery', FAILED: 'Not paid', REFUNDED: 'Refunded'}[inv.paymentStatus]}</p>
            <p className="mt-2 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">Place of supply</p>
            <p>
              {gst.placeOfSupply.name ?? b.state}
              {gst.placeOfSupply.code && ` (${gst.placeOfSupply.code})`}
            </p>
          </div>
        </section>

        <div className="overflow-x-auto">
          <table className="mt-4 w-full min-w-[600px] text-left">
            <thead className="border-b border-line text-[11px] uppercase tracking-wider text-ink-faint">
              <tr>
                <th className="py-2 font-semibold">Item</th>
                <th className="py-2 font-semibold">HSN</th>
                <th className="py-2 text-right font-semibold">Qty</th>
                <th className="py-2 text-right font-semibold">Taxable</th>
                <th className="py-2 text-right font-semibold">GST</th>
                <th className="py-2 text-right font-semibold">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {inv.lines.map((l) => (
                <tr key={l.id}>
                  <td className="py-2.5 pr-3">
                    {l.name}
                    <span className="block text-xs text-ink-faint">{[sizeText(l.size), l.color].filter(Boolean).join(' · ')}</span>
                  </td>
                  <td className="py-2.5">{l.hsnCode ?? '—'}</td>
                  <td className="py-2.5 text-right">{l.quantity}</td>
                  <td className="py-2.5 text-right">{inr(l.taxable)}</td>
                  <td className="py-2.5 text-right">
                    {inr(l.tax)}
                    <span className="block text-xs text-ink-faint">
                      {gst.interState ? `IGST ${l.taxRate}%` : `CGST+SGST ${l.taxRate / 2}%+${l.taxRate / 2}%`}
                    </span>
                  </td>
                  <td className="py-2.5 text-right">{inr(l.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <dl className="ml-auto mt-4 max-w-xs space-y-1 border-t border-line pt-3">
          <div className="flex justify-between">
            <dt className="text-ink-soft">Taxable value</dt>
            <dd>{inr(gst.taxable)}</dd>
          </div>
          {gst.interState ? (
            <div className="flex justify-between">
              <dt className="text-ink-soft">IGST</dt>
              <dd>{inr(gst.igst)}</dd>
            </div>
          ) : (
            <>
              <div className="flex justify-between">
                <dt className="text-ink-soft">CGST</dt>
                <dd>{inr(gst.cgst)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-ink-soft">SGST</dt>
                <dd>{inr(gst.sgst)}</dd>
              </div>
            </>
          )}
          {inv.couponDiscount > 0 && <p className="text-[11px] text-ink-faint">Coupon {inv.couponCode} ({inr(inv.couponDiscount)}) already taken off each line</p>}
          <div className="flex justify-between">
            <dt className="text-ink-soft">Delivery</dt>
            <dd>{inv.shippingFee ? inr(inv.shippingFee) : 'Free'}</dd>
          </div>
          <div className="flex justify-between border-t border-line pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{inr(inv.totalAmount)}</dd>
          </div>
        </dl>

        <footer className="mt-8 border-t border-line pt-4 text-xs text-ink-faint">
          This is a computer-generated invoice and needs no signature. Prices include GST. Returns and exchanges are accepted within the window shown on your order.
        </footer>
      </article>
    </div>
  );
}
