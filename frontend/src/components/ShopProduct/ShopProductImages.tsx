import {
  useAiStatus,
  useShopProductImages,
} from '@/lib/react-query/queriesAndMutations/shopProduct';
import {checkFile, IMAGE_RULE} from '@/lib/validation/fieldRules';
import {ShopProduct} from '@/types/shopProduct';
import {ImagePlus, Loader2, Sparkles, Star, Trash2, X} from 'lucide-react';
import {useEffect, useId, useState} from 'react';
import {
  CleanPhotoBar,
  PhotoBadges,
  ProfessionalPhotoBox,
  canCleanPhoto,
  ownPhoto,
} from './AiPhotoTools';
import PhotoViewer, {PhotoView, ViewAllPhotosButton} from './PhotoViewer';

export const MAX_IMAGES = 8;

/** Original product images: upload / set main / remove (saved straight away) */
export const ShopProductImages = ({
  product,
  editable = true,
}: {
  product: ShopProduct;
  editable?: boolean;
}) => {
  const inputId = useId();
  const {upload, setMain, remove, clean, professional} = useShopProductImages(
    product.id,
  );
  const {data: aiReady} = useAiStatus();
  const shopPhoto = ownPhoto(product.images);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<PhotoView>(null);
  const room = MAX_IMAGES - product.images.length;
  const firstToClean = product.images.find((i) =>
    canCleanPhoto(product.images, i, room),
  );

  const pick = (list: FileList | null) => {
    const files = Array.from(list ?? []).slice(0, room);
    const problem = files.map((f) => checkFile(f, 'Image')).find(Boolean);
    setError(problem ?? '');
    if (!problem && files.length) upload.mutate(files);
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {product.images.map((img, i) => (
          <figure
            key={img.id}
            className={`relative h-24 w-24 border ${img.isMain ? 'border-burgundy' : 'border-ivory-300'}`}
          >
            <button
              type="button"
              onClick={() => setViewing(i)}
              aria-label="View photo large"
              title="View large"
              className="block h-full w-full cursor-zoom-in"
            >
              <img
                src={img.url}
                alt={img.altText ?? product.name}
                className="h-full w-full object-cover"
              />
            </button>
            <PhotoBadges photo={img} />
            {clean.isPending && clean.variables === img.id && (
              <span className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-white/80 text-[10px] text-espresso">
                <Loader2 size={16} className="animate-spin" /> Cleaning…
              </span>
            )}
            {editable && (
              <div className="absolute bottom-0 right-0 flex bg-white/90">
                {canCleanPhoto(product.images, img, room) && (
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
      <ViewAllPhotosButton
        count={product.images.length}
        onClick={() => setViewing('all')}
      />
      <PhotoViewer photos={product.images} view={viewing} onView={setViewing} />
      {editable && shopPhoto && (
        <ProfessionalPhotoBox
          sourceId={shopPhoto.id}
          room={room}
          aiReady={aiReady}
          pending={professional.isPending}
          onMake={(input) => professional.mutate(input)}
        />
      )}
      {editable && firstToClean && (
        <CleanPhotoBar
          pending={clean.isPending}
          onClean={() => clean.mutate(firstToClean.id)}
        />
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
