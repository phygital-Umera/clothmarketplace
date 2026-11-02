import {useShopProductPreviews} from '@/lib/react-query/queriesAndMutations/shopProduct';
import {ColorPreview, ShopProduct} from '@/types/shopProduct';
import {getErrorMessage} from '@/utils/axios';
import {
  CircleAlert,
  ImageOff,
  Loader2,
  RefreshCw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {useState} from 'react';

type Props = {product: ShopProduct; editable?: boolean};

/**
 * AI color previews: the uploaded image is shown as-is ("Original"); each
 * color is a separate AI-generated image stored by the backend. Nothing here
 * tints the original - if no preview exists for a color, it says so.
 */
const AiColorPreview = ({product, editable = true}: Props) => {
  const {generate, remove} = useShopProductPreviews(product.id);
  const [sourceId, setSourceId] = useState<string | undefined>();
  const [selected, setSelected] = useState<string[]>([]);
  const [active, setActive] = useState<string | null>(null);

  const source =
    product.images.find((img) => img.id === sourceId) ?? product.images[0];
  const previews = new Map<string, ColorPreview>(
    (product.previews ?? [])
      .filter((p) => p.sourceImageId === source?.id)
      .map((p) => [p.colorId, p]),
  );
  const generating = new Set(
    generate.isPending ? (generate.variables?.colorIds ?? []) : [],
  );

  const run = (colorIds: string[]) => {
    if (!source || !colorIds.length) return;
    setActive(colorIds[0]);
    generate.mutate(
      {colorIds, imageId: source.id},
      {onSuccess: () => setSelected([])},
    );
  };

  const toggle = (id: string) =>
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((v) => v !== id) : [...prev, id],
    );

  const activeColor = product.colors.find((c) => c.id === active);
  const activePreview = active ? previews.get(active) : undefined;
  const missing = product.colors.filter(
    (c) => previews.get(c.id)?.status !== 'READY',
  );

  if (!source) {
    return (
      <div className="flex flex-col items-center gap-2 border border-dashed border-ivory-300 bg-ivory-100 px-6 py-10 text-center">
        <ImageOff size={22} strokeWidth={1.5} className="text-outline" />
        <p className="font-serif text-headline-sm text-espresso">
          Upload a product image first
        </p>
        <p className="max-w-sm text-body-sm text-on-surface-variant">
          AI previews are generated from your uploaded photo, in each color
          selected for this product.
        </p>
      </div>
    );
  }

  const stage = () => {
    if (!activeColor) {
      return (
        <img
          src={source.url}
          alt={`${product.name} (original)`}
          className="h-full w-full object-contain"
        />
      );
    }
    if (generating.has(activeColor.id)) {
      return (
        <div className="flex flex-col items-center gap-3 text-on-surface-variant">
          <Loader2 size={28} className="animate-spin text-burgundy" />
          <p className="text-body-sm">
            Generating {activeColor.name} preview… this can take up to a minute
            per color.
          </p>
        </div>
      );
    }
    if (activePreview?.status === 'READY' && activePreview.url) {
      return (
        <img
          src={activePreview.url}
          alt={`${product.name} in ${activeColor.name} (AI preview)`}
          className="h-full w-full object-contain"
        />
      );
    }
    if (activePreview?.status === 'FAILED') {
      return (
        <div className="flex max-w-sm flex-col items-center gap-3 px-4 text-center">
          <CircleAlert size={24} className="text-error" />
          <p className="text-body-sm text-on-surface-variant">
            {activePreview.error ?? 'Generation failed'}
          </p>
          {editable && (
            <button
              type="button"
              className="btn-ghost"
              disabled={generate.isPending}
              onClick={() => run([activeColor.id])}
            >
              <RefreshCw size={14} /> Retry
            </button>
          )}
        </div>
      );
    }
    return (
      <div className="flex max-w-sm flex-col items-center gap-3 px-4 text-center">
        <Sparkles size={24} strokeWidth={1.5} className="text-burgundy" />
        <p className="text-body-sm text-on-surface-variant">
          No {activeColor.name} preview yet.
        </p>
        {editable && (
          <button
            type="button"
            className="btn-primary"
            disabled={generate.isPending}
            onClick={() => run([activeColor.id])}
          >
            <Sparkles size={14} /> Generate Preview
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
      {/* Stage */}
      <div>
        <div className="relative flex aspect-square w-full items-center justify-center border border-ivory-300 bg-ivory-100">
          {stage()}
          <span className="absolute left-0 top-0 bg-espresso/85 px-2 py-1 text-label-caps uppercase text-ivory">
            {activeColor
              ? `AI preview · ${activeColor.name}`
              : 'Original · unchanged'}
          </span>
          {editable && activePreview && activePreview.status !== 'PENDING' && (
            <div className="absolute bottom-2 right-2 flex gap-1 bg-white/90">
              <button
                type="button"
                title="Regenerate"
                aria-label="Regenerate preview"
                disabled={generate.isPending}
                onClick={() => activeColor && run([activeColor.id])}
                className="p-1.5 text-outline hover:text-burgundy disabled:opacity-50"
              >
                <RefreshCw size={14} />
              </button>
              <button
                type="button"
                title="Remove preview"
                aria-label="Remove preview"
                disabled={remove.isPending}
                onClick={() => remove.mutate(activePreview.id)}
                className="p-1.5 text-outline hover:text-error disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          )}
        </div>

        {/* Quick switch: original + every color */}
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActive(null)}
            className={`h-16 w-16 border ${!activeColor ? 'border-burgundy' : 'border-ivory-300'}`}
            title="Original"
          >
            <img
              src={source.url}
              alt="Original"
              className="h-full w-full object-cover"
            />
          </button>
          {product.colors.map((c) => {
            const p = previews.get(c.id);
            return (
              <button
                key={c.id}
                type="button"
                onClick={() => setActive(c.id)}
                title={c.name}
                className={`relative flex h-16 w-16 items-center justify-center border bg-ivory-100 ${active === c.id ? 'border-burgundy' : 'border-ivory-300'}`}
              >
                {p?.status === 'READY' && p.url ? (
                  <img
                    src={p.url}
                    alt={c.name}
                    className="h-full w-full object-cover"
                  />
                ) : generating.has(c.id) ? (
                  <Loader2 size={16} className="animate-spin text-burgundy" />
                ) : (
                  <span className="text-technical-data text-outline">
                    {p?.status === 'FAILED' ? 'Failed' : '—'}
                  </span>
                )}
                <span
                  aria-hidden
                  className="absolute bottom-1 right-1 h-3 w-3 rounded-full border border-white"
                  style={{backgroundColor: c.hexCode}}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4">
        {product.images.length > 1 && (
          <div>
            <p className="field-label">Source image</p>
            <div className="flex flex-wrap gap-2">
              {product.images.map((img) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => {
                    setSourceId(img.id);
                    setActive(null);
                  }}
                  className={`h-12 w-12 border ${img.id === source.id ? 'border-burgundy' : 'border-ivory-300'}`}
                >
                  <img
                    src={img.url}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        <div>
          <p className="field-label">Colors</p>
          <ul className="divide-y divide-ivory-200 border border-ivory-300 bg-white">
            {product.colors.map((c) => {
              const p = previews.get(c.id);
              const status = generating.has(c.id)
                ? 'Generating…'
                : p?.status === 'READY'
                  ? 'Ready'
                  : p?.status === 'FAILED'
                    ? 'Failed'
                    : 'Not generated';
              return (
                <li key={c.id} className="flex items-center gap-3 px-3 py-2">
                  {editable && (
                    <input
                      type="checkbox"
                      aria-label={`Select ${c.name}`}
                      checked={selected.includes(c.id)}
                      disabled={generate.isPending}
                      onChange={() => toggle(c.id)}
                      className="h-4 w-4 accent-burgundy"
                    />
                  )}
                  <span
                    aria-hidden
                    className="h-4 w-4 shrink-0 rounded-full border border-hairline"
                    style={{backgroundColor: c.hexCode}}
                  />
                  <button
                    type="button"
                    onClick={() => setActive(c.id)}
                    className="flex-1 text-left text-body-sm text-espresso hover:text-burgundy"
                  >
                    {c.name}
                  </button>
                  <span
                    className={`text-technical-data ${
                      status === 'Ready'
                        ? 'text-secondary'
                        : status === 'Failed'
                          ? 'text-error'
                          : 'text-outline'
                    }`}
                  >
                    {status}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {editable && (
          <div className="space-y-2">
            <button
              type="button"
              className="btn-primary w-full justify-center"
              disabled={generate.isPending || !selected.length}
              onClick={() => run(selected)}
            >
              {generate.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Sparkles size={14} />
              )}
              {generate.isPending
                ? 'Generating…'
                : `Generate Preview${selected.length ? ` (${selected.length})` : ''}`}
            </button>
            {missing.length > 0 && (
              <button
                type="button"
                className="btn-text w-full justify-center"
                disabled={generate.isPending}
                onClick={() =>
                  setSelected(missing.slice(0, 6).map((c) => c.id))
                }
              >
                Select colors without a preview
              </button>
            )}
            {generate.isError && (
              <p role="alert" className="field-error">
                {getErrorMessage(
                  generate.error,
                  'Could not generate the preview',
                )}
              </p>
            )}
          </div>
        )}

        <p className="field-hint">
          Previews are generated by AI (Cloudflare Workers AI · FLUX.2) from the
          selected image. Your original image is never changed. Free tier:
          roughly 80 previews per day; up to 6 colors per run.
        </p>
      </div>
    </div>
  );
};

export default AiColorPreview;
