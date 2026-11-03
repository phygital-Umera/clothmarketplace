import {useValidateCoupon} from '@/lib/react-query/queriesAndMutations/promotion';
import {ValidateCouponResult} from '@/types/promotion';
import {CheckCircle2, DollarSign, Percent, Sparkles, Tag, X} from 'lucide-react';
import React, {useState} from 'react';

interface Props {
  isOpen: boolean;
  panel: string;
  initialCode?: string;
  onClose: () => void;
}

export default function CouponValidateModal({isOpen, panel, initialCode = '', onClose}: Props) {
  const [code, setCode] = useState(initialCode);
  const [subtotal, setSubtotal] = useState<number>(1500);
  const [result, setResult] = useState<ValidateCouponResult | null>(null);

  const validateMutation = useValidateCoupon(panel);

  if (!isOpen) return null;

  const handleTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;

    try {
      const res: any = await validateMutation.mutateAsync({
        code: code.trim().toUpperCase(),
        subtotal: Number(subtotal) || 0,
      });
      setResult(res?.data);
    } catch {
      setResult(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-3 sm:p-5 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-md rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ivory-200 px-5 py-4 bg-ivory-50/60">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-burgundy/10 text-burgundy">
              <Sparkles size={18} />
            </span>
            <div>
              <h3 className="font-serif text-headline-sm text-espresso">Test Coupon Discount</h3>
              <p className="text-xs text-outline">Simulate checkout discount calculation live</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-outline hover:bg-ivory-200 hover:text-espresso"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleTest} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-espresso block mb-1">Coupon Code</label>
            <input
              type="text"
              required
              placeholder="e.g. SUMMER25"
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setResult(null);
              }}
              className="w-full font-mono text-body-md font-bold uppercase rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-espresso block mb-1">
              Simulated Order Subtotal (₹)
            </label>
            <input
              type="number"
              min="0"
              required
              placeholder="1500"
              value={subtotal}
              onChange={(e) => {
                setSubtotal(Number(e.target.value));
                setResult(null);
              }}
              className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={validateMutation.isPending}
            className="w-full rounded-lg bg-burgundy py-2 text-body-sm font-semibold text-white shadow-sm hover:bg-burgundy/90 disabled:opacity-50 transition"
          >
            {validateMutation.isPending ? 'Validating...' : 'Calculate Discount'}
          </button>

          {/* Result Card */}
          {result && (
            <div className="rounded-xl border border-emerald-300 bg-emerald-50/50 p-4 space-y-2.5 animate-in fade-in">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800">
                <CheckCircle2 size={15} /> Coupon Applied Successfully!
              </div>

              <div className="divide-y divide-emerald-200/60 text-xs">
                <div className="flex justify-between py-1.5 text-espresso">
                  <span>Order Subtotal:</span>
                  <span className="font-semibold">₹{result.subtotal}</span>
                </div>
                <div className="flex justify-between py-1.5 text-emerald-700 font-semibold">
                  <span>
                    Discount ({result.coupon.type === 'PERCENTAGE' ? `${result.coupon.discountValue}%` : 'Flat'}):
                  </span>
                  <span>- ₹{result.discountAmount}</span>
                </div>
                <div className="flex justify-between py-2 text-body-sm font-bold text-espresso">
                  <span>Payable Total:</span>
                  <span className="text-burgundy font-serif text-base">₹{result.finalAmount}</span>
                </div>
              </div>

              <p className="text-[11px] text-emerald-800 font-medium pt-1 text-center">
                {result.message}
              </p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}

