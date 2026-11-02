import {
  useCreateOffer,
  useUpdateOffer,
} from '@/lib/react-query/queriesAndMutations/promotion';
import {useCategories, useProducts} from '@/lib/react-query/queriesAndMutations/ecommerce';
import {useMasterSubcategories} from '@/lib/react-query/queriesAndMutations/master';
import {Offer, OfferApplicableOn, OfferType} from '@/types/promotion';
import {
  Check,
  Image as ImageIcon,
  Percent,
  Sparkles,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import React, {useEffect, useRef, useState} from 'react';
import toast from 'react-hot-toast';

interface Props {
  isOpen: boolean;
  offer?: Offer | null;
  panel: string;
  onClose: () => void;
  onSuccess?: () => void;
}

export default function OfferFormModal({isOpen, offer, panel, onClose, onSuccess}: Props) {
  const isEditing = Boolean(offer);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<OfferType>('PERCENTAGE');
  const [discountValue, setDiscountValue] = useState<number | ''>('');
  const [applicableOn, setApplicableOn] = useState<OfferApplicableOn>('ALL_PRODUCTS');
  const [minOrderValue, setMinOrderValue] = useState<number | ''>(0);
  const [maxDiscountLimit, setMaxDiscountLimit] = useState<number | ''>('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [isActive, setIsActive] = useState(true);

  // Target IDs multi-selection
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [selectedSubcategoryIds, setSelectedSubcategoryIds] = useState<string[]>([]);
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);

  // Banner image state
  const [bannerFile, setBannerFile] = useState<File | null>(null);
  const [bannerPreview, setBannerPreview] = useState<string | null>(null);
  const [removeBanner, setRemoveBanner] = useState(false);

  // Data queries for selectors
  const {data: categoriesData} = useCategories(panel);
  const categories: any[] = Array.isArray(categoriesData)
    ? categoriesData
    : (categoriesData as any)?.items || [];

  const {data: subcategoriesData} = useMasterSubcategories({limit: 100});
  const subcategories: any[] = subcategoriesData?.items || [];

  const {data: productsData} = useProducts(panel, {limit: 100});
  const products: any[] = productsData?.items || [];

  // Mutations
  const createMutation = useCreateOffer(panel);
  const updateMutation = useUpdateOffer(panel);
  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  // Initialize form when opening / changing offer
  useEffect(() => {
    if (offer) {
      setName(offer.name || '');
      setDescription(offer.description || '');
      setType(offer.type || 'PERCENTAGE');
      setDiscountValue(offer.discountValue ?? '');
      setApplicableOn(offer.applicableOn || 'ALL_PRODUCTS');
      setMinOrderValue(offer.minOrderValue ?? 0);
      setMaxDiscountLimit(offer.maxDiscountLimit ?? '');
      setIsActive(offer.isActive ?? true);
      setSelectedCategoryIds(offer.categories?.map((c) => c.id) || []);
      setSelectedSubcategoryIds(offer.subcategories?.map((s) => s.id) || []);
      setSelectedProductIds(offer.products?.map((p) => p.id) || []);

      setBannerPreview(offer.bannerUrl || null);
      setBannerFile(null);
      setRemoveBanner(false);

      // Format ISO dates to datetime-local (YYYY-MM-DDTHH:mm)
      try {
        setStartDate(new Date(offer.startDate).toISOString().slice(0, 16));
        setEndDate(new Date(offer.endDate).toISOString().slice(0, 16));
      } catch {
        setStartDate('');
        setEndDate('');
      }
    } else {
      // Defaults for new offer
      setName('');
      setDescription('');
      setType('PERCENTAGE');
      setDiscountValue(10);
      setApplicableOn('ALL_PRODUCTS');
      setMinOrderValue(0);
      setMaxDiscountLimit('');
      setIsActive(true);
      setSelectedCategoryIds([]);
      setSelectedSubcategoryIds([]);
      setSelectedProductIds([]);
      setBannerFile(null);
      setBannerPreview(null);
      setRemoveBanner(false);

      const now = new Date();
      const inOneMonth = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
      setStartDate(now.toISOString().slice(0, 16));
      setEndDate(inOneMonth.toISOString().slice(0, 16));
    }
  }, [offer, isOpen]);

  if (!isOpen) return null;

  // Handle banner file selection
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

    if (!name.trim()) {
      toast.error('Please enter an offer name');
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

    // Build FormData
    const formData = new FormData();
    formData.append('name', name.trim());
    if (description) formData.append('description', description.trim());
    formData.append('type', type);
    formData.append('discountValue', String(discountValue));
    formData.append('applicableOn', applicableOn);
    formData.append('minOrderValue', String(minOrderValue || 0));
    if (maxDiscountLimit !== '') formData.append('maxDiscountLimit', String(maxDiscountLimit));
    formData.append('startDate', new Date(startDate).toISOString());
    formData.append('endDate', new Date(endDate).toISOString());
    formData.append('isActive', String(isActive));

    if (bannerFile) {
      formData.append('banner', bannerFile);
    } else if (removeBanner) {
      formData.append('removeBanner', 'true');
    }

    if (applicableOn === 'SELECTED_CATEGORIES') {
      formData.append('categoryIds', JSON.stringify(selectedCategoryIds));
    } else if (applicableOn === 'SELECTED_SUBCATEGORIES') {
      formData.append('subcategoryIds', JSON.stringify(selectedSubcategoryIds));
    } else if (applicableOn === 'SELECTED_PRODUCTS') {
      formData.append('productIds', JSON.stringify(selectedProductIds));
    }

    if (isEditing && offer) {
      await updateMutation.mutateAsync({id: offer.id, data: formData});
    } else {
      await createMutation.mutateAsync(formData);
    }

    onSuccess?.();
    onClose();
  };

  const toggleSelection = (id: string, list: string[], setList: (arr: string[]) => void) => {
    if (list.includes(id)) {
      setList(list.filter((x) => x !== id));
    } else {
      setList([...list, id]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-espresso/60 p-3 sm:p-5 backdrop-blur-sm">
      <div className="relative flex flex-col w-full max-w-3xl max-h-[90vh] rounded-2xl border border-ivory-300 bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-ivory-200 px-6 py-4 bg-ivory-50/60">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-burgundy/10 text-burgundy">
              <Sparkles size={20} />
            </span>
            <div>
              <h3 className="font-serif text-headline-sm text-espresso">
                {isEditing ? 'Edit Promotional Offer' : 'Create Promotional Offer'}
              </h3>
              <p className="text-xs text-outline">
                Configure promotional campaigns, banner creatives, discounts, and target products.
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

        {/* Modal Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          {/* Banner Upload Section */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-espresso block uppercase tracking-wider">
              Offer Banner / Promotional Creative
            </label>

            {bannerPreview ? (
              <div className="relative group rounded-xl overflow-hidden border border-ivory-300 bg-ivory-100 max-h-48 flex items-center justify-center">
                <img
                  src={bannerPreview}
                  alt="Banner preview"
                  className="w-full h-48 object-cover"
                />
                <div className="absolute inset-0 bg-espresso/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-espresso shadow hover:bg-ivory-100"
                  >
                    <Upload size={14} /> Replace Creative
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
                className="cursor-pointer border-2 border-dashed border-ivory-300 hover:border-burgundy rounded-xl p-5 text-center bg-ivory-50/50 hover:bg-ivory-100/50 transition flex flex-col items-center justify-center gap-2"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-burgundy/10 text-burgundy">
                  <ImageIcon size={20} />
                </div>
                <div>
                  <p className="text-body-sm font-medium text-espresso">
                    Click or drag & drop to upload promotional banner
                  </p>
                  <p className="text-xs text-outline">JPG, PNG, WEBP or SVG up to 2MB (recommended 1200×400)</p>
                </div>
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

          {/* Offer Name & Description */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="text-xs font-semibold text-espresso block mb-1">
                Offer Name <span className="text-rose-600">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Festive Diwali Sale, Summer Collection 20% Off"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-espresso block mb-1">
                Description / Terms
              </label>
              <textarea
                rows={2}
                placeholder="Brief summary or promotional terms for customers..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
              />
            </div>
          </div>

          {/* Discount Configuration */}
          <div className="rounded-xl border border-ivory-200 bg-ivory-50/60 p-4 space-y-4">
            <h4 className="text-xs font-semibold uppercase tracking-wider text-outline flex items-center gap-1.5">
              <Percent size={14} className="text-burgundy" /> Discount Type & Values
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                    % Percentage
                  </button>
                  <button
                    type="button"
                    onClick={() => setType('FLAT')}
                    className={`flex-1 rounded py-1 text-xs font-semibold transition ${
                      type === 'FLAT' ? 'bg-burgundy text-white' : 'text-outline hover:text-espresso'
                    }`}
                  >
                    ₹ Flat Amount
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
                    placeholder={type === 'PERCENTAGE' ? 'e.g. 20' : 'e.g. 500'}
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
                  placeholder="e.g. 1000 (optional)"
                  value={maxDiscountLimit}
                  onChange={(e) =>
                    setMaxDiscountLimit(e.target.value === '' ? '' : Number(e.target.value))
                  }
                  className="w-full rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-espresso block mb-1">
                Minimum Order Value (₹)
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 999 (0 for no minimum)"
                value={minOrderValue}
                onChange={(e) =>
                  setMinOrderValue(e.target.value === '' ? '' : Number(e.target.value))
                }
                className="w-full sm:w-1/2 rounded-lg border border-ivory-300 bg-white px-3.5 py-2 text-body-sm text-espresso focus:border-burgundy focus:outline-none"
              />
            </div>
          </div>

          {/* Applicable On Scope */}
          <div className="space-y-3">
            <label className="text-xs font-semibold text-espresso block uppercase tracking-wider">
              Applicable On
            </label>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(
                [
                  {id: 'ALL_PRODUCTS', label: 'All Products'},
                  {id: 'SELECTED_CATEGORIES', label: 'Categories'},
                  {id: 'SELECTED_SUBCATEGORIES', label: 'Subcategories'},
                  {id: 'SELECTED_PRODUCTS', label: 'Products'},
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setApplicableOn(tab.id)}
                  className={`rounded-lg border px-3 py-2 text-xs font-semibold transition ${
                    applicableOn === tab.id
                      ? 'border-burgundy bg-burgundy/10 text-burgundy'
                      : 'border-ivory-300 bg-white text-outline hover:border-outline'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Selected Categories Selector */}
            {applicableOn === 'SELECTED_CATEGORIES' && (
              <div className="rounded-xl border border-ivory-300 p-3 bg-white space-y-2">
                <p className="text-xs text-outline font-medium">Select eligible categories:</p>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {categories.map((c: any) => {
                    const isSelected = selectedCategoryIds.includes(c.id);
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() =>
                          toggleSelection(c.id, selectedCategoryIds, setSelectedCategoryIds)
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition ${
                          isSelected
                            ? 'border-burgundy bg-burgundy text-white'
                            : 'border-ivory-300 bg-ivory-50 text-espresso hover:border-outline'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        {c.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Subcategories Selector */}
            {applicableOn === 'SELECTED_SUBCATEGORIES' && (
              <div className="rounded-xl border border-ivory-300 p-3 bg-white space-y-2">
                <p className="text-xs text-outline font-medium">Select eligible subcategories:</p>
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {subcategories.map((s: any) => {
                    const isSelected = selectedSubcategoryIds.includes(s.id);
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() =>
                          toggleSelection(s.id, selectedSubcategoryIds, setSelectedSubcategoryIds)
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition ${
                          isSelected
                            ? 'border-burgundy bg-burgundy text-white'
                            : 'border-ivory-300 bg-ivory-50 text-espresso hover:border-outline'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        {s.name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Selected Products Selector */}
            {applicableOn === 'SELECTED_PRODUCTS' && (
              <div className="rounded-xl border border-ivory-300 p-3 bg-white space-y-2">
                <p className="text-xs text-outline font-medium">
                  Select eligible products ({selectedProductIds.length} selected):
                </p>
                <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1">
                  {products.map((p: any) => {
                    const isSelected = selectedProductIds.includes(p.id);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() =>
                          toggleSelection(p.id, selectedProductIds, setSelectedProductIds)
                        }
                        className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                          isSelected
                            ? 'border-burgundy bg-burgundy text-white'
                            : 'border-ivory-300 bg-ivory-50 text-espresso hover:border-outline'
                        }`}
                      >
                        {isSelected && <Check size={12} />}
                        <span>{p.name}</span>
                        <span className="font-mono text-[10px] opacity-75">({p.sku})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Dates & Active Status */}
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
              <p className="text-body-sm font-semibold text-espresso">Activate Offer Immediately</p>
              <p className="text-xs text-outline">
                When active and within the date range, this promotion will be available to customers.
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

          {/* Modal Footer */}
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
              <Tag size={16} />
              {isSubmitting
                ? 'Saving Offer...'
                : isEditing
                  ? 'Update Offer'
                  : 'Create Offer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
