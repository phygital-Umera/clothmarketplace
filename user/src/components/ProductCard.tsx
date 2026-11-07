import {Link, useNavigate} from '@tanstack/react-router';
import {Heart} from 'lucide-react';
import {useAuth} from '@/lib/auth';
import {useToggleWishlist, useWishlistIds} from '@/lib/queries';
import type {ProductCard as Card} from '@/lib/types';
import {Badge, Price, ProductVisual, RatingChip} from './ui';

export function WishlistHeart({productId, className = ''}: {productId: string; className?: string}) {
  const {signedIn} = useAuth();
  const navigate = useNavigate();
  const {data: ids} = useWishlistIds();
  const toggle = useToggleWishlist();
  const saved = !!ids?.includes(productId);
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (!signedIn) {
          navigate({to: '/signin', search: {redirect: window.location.pathname + window.location.search}});
          return;
        }
        toggle.mutate({productId, saved});
      }}
      aria-label={saved ? 'Remove from wishlist' : 'Save to wishlist'}
      aria-pressed={saved}
      className={`flex h-8 w-8 items-center justify-center rounded-full bg-white/95 shadow-sm transition hover:scale-105 ${className}`}
    >
      <Heart size={15} className={saved ? 'fill-brand text-brand' : 'text-ink-soft'} />
    </button>
  );
}

export default function ProductCard({p}: {p: Card}) {
  return (
    <Link
      to="/product/$id"
      params={{id: p.slug ?? p.id}}
      className="group flex flex-col overflow-hidden rounded-md border border-line bg-white transition hover:shadow-md"
    >
      <div className={`relative aspect-[4/5] overflow-hidden ${p.inStock ? '' : 'opacity-60'}`}>
        <ProductVisual image={p.image} hex={p.colors[0]?.hex} name={p.name} className="transition duration-300 group-hover:scale-[1.03]" />
        <div className="absolute left-2 top-2">
          <Badge kind={p.badge} />
        </div>
        <WishlistHeart productId={p.id} className="absolute right-2 top-2" />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{p.brand}</p>
        <p className="line-clamp-1 text-sm text-ink">
          {p.name}
          {p.colors.length === 1 && <span className="text-ink-soft"> – {p.colors[0].name}</span>}
        </p>
        <Price price={p.price} mrp={p.mrp} />
        <div className="mt-auto flex items-center justify-between pt-1">
          <RatingChip avg={p.rating.avg} count={p.rating.count} />
          {p.colors.length > 1 && (
            <span className="flex -space-x-1" aria-label={`${p.colors.length} colours`}>
              {p.colors.slice(0, 4).map((c) => (
                <span key={c.name} className="h-3 w-3 rounded-full border border-white" style={{backgroundColor: c.hex ?? '#ccc'}} title={c.name} />
              ))}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({items, cols = 'lg:grid-cols-4'}: {items: Card[]; cols?: string}) {
  return (
    <div className={`grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 ${cols}`}>
      {items.map((p) => (
        <ProductCard key={p.id} p={p} />
      ))}
    </div>
  );
}
