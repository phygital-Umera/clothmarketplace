import {useAiStatus, useShopProductImages} from '@/lib/react-query/queriesAndMutations/shopProduct';
import {checkFile, IMAGE_RULE} from '@/lib/validation/fieldRules';
import {PhotoStyle, ShopProduct} from '@/types/shopProduct';
import {ImagePlus, Loader2, Shirt, Sparkles, Star, Trash2, Wand2, X} from 'lucide-react';
import {useEffect, useId, useState} from 'react';

export const MAX_IMAGES = 8;

const STYLES: {value: PhotoStyle; label: string; hint: string}[] = [
  {value: 'GHOST', label: '3D, no mannequin', hint: 'Garment with body shape, nothing else (like big e-commerce sites)'},
  {value: 'MANNEQUIN', label: 'On a mannequin', hint: 'On a white dress-form mannequin'},
  {value: 'MODEL', label: 'Worn by a model', hint: 'A model wearing it; sarees and lehengas are draped'},
];
const STYLE_LABEL: Record<PhotoStyle, string> = {GHOST: 'AI · 3D', MANNEQUIN: 'AI · Mannequin', MODEL: 'AI · Model'};

/** Original product images: upload / set main / remove (saved straight away) */
export const ShopProductImages = ({
  product,
  editable = true,
}: {
  product: ShopProduct;
  editable?: boolean;
}) => {
  const inputId = useId();
  const {upload, setMain, remove, clean, professional} = useShopProductImages(product.id);
  const {data: aiReady} = useAiStatus();
  const [style, setStyle] = useState<PhotoStyle>('GHOST');
  const [details, setDetails] = useState('');
  // The shop's own photo (not one the AI or the cleaner made) the professional photo is made from
  const shopPhoto = product.images.find((i) => !i.cleanedFromId && !i.aiStyle);
  const [error, setError] = useState('');
  const room = MAX_IMAGES - product.images.length;
  // Shop photos that can still get a clean white-background copy
  const canClean = (id: string, cleanedFromId?: string | null) =>
    !cleanedFromId &&
    !product.images.find((i) => i.id === id)?.aiStyle &&
    !product.images.some((i) => i.cleanedFromId === id) &&
    room > 0;
  const firstToClean = product.images.find((i) => canClean(i.id, i.cleanedFromId));

  const pick = (list: FileList | null) => {
    const files = Array.from(list ?? []).slice(0, room);
    const problem = files.map((f) => checkFile(f, 'Image')).find(Boolean);
    setError(problem ?? '');
    if (!problem && files.length) upload.mutate(files);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {product.images.map((img) => (
          <figure
            key={img.id}
            className={`relative h-24 w-24 border ${img.isMain ? 'border-burgundy' : 'border-ivory-300'}`}
          >
            <img
              src={img.url}
              alt={img.altText ?? product.name}
              className="h-full w-full object-cover"
            />
            {img.isMain && (
              <span className="absolute left-0 top-0 bg-burgundy px-1.5 py-0.5 text-label-caps uppercase text-ivory">
                Main
              </span>
            )}
            {img.aiStyle && (
              <span className="absolute right-0 top-0 bg-indigo-700 px-1.5 py-0.5 text-label-caps uppercase text-white" title="Professional photo made by AI">
                {STYLE_LABEL[img.aiStyle]}
              </span>
            )}
            {img.cleanedFromId && (
              <span
                className="absolute right-0 top-0 bg-emerald-700 px-1.5 py-0.5 text-label-caps uppercase text-white"
                title="Clean white-background photo"
              >
                Clean
              </span>
            )}
            {clean.isPending && clean.variables === img.id && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/80 text-[10px] text-espresso">
                <Loader2 size={16} className="animate-spin" /> Cleaning…
              </span>
            )}
            {editable && (
              <div className="absolute bottom-0 right-0 flex bg-white/90">
                {canClean(img.id, img.cleanedFromId) && (
                  <button
                    type="button"
                    disabled={clean.isPending}
                    onClick={() => clean.mutate(img.id)}
                    aria-label="Clean background"
                    title="Clean background: put the garment on plain white (keeps this photo too)"
                    className="p-1 text-outline hover:text-burgundy disabled:opacity-40"
                  >
                    <Sparkles size={14} />
                  </button>
                )}
                {!img.isMain && (
                  <button
                    type="button"
                    onClick={() => setMain.mutate(img.id)}
                    aria-label="Set as main image"
                    title="Set as main image"
                    className="p-1 text-outline hover:text-burgundy"
                  >
                    <Star size={14} />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => remove.mutate(img.id)}
                  aria-label="Remove image"
                  title="Remove image (also removes its AI previews)"
                  className="p-1 text-outline hover:text-error"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </figure>
        ))}
        {editable && room > 0 && (
          <label
            htmlFor={inputId}
            className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-ivory-300 bg-ivory-100 text-center text-technical-data text-outline hover:border-burgundy/50"
          >
            {upload.isPending ? (
              <Loader2 size={18} className="animate-spin" />
            ) : (
              <ImagePlus size={18} />
            )}
            Add images
          </label>
        )}
        {!editable && !product.images.length && (
          <p className="text-body-sm text-outline">No images uploaded yet.</p>
        )}
        <input
          id={inputId}
          type="file"
          multiple
          accept={IMAGE_RULE.mimeTypes.join(',')}
          className="sr-only"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      {editable && shopPhoto && (
        <div className="mt-3 rounded border border-indigo-200 bg-indigo-50/60 p-3 text-body-sm text-espresso">
          <p className="flex items-center gap-1.5 font-semibold">
            <Shirt size={15} className="text-indigo-700" /> Professional photo (AI)
          </p>
          <p className="mt-0.5 text-xs text-on-surface-variant">
            From your photo of the garment (flat on a bed or floor is fine), the AI makes a studio catalogue photo. Works
            for shirts, kurtas, sarees, lehengas and more. Your photo is kept; the new photo becomes the main one, and you can
            make colour photos from it.
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {STYLES.map((s) => (
              <label
                key={s.value}
                className={`cursor-pointer rounded border px-2.5 py-2 ${style === s.value ? 'border-indigo-600 bg-white ring-1 ring-indigo-600' : 'border-ivory-300 bg-white/70'}`}
              >
                <input
                  type="radio"
                  name={`${inputId}-style`}
                  value={s.value}
                  checked={style === s.value}
                  onChange={() => setStyle(s.value)}
                  className="sr-only"
                />
                <span className="block text-xs font-semibold">{s.label}</span>
                <span className="block text-[11px] leading-snug text-on-surface-variant">{s.hint}</span>
              </label>
            ))}
          </div>
          <label className="mt-2 block text-xs font-semibold" htmlFor={`${inputId}-details`}>
            Garment details <span className="font-normal text-on-surface-variant">(optional, helps the AI keep it exact)</span>
          </label>
          <input
            id={`${inputId}-details`}
            value={details}
            maxLength={200}
            onChange={(e) => setDetails(e.target.value)}
            placeholder="e.g. turtleneck, rib knit, no zip · silk saree with gold zari border · lehenga with mirror work"
            className="mt-1 w-full rounded border border-ivory-300 bg-white px-2.5 py-1.5 text-body-sm"
          />
          <p className="mt-1 text-[11px] text-on-surface-variant">
            The colour is measured from your photo; men's / women's / kids' comes from the product.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!aiReady || professional.isPending || room <= 0}
              onClick={() => professional.mutate({imageId: shopPhoto.id, style, details: details.trim()})}
              className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-60"
            >
              {professional.isPending ? <Loader2 size={14} className="animate-spin" /> : <Wand2 size={14} />}
              {professional.isPending ? 'Making the photo… (10–40 s)' : 'Make professional photo'}
            </button>
            {aiReady === false && (
              <span className="text-xs text-amber-800">
                Needs the free Cloudflare AI keys in the backend .env (steps: backend/docs/colour-photos-setup.md).
              </span>
            )}
            {room <= 0 && <span className="text-xs text-amber-800">8 photos already; delete one first.</span>}
          </div>
          <p className="mt-1.5 text-[11px] text-on-surface-variant">
            The AI redraws the garment, so check small details (prints, borders, labels) before you publish it.
          </p>
        </div>
      )}
      {editable && firstToClean && (
        <div className="mt-3 flex flex-wrap items-center gap-3 rounded border border-ivory-300 bg-ivory-100 px-3 py-2 text-body-sm text-espresso">
          <span className="min-w-0 flex-1">
            Photo taken on a bed, floor or mat? Make a clean catalogue photo: the garment on plain white, centred, with a
            soft shadow. Your photo is kept, and colour photos made from the clean photo come out on white too.
          </span>
          <button
            type="button"
            disabled={clean.isPending}
            onClick={() => clean.mutate(firstToClean.id)}
            className="btn-primary inline-flex shrink-0 items-center gap-1.5 disabled:opacity-60"
          >
            {clean.isPending ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {clean.isPending ? 'Cleaning… (10–20 s)' : 'Clean background'}
          </button>
        </div>
      )}
      {editable && (
        <p className={error ? 'field-error' : 'field-hint'}>
          {error ||
            `${IMAGE_RULE.hint} · up to ${MAX_IMAGES} images · the starred one shows first`}
        </p>
      )}
    </div>
  );
};

/** Images picked on the Add form; uploaded once the product is saved */
export const PendingImages = ({
  files,
  onChange,
}: {
  files: File[];
  onChange: (files: File[]) => void;
}) => {
  const inputId = useId();
  const [error, setError] = useState('');
  // Preview links are made and released by the same effect, so React's
  // double run in development never leaves an image pointing at a released link
  const [urls, setUrls] = useState<string[]>([]);
  useEffect(() => {
    const made = files.map((f) => URL.createObjectURL(f));
    setUrls(made);
    return () => made.forEach((u) => URL.revokeObjectURL(u));
  }, [files]);
  const room = MAX_IMAGES - files.length;

  const pick = (list: FileList | null) => {
    const picked = Array.from(list ?? []).slice(0, room);
    const problem = picked.map((f) => checkFile(f, 'Image')).find(Boolean);
    setError(problem ?? '');
    if (!problem && picked.length) onChange([...files, ...picked]);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {files.map((file, i) => (
          <figure
            key={`${file.name}-${i}`}
            className={`relative h-24 w-24 border ${i === 0 ? 'border-burgundy' : 'border-ivory-300'}`}
          >
            <img
              src={urls[i]}
              alt={file.name}
              className="h-full w-full object-cover"
            />
            {i === 0 && (
              <span className="absolute left-0 top-0 bg-burgundy px-1.5 py-0.5 text-label-caps uppercase text-ivory">
                Main
              </span>
            )}
            <button
              type="button"
              onClick={() => onChange(files.filter((_, j) => j !== i))}
              aria-label={`Remove ${file.name}`}
              className="absolute bottom-0 right-0 bg-white/90 p-1 text-outline hover:text-error"
            >
              <X size={14} />
            </button>
          </figure>
        ))}
        {room > 0 && (
          <label
            htmlFor={inputId}
            className="flex h-24 w-24 cursor-pointer flex-col items-center justify-center gap-1 border border-dashed border-ivory-300 bg-ivory-100 text-center text-technical-data text-outline hover:border-burgundy/50"
          >
            <ImagePlus size={18} />
            Add images
          </label>
        )}
        <input
          id={inputId}
          type="file"
          multiple
          accept={IMAGE_RULE.mimeTypes.join(',')}
          className="sr-only"
          onChange={(e) => {
            pick(e.target.files);
            e.target.value = '';
          }}
        />
      </div>
      <p className={error ? 'field-error' : 'field-hint'}>
        {error ||
          `${IMAGE_RULE.hint} · up to ${MAX_IMAGES} images · the first one is the main image`}
      </p>
    </div>
  );
};
