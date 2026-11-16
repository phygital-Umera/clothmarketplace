import {
  CleanPhotoBar,
  PhotoBadges,
  ProfessionalPhotoBox,
  canCleanPhoto,
  ownPhoto,
} from '@/components/ShopProduct/AiPhotoTools';
import PhotoViewer, {
  PhotoView,
  ViewAllPhotosButton,
} from '@/components/ShopProduct/PhotoViewer';
import {useProductImages} from '@/lib/react-query/queriesAndMutations/catalog';
import {
  useAiStatus,
  useCompanyPhotoTools,
} from '@/lib/react-query/queriesAndMutations/shopProduct';
import {checkFile, IMAGE_RULE} from '@/lib/validation/fieldRules';
import {CatalogPanel, Product} from '@/types/catalog';
import {ImagePlus, Loader2, Star, Trash2} from 'lucide-react';
import {useId, useState} from 'react';

const MAX_IMAGES = 8;

/** Upload / set main / remove product images (saved straight away) */
const ProductImages = ({
  panel,
  product,
}: {
  panel: CatalogPanel;
  product: Product;
}) => {
  const inputId = useId();
  const {upload, setMain, remove} = useProductImages(panel, product.id);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<PhotoView>(null);
  const room = MAX_IMAGES - product.images.length;

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
                alt={img.altText ?? ''}
                className="h-full w-full object-cover"
              />
            </button>
            <PhotoBadges photo={img} />
            {product.canEdit && (
              <div className="absolute bottom-0 right-0 flex bg-white/90">
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
                  title="Remove image"
                  className="p-1 text-outline hover:text-error"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            )}
          </figure>
        ))}
        {product.canEdit && room > 0 && (
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
      <p className={error ? 'field-error' : 'field-hint'}>
        {error ||
          `${IMAGE_RULE.hint} · up to ${MAX_IMAGES} images · the starred one shows first`}
      </p>
      {/* AI photo tools: only the company panel has the server routes for them */}
      {panel === 'company-admin' && product.canEdit && (
        <CompanyPhotoTools product={product} room={room} />
      )}
    </div>
  );
};

/** Professional photo (AI) and Clean background, for any product of the company */
const CompanyPhotoTools = ({
  product,
  room,
}: {
  product: Product;
  room: number;
}) => {
  const {clean, professional} = useCompanyPhotoTools(product.id);
  const {data: aiReady} = useAiStatus('company-admin');
  const source = ownPhoto(product.images);
  const firstToClean = product.images.find((i) =>
    canCleanPhoto(product.images, i, room),
  );

  return (
    <>
      {source && (
        <ProfessionalPhotoBox
          sourceId={source.id}
          room={room}
          aiReady={aiReady}
          pending={professional.isPending}
          onMake={(input) => professional.mutate(input)}
        />
      )}
      {firstToClean && (
        <CleanPhotoBar
          pending={clean.isPending}
          onClean={() => clean.mutate(firstToClean.id)}
        />
      )}
    </>
  );
};

export default ProductImages;
