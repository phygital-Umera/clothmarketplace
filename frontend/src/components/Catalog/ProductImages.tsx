import {useProductImages} from '@/lib/react-query/queriesAndMutations/catalog';
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
        {product.images.map((img) => (
          <figure
            key={img.id}
            className={`relative h-24 w-24 border ${img.isMain ? 'border-burgundy' : 'border-ivory-300'}`}
          >
            <img
              src={img.url}
              alt={img.altText ?? ''}
              className="h-full w-full object-cover"
            />
            {img.isMain && (
              <span className="absolute left-0 top-0 bg-burgundy px-1.5 py-0.5 text-label-caps uppercase text-ivory">
                Main
              </span>
            )}
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
      <p className={error ? 'field-error' : 'field-hint'}>
        {error ||
          `${IMAGE_RULE.hint} · up to ${MAX_IMAGES} images · the starred one shows first`}
      </p>
    </div>
  );
};

export default ProductImages;
