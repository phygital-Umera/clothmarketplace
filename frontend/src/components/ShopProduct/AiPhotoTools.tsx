import {PhotoStyle} from '@/types/shopProduct';
import {Loader2, Shirt, Sparkles, Wand2} from 'lucide-react';
import {useId, useState} from 'react';

/*
 * AI photo tools shared by the shop panel and the company panel's product
 * pages: the "Professional photo (AI)" box and the "Clean background" bar.
 * Each page passes its own mutations (they call that panel's API).
 */

export const STYLES: {value: PhotoStyle; label: string; hint: string}[] = [
  {
    value: 'GHOST',
    label: '3D, no mannequin',
    hint: 'Garment with body shape, nothing else (like big e-commerce sites)',
  },
  {
    value: 'MANNEQUIN',
    label: 'On a mannequin',
    hint: 'On a white dress-form mannequin',
  },
  {
    value: 'MODEL',
    label: 'Worn by a model',
    hint: 'A model wearing it; sarees and lehengas are draped',
  },
  {
    value: 'ENHANCE',
    label: 'Enhance my photo',
    hint: 'Your garment ironed, straightened and centred on a studio background',
  },
];
export const STYLE_LABEL: Record<PhotoStyle, string> = {
  GHOST: 'AI · 3D',
  MANNEQUIN: 'AI · Mannequin',
  MODEL: 'AI · Model',
  ENHANCE: 'AI · Enhanced',
};

/** What the tools need to know about a product photo */
type Photo = {
  id: string;
  cleanedFromId?: string | null;
  aiStyle?: PhotoStyle | null;
};

/** The shop's own photo (not one the AI or the cleaner made); professional photos are made from it */
export const ownPhoto = (images: Photo[]) =>
  images.find((i) => !i.cleanedFromId && !i.aiStyle);

/** A shop photo that can still get a clean white-background copy */
export const canCleanPhoto = (images: Photo[], img: Photo, room: number) =>
  !img.cleanedFromId &&
  !img.aiStyle &&
  !images.some((i) => i.cleanedFromId === img.id) &&
  room > 0;

/** What made the photo, in words ("AI · Model", "Clean"), or null for the shop's own photo */
export const photoKind = (photo: Photo) =>
  photo.aiStyle
    ? STYLE_LABEL[photo.aiStyle]
    : photo.cleanedFromId
      ? 'Clean'
      : null;

const BADGE =
  'whitespace-nowrap px-1 text-[10px] font-semibold uppercase leading-4 tracking-wide';

/** "Main" and what made the photo, stacked in the top-left corner so they never cover each other */
export const PhotoBadges = ({photo}: {photo: Photo & {isMain?: boolean}}) => {
  const kind = photoKind(photo);
  return (
    <div className="pointer-events-none absolute left-0 top-0 flex flex-col items-start">
      {photo.isMain && (
        <span className={`${BADGE} bg-burgundy text-ivory`}>Main</span>
      )}
      {kind && (
        <span
          className={`${BADGE} text-white ${photo.aiStyle ? 'bg-indigo-700' : 'bg-emerald-700'}`}
          title={
            photo.aiStyle
              ? 'Professional photo made by AI'
              : 'Clean white-background photo'
          }
        >
          {kind}
        </span>
      )}
    </div>
  );
};

/** "Professional photo (AI)": pick a style, optional garment details, make the photo */
export const ProfessionalPhotoBox = ({
  sourceId,
  room,
  aiReady,
  pending,
  onMake,
}: {
  /** The shop photo the AI works from */
  sourceId: string;
  /** Free photo slots left (max 8) */
  room: number;
  aiReady: boolean | undefined;
  pending: boolean;
  onMake: (input: {
    imageId: string;
    style: PhotoStyle;
    details: string;
  }) => void;
}) => {
  const inputId = useId();
  const [style, setStyle] = useState<PhotoStyle>('GHOST');
  const [details, setDetails] = useState('');

  return (
    <div className="mt-3 rounded border border-indigo-200 bg-indigo-50/60 p-3 text-body-sm text-espresso">
      <p className="flex items-center gap-1.5 font-semibold">
        <Shirt size={15} className="text-indigo-700" /> Professional photo (AI)
      </p>
      <p className="mt-0.5 text-xs text-on-surface-variant">
        From your photo of the garment (flat on a bed or floor is fine), the AI
        makes a studio catalogue photo. Works for shirts, kurtas, sarees,
        lehengas and more. Your photo is kept; the new photo becomes the main
        one, and you can make colour photos from it.
      </p>
      <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
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
            <span className="block text-[11px] leading-snug text-on-surface-variant">
              {s.hint}
            </span>
          </label>
        ))}
      </div>
      <label
        className="mt-2 block text-xs font-semibold"
        htmlFor={`${inputId}-details`}
      >
        Garment details{' '}
        <span className="font-normal text-on-surface-variant">
          (optional, helps the AI keep it exact)
        </span>
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
        The colour is measured from your photo; men's / women's / kids' comes
        from the product.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          disabled={!aiReady || pending || room <= 0}
          onClick={() =>
            onMake({imageId: sourceId, style, details: details.trim()})
          }
          className="btn-primary inline-flex items-center gap-1.5 disabled:opacity-60"
        >
          {pending ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Wand2 size={14} />
          )}
          {pending ? 'Making the photo… (10–40 s)' : 'Make professional photo'}
        </button>
        {aiReady === false && (
          <span className="text-xs text-amber-800">
            Needs the free Cloudflare AI keys in the backend .env (steps:
            backend/docs/colour-photos-setup.md).
          </span>
        )}
        {room <= 0 && (
          <span className="text-xs text-amber-800">
            8 photos already; delete one first.
          </span>
        )}
      </div>
      <p className="mt-1.5 text-[11px] text-on-surface-variant">
        The AI redraws the garment, so check small details (prints, borders,
        labels) before you publish it.
      </p>
    </div>
  );
};

/** "Clean background" bar: the garment on plain white, from a photo taken on a bed, floor or mat */
export const CleanPhotoBar = ({
  pending,
  onClean,
}: {
  pending: boolean;
  onClean: () => void;
}) => (
  <div className="mt-3 flex flex-wrap items-center gap-3 rounded border border-ivory-300 bg-ivory-100 px-3 py-2 text-body-sm text-espresso">
    <span className="min-w-0 flex-1">
      Photo taken on a bed, floor or mat? Make a clean catalogue photo: the
      garment on plain white, centred, with a soft shadow. Your photo is kept,
      and colour photos made from the clean photo come out on white too.
    </span>
    <button
      type="button"
      disabled={pending}
      onClick={onClean}
      className="btn-primary inline-flex shrink-0 items-center gap-1.5 disabled:opacity-60"
    >
      {pending ? (
        <Loader2 size={14} className="animate-spin" />
      ) : (
        <Sparkles size={14} />
      )}
      {pending ? 'Cleaning… (10–20 s)' : 'Clean background'}
    </button>
  </div>
);
