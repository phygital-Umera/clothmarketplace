import {useState} from 'react';
import {useCreateStockTransfer} from '@/lib/react-query/queriesAndMutations/stockTransfer';
import {Plus, Trash2} from 'lucide-react';
import toast from 'react-hot-toast';

type TransferItem = {
  id: string;
  productVariant: string;
  sku: string;
  availableAtSource: number;
  qtyToSend: number;
};

export default function BranchNewTransferPage({onClose}: {onClose?: () => void}) {
  const createTransferMutation = useCreateStockTransfer();

  const [transferType, setTransferType] = useState<
    'Between my shops' | 'Request from another branch' | 'Send to another branch'
  >('Between my shops');

  const [fromSource, setFromSource] = useState("Men's Wear — MAT-B02-S01");
  const [toDestination, setToDestination] = useState("Women's Wear — MAT-B02-S02");
  const [dispatchDate, setDispatchDate] = useState('2026-11-04');
  const [priority, setPriority] = useState('Normal');

  const [items, setItems] = useState<TransferItem[]>([
    {
      id: 'ti-1',
      productVariant: 'Printed Cotton Shirt\nM / White',
      sku: 'PRD0093-WHI-M',
      availableAtSource: 34,
      qtyToSend: 6,
    },
    {
      id: 'ti-2',
      productVariant: 'Slim Fit Denim\n32 / Blue',
      sku: 'PRD0088-BLU-32',
      availableAtSource: 11,
      qtyToSend: 4,
    },
    {
      id: 'ti-3',
      productVariant: 'Linen Shirt\nL / Sky',
      sku: 'PRD0095-SKY-L',
      availableAtSource: 9,
      qtyToSend: 2,
    },
  ]);

  const [searchItem, setSearchItem] = useState('');
  const [reason, setReason] = useState('Low stock at destination');
  const [noteForReceiver, setNoteForReceiver] = useState('');

  const totalUnits = items.reduce((sum, i) => sum + (Number(i.qtyToSend) || 0), 0);

  const updateQty = (id: string, qty: number) => {
    setItems((prev) =>
      prev.map((i) =>
        i.id === id ? {...i, qtyToSend: Math.max(0, Math.min(i.availableAtSource, qty))} : i,
      ),
    );
  };

  const removeItem = (id: string) => {
    if (items.length <= 1) {
      toast.error('Transfer must include at least one item');
      return;
    }
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const handleAddItem = () => {
    if (!searchItem.trim()) return;
    const newItem: TransferItem = {
      id: `ti-${Date.now()}`,
      productVariant: searchItem.trim(),
      sku: `PRD-${Date.now().toString().slice(-4)}`,
      availableAtSource: 20,
      qtyToSend: 5,
    };
    setItems((prev) => [...prev, newItem]);
    setSearchItem('');
    toast.success(`Added ${newItem.productVariant}`);
  };

  const handleSubmit = async (status: 'DRAFT' | 'APPROVED') => {
    if (fromSource === toDestination) {
      toast.error('Destination must differ from source');
      return;
    }

    const typeCode =
      transferType === 'Between my shops'
        ? 'BETWEEN_MY_SHOPS'
        : transferType === 'Request from another branch'
        ? 'REQUEST_FROM_ANOTHER_BRANCH'
        : 'SEND_TO_ANOTHER_BRANCH';

    await createTransferMutation.mutateAsync({
      transferType: typeCode,
      fromSource,
      toDestination,
      dispatchDate,
      priority,
      items,
      reason,
      noteForReceiver,
      status,
    });

    if (onClose) onClose();
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div>
        <p className="text-label-caps uppercase text-ivory-600 tracking-wider">
          Stock Transfers / New
        </p>
        <h1 className="font-serif text-headline-md font-normal text-burgundy-deep">
          New stock transfer
        </h1>
        <p className="mt-1 text-body-sm text-espresso-muted">TRF-0219 · Draft</p>
      </div>

      {/* Section 1: Route */}
      <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-serif text-title-lg font-normal text-burgundy-deep border-b border-ivory-200 pb-2">
          Route
        </h2>

        {/* Transfer Type Radios */}
        <div>
          <label className="block text-label-caps uppercase text-ivory-600 mb-2">
            Transfer Type <span className="text-error">*</span>
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              {
                id: 'Between my shops',
                sub: 'Approved by you',
              },
              {
                id: 'Request from another branch',
                sub: 'Approved by that branch',
              },
              {
                id: 'Send to another branch',
                sub: 'Company Admin notified',
              },
            ].map((t) => (
              <label
                key={t.id}
                className={`flex cursor-pointer flex-col rounded-lg border p-3.5 transition-colors ${
                  transferType === t.id
                    ? 'border-burgundy bg-[#FDF4F4]'
                    : 'border-ivory-300 bg-white hover:bg-ivory-50/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="transferType"
                    checked={transferType === t.id}
                    onChange={() => setTransferType(t.id as any)}
                    className="h-4 w-4 accent-burgundy"
                  />
                  <span className="font-medium text-espresso text-body-sm">{t.id}</span>
                </div>
                <span className="mt-1 pl-6 text-[11px] text-espresso-muted">{t.sub}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Source, Destination, Date, Priority */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 pt-2">
          <div>
            <label className="block text-label-caps uppercase text-ivory-600">
              From (Source) <span className="text-error">*</span>
            </label>
            <select
              value={fromSource}
              onChange={(e) => setFromSource(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            >
              <option value="Men's Wear — MAT-B02-S01">Men's Wear — MAT-B02-S01</option>
              <option value="Women's Wear — MAT-B02-S02">Women's Wear — MAT-B02-S02</option>
              <option value="Kids Wear — MAT-B02-S03">Kids Wear — MAT-B02-S03</option>
              <option value="Branch store room">Branch store room</option>
            </select>
          </div>

          <div>
            <label className="block text-label-caps uppercase text-ivory-600">
              To (Destination) <span className="text-error">*</span>
            </label>
            <select
              value={toDestination}
              onChange={(e) => setToDestination(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            >
              <option value="Women's Wear — MAT-B02-S02">Women's Wear — MAT-B02-S02</option>
              <option value="Men's Wear — MAT-B02-S01">Men's Wear — MAT-B02-S01</option>
              <option value="Kids Wear — MAT-B02-S03">Kids Wear — MAT-B02-S03</option>
              <option value="Branch store room">Branch store room</option>
            </select>
            <p className="mt-1 text-[11px] text-espresso-muted">Must differ from source</p>
          </div>

          <div>
            <label className="block text-label-caps uppercase text-ivory-600">
              Dispatch Date
            </label>
            <input
              type="date"
              value={dispatchDate}
              onChange={(e) => setDispatchDate(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-label-caps uppercase text-ivory-600">Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            >
              <option value="Normal">Normal</option>
              <option value="Urgent">Urgent</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </div>
      </div>

      {/* Section 2: Items */}
      <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm space-y-4">
        <div>
          <h2 className="font-serif text-title-lg font-normal text-burgundy-deep">Items</h2>
          <p className="text-body-sm text-espresso-muted">
            Only stock available at the source can be sent
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-body-sm">
            <thead>
              <tr className="border-b border-ivory-300 text-label-caps uppercase text-ivory-600">
                <th className="py-2.5 pl-3 pr-2 font-medium">Product / Variant</th>
                <th className="px-2 py-2.5 font-medium">SKU</th>
                <th className="px-2 py-2.5 text-center font-medium">Available at Source</th>
                <th className="px-2 py-2.5 text-center font-medium">Qty to Send</th>
                <th className="py-2.5 pr-3 text-center font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-ivory-100">
              {items.map((i) => (
                <tr key={i.id} className="align-middle">
                  <td className="py-3 pl-3 pr-2">
                    <p className="font-medium text-espresso whitespace-pre-line">
                      {i.productVariant}
                    </p>
                  </td>
                  <td className="px-2 py-3 font-mono text-xs text-espresso-muted">{i.sku}</td>
                  <td className="px-2 py-3 text-center font-medium text-espresso">
                    {i.availableAtSource}
                  </td>
                  <td className="px-2 py-3 text-center">
                    <input
                      type="number"
                      value={i.qtyToSend}
                      onChange={(e) => updateQty(i.id, parseInt(e.target.value) || 0)}
                      className="w-16 rounded border border-ivory-300 bg-ivory-50/50 py-1 text-center text-xs font-semibold text-espresso focus:border-burgundy focus:outline-none"
                    />
                  </td>
                  <td className="py-3 pr-3 text-center">
                    <button
                      type="button"
                      onClick={() => removeItem(i.id)}
                      className="text-ivory-600 hover:text-error transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Scan / Search input */}
        <div className="flex gap-2 pt-1">
          <input
            type="text"
            value={searchItem}
            onChange={(e) => setSearchItem(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddItem()}
            placeholder="Scan barcode or search product to add..."
            className="flex-1 rounded border border-ivory-300 bg-ivory-50/40 px-3 py-2 text-body-sm text-espresso placeholder-espresso-muted/60 focus:border-burgundy focus:outline-none"
          />
          <button
            type="button"
            onClick={handleAddItem}
            className="btn-outline flex items-center gap-1.5 border-burgundy/40 text-burgundy hover:bg-burgundy/5"
          >
            <Plus size={15} />
            <span>Add</span>
          </button>
        </div>

        <div className="flex justify-end border-t border-ivory-200 pt-3 text-body-sm text-espresso font-medium">
          {items.length} lines · {totalUnits} units
        </div>
      </div>

      {/* Section 3: Notes */}
      <div className="rounded-lg border border-ivory-300 bg-white p-5 shadow-sm space-y-4">
        <h2 className="font-serif text-title-lg font-normal text-burgundy-deep border-b border-ivory-200 pb-2">
          Notes
        </h2>

        <div className="space-y-4 text-body-sm">
          <div>
            <label className="block text-label-caps uppercase text-ivory-600">
              Reason <span className="text-error">*</span>
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 px-3 py-2 text-espresso focus:border-burgundy focus:outline-none"
            >
              <option value="Low stock at destination">Low stock at destination</option>
              <option value="Customer order request">Customer order request</option>
              <option value="Seasonal rebalancing">Seasonal rebalancing</option>
            </select>
          </div>

          <div>
            <label className="block text-label-caps uppercase text-ivory-600">
              Note for Receiver
            </label>
            <textarea
              rows={2}
              value={noteForReceiver}
              onChange={(e) => setNoteForReceiver(e.target.value)}
              className="mt-1 w-full rounded border border-ivory-300 bg-ivory-50/50 p-2.5 text-espresso focus:border-burgundy focus:outline-none resize-none"
            />
          </div>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="space-y-3">
        <p className="text-body-sm text-espresso-muted">
          Stock moves to "in transit" on dispatch and to the destination only after receipt is confirmed.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="btn-outline border-ivory-400 text-espresso hover:bg-ivory-100"
            >
              CANCEL
            </button>
          )}
          <button
            type="button"
            onClick={() => handleSubmit('DRAFT')}
            disabled={createTransferMutation.isPending}
            className="btn-outline border-burgundy/30 text-burgundy hover:bg-burgundy/5"
          >
            SAVE DRAFT
          </button>
          <button
            type="button"
            onClick={() => handleSubmit('APPROVED')}
            disabled={createTransferMutation.isPending}
            className="btn-primary bg-burgundy hover:bg-burgundy-deep text-white shadow-sm"
          >
            APPROVE & DISPATCH
          </button>
        </div>
      </div>
    </div>
  );
}

