import {useUpdateThreshold} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {Sliders, X} from 'lucide-react';
import {useState} from 'react';

export interface ThresholdTarget {
  variantId: string;
  productName: string;
  size: string;
  color: string;
  currentThreshold: number;
  branchId?: string;
}

interface Props {
  target: ThresholdTarget | null;
  panel: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function ThresholdModal({target, panel, onClose, onSuccess}: Props) {
  const [threshold, setThreshold] = useState<number>(target?.currentThreshold ?? 5);
  const updateThresholdMutation = useUpdateThreshold(panel);

  if (!target) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (threshold < 0) return;

    try {
      await updateThresholdMutation.mutateAsync({
        variantId: target.variantId,
        threshold: Number(threshold),
        branchId: target.branchId,
      });
      onClose();
      onSuccess?.();
    } catch {
      // Handled by toast
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-4 backdrop-blur-sm">
      <div className="relative w-full max-w-sm rounded-xl border border-ivory-300 bg-white p-6 shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 text-outline hover:text-espresso"
          aria-label="Close"
        >
          <X size={18} />
        </button>

        <div className="flex items-center gap-2 text-burgundy">
          <Sliders size={20} />
          <h3 className="font-serif text-headline-sm">Low-Stock Alert Level</h3>
        </div>
        <p className="mt-1 text-body-sm text-outline">
          {target.productName} ({target.size} / {target.color})
        </p>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="text-label-caps block text-espresso mb-1">
              Alert Threshold (Units)
            </label>
            <input
              type="number"
              min="0"
              required
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-full rounded-lg border border-ivory-300 bg-white p-2.5 text-body-md focus:border-burgundy focus:outline-none"
            />
            <p className="mt-1 text-xs text-outline">
              A warning badge is triggered when available stock drops to or below this number. Default is 5.
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2.5 pt-2 border-t border-ivory-200">
            <button
              type="button"
              onClick={onClose}
              className="btn-ghost"
              disabled={updateThresholdMutation.isPending}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={updateThresholdMutation.isPending}
              className="btn-primary"
            >
              {updateThresholdMutation.isPending ? 'Saving...' : 'Save Threshold'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

