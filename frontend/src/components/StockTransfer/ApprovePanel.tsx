import {useEffect, useState} from 'react';
import {
  useDecideTransfer,
  useTransferSources,
} from '@/lib/react-query/queriesAndMutations/stockTransfer';
import {StockTransfer} from '@/types/stockTransfer';
import {getErrorMessage} from '@/utils/axios';

/**
 * Approve (pick the source shop and quantities) or reject a shop's request.
 * The branch admin uses it; so does the owner in shop mode (`panel="shop-admin"`).
 */
export function ApprovePanel({
  t,
  panel = 'branch-admin',
}: {
  t: StockTransfer;
  panel?: string;
}) {
  const {data: sources, isLoading} = useTransferSources(t.id, panel);
  const decide = useDecideTransfer(panel);
  const [fromShopId, setFromShopId] = useState(t.fromShop?.id ?? '');
  const [qty, setQty] = useState<Record<string, string>>({});
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');

  // Default source: the requested shop, else the shop holding the most units
  useEffect(() => {
    if (!sources?.length || fromShopId) return;
    const best = [...sources].sort(
      (a, b) =>
        b.items.reduce((s, i) => s + i.available, 0) -
        a.items.reduce((s, i) => s + i.available, 0),
    )[0];
    if (best) setFromShopId(best.id);
  }, [sources, fromShopId]);

  const source = sources?.find((s) => s.id === fromShopId);
  useEffect(() => {
    if (!source) return;
    setQty(
      Object.fromEntries(
        t.items.map((i) => {
          const opt = source.items.find((o) => o.itemId === i.id);
          return [
            i.id,
            String(
              Math.min(i.requestedQty, opt?.variantId ? opt.available : 0),
            ),
          ];
        }),
      ),
    );
  }, [source, t.items]);

  const approve = () => {
    setError('');
    if (!fromShopId)
      return setError('Choose the shop that will send the stock.');
    const items = t.items.map((i) => ({
      itemId: i.id,
      approvedQty: Number(qty[i.id]) || 0,
    }));
    if (!items.some((i) => i.approvedQty > 0))
      return setError('Approve at least one unit, or reject.');
    decide.mutate(
      {id: t.id, data: {decision: 'APPROVE', fromShopId, items}},
      {onError: (err) => setError(getErrorMessage(err, 'Could not approve'))},
    );
  };
  const reject = () => {
    setError('');
    if (reason.trim().length < 3)
      return setError('Give a reason for rejecting.');
    decide.mutate(
      {id: t.id, data: {decision: 'REJECT', reason: reason.trim()}},
      {onError: (err) => setError(getErrorMessage(err, 'Could not reject'))},
    );
  };

  return (
    <div className="space-y-4">
      <div>
        <label htmlFor={`src-shop-${t.id}`} className="field-label">
          Send from
        </label>
        <select
          id={`src-shop-${t.id}`}
          className="field-input"
          value={fromShopId}
          disabled={isLoading}
          onChange={(e) => setFromShopId(e.target.value)}
        >
          <option value="">
            {isLoading ? 'Loading shops…' : 'Choose a shop'}
          </option>
          {sources?.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name} ({s.items.reduce((sum, i) => sum + i.available, 0)}{' '}
              available)
            </option>
          ))}
        </select>
      </div>
      <table className="w-full text-body-sm">
        <thead>
          <tr className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
            <th scope="col" className="py-1.5 text-left">
              Item
            </th>
            <th scope="col" className="py-1.5 text-right">
              Asked
            </th>
            <th scope="col" className="py-1.5 text-right">
              Has
            </th>
            <th scope="col" className="py-1.5 text-right">
              Approve
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-ivory-200">
          {t.items.map((i) => {
            const opt = source?.items.find((o) => o.itemId === i.id);
            return (
              <tr key={i.id}>
                <td className="py-2 pr-2">
                  {i.productName}
                  <span className="block text-[11px] text-outline">
                    {i.size} · {i.color}
                  </span>
                </td>
                <td className="py-2 text-right">{i.requestedQty}</td>
                <td
                  className={`py-2 text-right ${opt?.variantId ? '' : 'text-outline'}`}
                >
                  {source ? (opt?.variantId ? opt.available : 'n/a') : '—'}
                </td>
                <td className="py-2 text-right">
                  <input
                    aria-label={`Approved quantity of ${i.productName}`}
                    inputMode="numeric"
                    disabled={!opt?.variantId}
                    className="w-14 border border-ivory-300 bg-ivory-100 px-2 py-1 text-right focus:border-burgundy focus:outline-none disabled:opacity-50"
                    value={qty[i.id] ?? ''}
                    onChange={(e) =>
                      setQty((q) => ({
                        ...q,
                        [i.id]: e.target.value.replace(/\D/g, ''),
                      }))
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {rejecting && (
        <div>
          <label htmlFor={`rej-reason-${t.id}`} className="field-label">
            Reason for rejecting
          </label>
          <textarea
            id={`rej-reason-${t.id}`}
            rows={2}
            maxLength={300}
            className="field-input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </div>
      )}
      {error && (
        <p role="alert" className="field-error">
          {error}
        </p>
      )}
      <div className="flex gap-2">
        {rejecting ? (
          <>
            <button
              type="button"
              className="btn-ghost flex-1 px-3 py-2"
              onClick={() => setRejecting(false)}
            >
              Back
            </button>
            <button
              type="button"
              className="btn-primary flex-1 px-3 py-2"
              disabled={decide.isPending}
              onClick={reject}
            >
              Reject
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="btn-ghost flex-1 px-3 py-2"
              onClick={() => setRejecting(true)}
            >
              Reject
            </button>
            <button
              type="button"
              className="btn-primary flex-1 px-3 py-2"
              disabled={decide.isPending}
              onClick={approve}
            >
              {decide.isPending ? 'Saving…' : 'Approve'}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
