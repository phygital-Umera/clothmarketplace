import Overlay from '@/components/ui/Overlay';
import {PhotoStyle} from '@/types/shopProduct';
import {
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  LayoutGrid,
  X,
} from 'lucide-react';
import {ReactNode, useEffect} from 'react';
import {photoKind} from './AiPhotoTools';

type ViewerPhoto = {
  id: string;
  url: string;
  altText?: string | null;
  isMain?: boolean;
  aiStyle?: PhotoStyle | null;
  cleanedFromId?: string | null;
  /** Shown instead of what made the photo (e.g. the colour name) */
  caption?: string;
};

/** What the viewer shows: one photo (its index), all photos, or nothing */
export type PhotoView = number | 'all' | null;

const label = (photo: ViewerPhoto) =>
  `${photo.caption ?? photoKind(photo) ?? 'Your photo'}${photo.isMain ? ' · Main photo' : ''}`;

/**
 * A product's photos large. "All" shows every photo side by side; click one to
 * see it alone, then step with the arrows (or ← →). Esc or the scrim closes.
 */
const PhotoViewer = ({
  photos,
  view,
  onView,
}: {
  photos: ViewerPhoto[];
  view: PhotoView;
  onView: (view: PhotoView) => void;
}) => {
  const index = typeof view === 'number' ? view : null;
  const photo = index === null ? undefined : photos[index];
  const count = photos.length;
  const step = (by: number) =>
    index !== null && onView((index + by + count) % count);

  useEffect(() => {
    if (!photo || count < 2) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') step(-1);
      if (e.key === 'ArrowRight') step(1);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  // Closed, no photos, or the photo was deleted while open
  if (view === null || !count || (view !== 'all' && !photo)) return null;
  const close = () => onView(null);

  const header = (title: string, actions?: ReactNode) => (
    <div className="flex items-center justify-between gap-3 border-b border-ivory-200 px-4 py-2.5">
      <p className="text-body-sm text-espresso">{title}</p>
      <div className="flex items-center gap-1">
        {actions}
        <button
          type="button"
          onClick={close}
          aria-label="Close"
          className="p-1.5 text-outline hover:text-espresso"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
  const link =
    'inline-flex items-center gap-1 px-2 py-1 text-body-sm text-burgundy hover:underline';

  return (
    <Overlay open onClose={close} label="Product photos">
      {view === 'all' ? (
        <div className="flex max-h-full w-full max-w-6xl flex-col border border-ivory-300 bg-white shadow-lg">
          {header(`All photos · ${count}`)}
          <div className="grid gap-3 overflow-y-auto p-4 sm:grid-cols-2 lg:grid-cols-3">
            {photos.map((p, i) => (
              <figure key={p.id} className="border border-ivory-300">
                <button
                  type="button"
                  onClick={() => onView(i)}
                  title="View this photo alone"
                  className="block w-full cursor-zoom-in bg-ivory-100"
                >
                  <img
                    src={p.url}
                    alt={p.altText ?? label(p)}
                    className="aspect-[4/5] w-full object-contain"
                  />
                </button>
                <figcaption className="flex items-center justify-between gap-2 border-t border-ivory-200 px-3 py-1.5 text-body-sm text-espresso">
                  {label(p)}
                  <a
                    href={p.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Open ${label(p)} full size in a new tab`}
                    title="Open full size in a new tab"
                    className="p-1 text-outline hover:text-burgundy"
                  >
                    <ExternalLink size={14} />
                  </a>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex max-h-full w-full max-w-3xl flex-col border border-ivory-300 bg-white shadow-lg">
          {header(
            `${label(photo!)}${count > 1 ? ` · ${index! + 1} of ${count}` : ''}`,
            <>
              {count > 1 && (
                <button
                  type="button"
                  onClick={() => onView('all')}
                  className={link}
                >
                  <LayoutGrid size={14} /> All photos
                </button>
              )}
              <a
                href={photo!.url}
                target="_blank"
                rel="noopener noreferrer"
                className={link}
              >
                <ExternalLink size={14} /> Open full size
              </a>
            </>,
          )}
          <div className="relative flex min-h-0 flex-1 items-center justify-center bg-ivory-100">
            <img
              key={photo!.id}
              src={photo!.url}
              alt={photo!.altText ?? label(photo!)}
              className="max-h-[78vh] w-auto max-w-full object-contain"
            />
            {count > 1 && (
              <>
                <button
                  type="button"
                  onClick={() => step(-1)}
                  aria-label="Previous photo"
                  className="absolute left-2 top-1/2 -translate-y-1/2 border border-ivory-300 bg-white/90 p-2 text-espresso hover:text-burgundy"
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  onClick={() => step(1)}
                  aria-label="Next photo"
                  className="absolute right-2 top-1/2 -translate-y-1/2 border border-ivory-300 bg-white/90 p-2 text-espresso hover:text-burgundy"
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </Overlay>
  );
};

/** "View all photos (n)" button that opens the viewer on every photo */
export const ViewAllPhotosButton = ({
  count,
  onClick,
}: {
  count: number;
  onClick: () => void;
}) =>
  count > 0 ? (
    <button
      type="button"
      onClick={onClick}
      className="mt-2 inline-flex items-center gap-1.5 text-body-sm text-burgundy hover:underline"
    >
      <LayoutGrid size={14} /> View all photos ({count})
    </button>
  ) : null;

export default PhotoViewer;
