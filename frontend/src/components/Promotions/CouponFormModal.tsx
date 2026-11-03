import {
  useCreateCoupon,
  useUpdateCoupon,
} from '@/lib/react-query/queriesAndMutations/promotion';
import {Coupon, OfferType} from '@/types/promotion';
import {
  Image as ImageIcon,
  Percent,
  RefreshCw,
  TicketPercent,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  coupon?: Coupon | null;
  panel: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function CouponFormModal({isOpen, coupon, panel, onClose, onSuccess}: Props) {
  const isEditing = Boolean(coupon);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<OfferType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [minPurchaseAmount, setMinPurchaseAmount] = useState<number | ''>(0);
  const [maxDiscountLimit, setMaxDiscountLimit] = useState<number | ''>('');
  const [usageLimit, setUsageLimit] = useState<number | ''>('');
  const [perCustomerLimit, setPerCustomerLimit] = useState<number>(1);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Creative image banner state
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);

  // Mutations
  const createMutation = useCreateCoupon(panel);
  const updateMutation = useUpdateCoupon(panel);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (coupon) {
      setCode(coupon.code || '');
      setName(coupon.name || '');
      setDescription(coupon.description || '');
      setType(coupon.type || 'PERCENTAGE');
      setDiscountValue(coupon.discountValue ?? '');
      setMinPurchaseAmount(coupon.minPurchaseAmount ?? 0);
      setMaxDiscountLimit(coupon.maxDiscountLimit ?? '');
      setUsageLimit(coupon.usageLimit ?? '');
      setPerCustomerLimit(coupon.perCustomerLimit ?? 1);
      setIsActive(coupon.isActive ?? true);

      setBannerPreview(coupon.bannerUrl || null);
      setBannerFile(null);
      setRemoveBanner(false);

      try {
        setStartDate(new Date(coupon.startDate).toISOString().slice(0, 16));
        setEndDate(new Date(coupon.endDate).toISOString().slice(0, 16));
      } catch {
        setStartDate('');
        setEndDate('');
      }
    } else {
      setCode('');
      setName('');
      setDescription('');
      setType('PERCENTAGE');
      setDiscountValue(15);
      setMinPurchaseAmount(0);
      setMaxDiscountLimit('');
      setUsageLimit('');
      setPerCustomerLimit(1);
      setIsActive(true);
      setBannerFile(null);
      setBannerPreview(null);
      setRemoveBanner(false);

      const now = new Date();
      const inOneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      setStartDate(now.toISOString().slice(0, 16));
      setEndDate(inOneMonth.toISOString().slice(0, 16));
    }
  }, [coupon, isOpen]);

  if (!isOpen) return null;

  // Generate random promo code helper
  const generateRandomCode = () => {
    const prefixes = ['SAVE', 'FESTIVE', 'SPECIAL', 'FLASH', 'LUXE', 'VIP'];
    const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
    const val = discountValue || (type === 'PERCENTAGE' ? 20 : 250);
    const suffix = Math.floor(10 + Math.random() * 90);
    setCode(`${prefix}${val}${suffix}`);
  };

  const processFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file (JPG, PNG, WEBP, SVG)');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image size must be less than 2MB');
      return;
    }

    setBannerFile(file);
    setBannerPreview(URL.createObjectURL(file));
    setRemoveBanner(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  };

  const handleRemoveBanner = () => {
    setBannerFile(null);
    setBannerPreview(null);
    setRemoveBanner(true);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      toast.error('Please enter a coupon code');
      return;
    }
    if (discountValue === '' || Number(discountValue) <= 0) {
      toast.error('Please enter a valid discount value');
      return;
    }
    if (type === 'PERCENTAGE' && Number(discountValue) > 100) {
      toast.error('Percentage discount cannot exceed 100%');
      return;
    }
    if (!startDate || !endDate) {
      toast.error('Please specify start and end dates');
      return;
    }
    if (new Date(startDate) > new Date(endDate)) {
      toast.error('Start date cannot be after end date');
      return;
    }

    const formData = new FormData();
    formData.append('code', normalizedCode);
    formData.append('name', name.trim() || normalizedCode);
    if (description) formData.append('description', description.trim());
    formData.append('type', type);
    formData.append('discountValue', String(discountValue));
    formData.append('minPurchaseAmount', String(minPurchaseAmount || 0));
    if (maxDiscountLimit !== '') formData.append('maxDiscountLimit', String(maxDiscountLimit));
    if (usageLimit !== '') formData.append('usageLimit', String(usageLimit));
    formData.append('perCustomerLimit', String(perCustomerLimit || 1));
    formData.append('startDate', new Date(startDate).toISOString());
    formData.append('endDate', new Date(endDate).toISOString());
    formData.append('isActive', String(isActive));

    if (bannerFile) {
      formData.append('banner', bannerFile);
    } else if (removeBanner) {
      formData.append('removeBanner', 'true');
    }

    if (isEditing && coupon) {
      await updateMutation.mutateAsync({id: coupon.id, data: formData});
    } else {
      await createMutation.mutateAsync(formData);
    }

    onSuccess?.();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-3 sm:p-5 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[90vh] rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4 bg-ivory-50/60">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-burgundy/10 text-burgundy">
              <TicketPercent size={20} />
            </span>
            <div>
              <h3 className="font-serif text-headline-sm text-espresso">
                {isEditing ? 'Edit Coupon Code' : 'Create New Coupon'}
              </h3>
              <p className="text-xs text-outline">
                Define promotional coupon codes, customer limits, and checkout discount rules.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-outline hover:bg-ivory-200 hover:text-espresso"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Coupon Code Input & Generator */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-semibold text-espresso">
                Coupon Code <span className="text-rose-600">*</span>
              </label>
              <button
                type="button"
                onClick={generateRandomCode}
                className="flex items-center gap-1 text-xs text-burgundy font-medium hover:underline"
              >
                <RefreshCw size={11} /> Auto-Generate
              </button>
            </div>
            <input
              type="text"
              required
              placeholder="e.g. SUMMER25, FESTIVE500"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="w-full font-mono text-base font-bold tracking-wider rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-espresso uppercase focus:border-burgundy focus:outline-none"
            />
            <p className="mt-1 text-[11px] text-outline">Customers will enter this code at checkout to claim the discount.</p>
          </div>

          {/* Coupon Title & Description */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-espresso block mb-1">
                Coupon Name / Label
              </label>
              <input
                type="text"
                placeholder="e.g. Summer Special 25% Off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-espresso block mb-1">
                Description / Promo Tagline
              </label>
              <input
                type="text"
                placeholder="e.g. Valid on all orders above ₹999"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
              />
            </div>
          </div>

          {/* Optional Banner Creative */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-espresso block">
              Optional Coupon Banner / Creative Card
            </label>
            {bannerPreview ? (
              <div className="relative group rounded-xl overflow-hidden border border-ivory-300 bg-ivory-100 max-h-36 flex items-center justify-center">
                <img
                  src={bannerPreview}
                  alt="Coupon creative"
                  className="w-full h-36 object-cover"
                />
                <div className="absolute inset-0 bg-espresso/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-espresso shadow hover:bg-ivory-100"
                  >
                    <Upload size={14} /> Replace
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveBanner}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-medium text-white shadow hover:bg-rose-700"
                  >
                    <Trash2 size={14} /> Remove
                  </button>
                </div>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDragEnter={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  const file = e.dataTransfer.files?.[0];
                  if (file) processFile(file);
                }}
                className="cursor-pointer border border-dashed border-ivory-300 hover:border-burgundy rounded-xl p-3 text-center bg-ivory-50/50 hover:bg-ivory-100/50 transition flex items-center justify-center gap-2.5"
              >
                <ImageIcon size={18} className="text-outline" />
                <span className="text-xs font-medium text-espresso">Upload creative badge / thumbnail (optional)</span>
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/svg+xml"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Discount Parameters */}
          <div className="rounded-xl border border-ivory-200 bg-ivory-50/60 p-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-outline flex items-center gap-1.5">
              <Percent size={14} className="text-burgundy" /> Discount & Rules
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-espresso block mb-1">Discount Type</label>
                <div className="flex rounded-lg border border-ivory-300 bg-white p-1">
                  <button
                    type="button"
                    onClick={() => setType('PERCENTAGE')}
                    className={`flex-1 rounded py-1 text-xs font-semibold transition ${
                      type === 'PERCENTAGE'
                        ? 'bg-burgundy text-white'
                        : 'text-outline hover:text-espresso'
                    }`}
                  >
                    % Percent
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('FLAT')}
                    className={`flex-1 rounded py-1 text-xs font-semibold transition ${
                      type === 'FLAT' ? 'bg-burgundy text-white' : 'text-outline hover:text-espresso'
                    }`}
                  >
                    ₹ Flat
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-espresso block mb-1">
                  Discount Value <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    min="1"
                    max={type === 'PERCENTAGE' ? 100 : undefined}
                    required
                    placeholder={type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 300'}
                    value={discountValue}
                    onChange={(e) =>
                      setDiscountValue(e.target.value === '' ? '' : Number(e.target.value))
                    }
                    className="w-full rounded-lg border border-ivory-300 bg-white pl-3.5 pr-8 py-2 text-body-sm text-espresso font-semibold focus:border-burgundy focus:outline-none"
                  />
                  <span className="absolute right-3 top-2.5 text-xs font-semibold text-outline">
                    {type === 'PERCENTAGE' ? '%' : '₹'}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-espresso block mb-1">
                  Max Discount Cap (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 500 (optional)"
                  value={maxDiscountLimit}
                  onChange={(e) =>
                    setMaxDiscountLimit(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-espresso block mb-1">
                  Min Purchase Amount (₹)
                </label>
                <input
                  type="number"
                  min="0"
                  placeholder="e.g. 999"
                  value={minPurchaseAmount}
                  onChange={(e) =>
                    setMinPurchaseAmount(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-espresso block mb-1">
                  Total Usage Limit
                </label>
                <input
                  type="number"
                  min="1"
                  placeholder="e.g. 500 (blank = unlimited)"
                  value={usageLimit}
                  onChange={(e) =>
                    setUsageLimit(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>

              <div>
                <label className="text-xs font-medium text-espresso block mb-1">
                  Limit Per Customer
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  placeholder="e.g. 1"
                  value={perCustomerLimit}
                  onChange={(e) => setPerCustomerLimit(Number(e.target.value) || 1)}
                  className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Validity Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-semibold text-espresso block mb-1">
                Start Date & Time <span className="text-rose-600">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-espresso block mb-1">
                End Date & Time <span className="text-rose-600">*</span>
              </label>
              <input
                type="datetime-local"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
              />
            </div>
          </div>

          {/* Active Switch */}
          <div className="flex items-center justify-between rounded-xl border border-ivory-300 bg-ivory-50/60 p-4">
            <div>
              <p className="text-body-sm font-semibold text-espresso">Enable Coupon</p>
              <p className="text-xs text-outline">
                Disabled coupons cannot be redeemed at checkout even if within valid date range.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setIsActive(!isActive)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                isActive ? 'bg-emerald-600' : 'bg-ivory-300'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  isActive ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-ivory-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-lg border border-ivory-300 bg-white px-4 py-2 text-body-sm font-medium text-espresso hover:bg-ivory-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-burgundy px-5 py-2 text-body-sm font-medium text-white shadow-sm hover:bg-burgundy/90 disabled:opacity-50"
            >
              <TicketPercent size={16} />
              {isSubmitting
                ? 'Saving Coupon...'
                : isEditing
                  ? 'Update Coupon'
                  : 'Create Coupon'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
