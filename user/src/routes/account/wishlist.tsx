import {useState} from 'react';
import {createFileRoute, Link} from '@tanstack/react-router';
import {Heart, X} from 'lucide-react';
import {useAddToCart, useToggleWishlist, useWishlist} from '@/lib/queries';
import type {WishlistItem} from '@/lib/types';
import {btn, Empty, Price, ProductVisual, Spinner} from '@/components/ui';

export const Route = createFileRoute('/account/wishlist')({component: WishlistPage});

function WishCard({w}: {w: WishlistItem}) {
  const [variantId, setVariantId] = useState('');
  const add = useAddToCart();
  const remove = useToggleWishlist();
  const inStock = w.variants.filter((v) => v.stock > 0);
  const soldOut = !w.available || inStock.length === 0;
  const fewLeft = !soldOut && inStock.reduce((t, v) => t + v.stock, 0) <= 3;

  const moveToBag = () => add.mutate({variantId}, {onSuccess: () => remove.mutate({productId: w.productId, saved: true})});

  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-line bg-white">
      <div className="relative aspect-[4/5]">
        <Link to="/product/$id" params={{id: w.productId}}>
          <ProductVisual image={w.image} hex={w.colorHex} name={w.name} className={soldOut ? 'opacity-60' : ''} />
        </Link>
        <button
          onClick={() => remove.mutate({productId: w.productId, saved: true})}
          className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white shadow"
          aria-label={`Remove ${w.name} from wishlist`}
        >
          <X size={14} />
        </button>
        {soldOut && <span className="absolute left-2 top-2 rounded-sm bg-white px-1.5 py-0.5 text-[10px] font-bold uppercase">Out of stock</span>}
        {fewLeft && <span className="absolute left-2 top-2 rounded-sm bg-gold px-1.5 py-0.5 text-[10px] font-bold uppercase text-white">Only a few left</span>}
      </div>
      <div className="flex flex-1 flex-col gap-2 p-3">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-faint">{w.brand}</p>
        <p className="line-clamp-1 text-sm">{w.name}</p>
        <Price price={w.price} mrp={w.mrp} />
        {soldOut ? (
          <p className="mt-auto rounded bg-canvas py-2 text-center text-xs text-ink-soft">Sold out for now</p>
        ) : (
          <>
            <select value={variantId} onChange={(e) => setVariantId(e.target.value)} className="mt-auto rounded border border-line bg-white px-2 py-1.5 text-sm" aria-label="Choose size">
              <option value="">Select size</option>
              {w.variants.map((v) => (
                <option key={v.variantId} value={v.variantId} disabled={!v.stock}>
                  {v.size} · {v.color}
                  {!v.stock ? ' (sold out)' : ''}
                </option>
              ))}
            </select>
            <button onClick={moveToBag} disabled={!variantId || add.isPending} className={`${btn.primary} !py-2`}>
              Move to bag
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function WishlistPage() {
  const {data, isLoading} = useWishlist();
  if (isLoading) return <Spinner />;
  return (
    <div>
      <h1 className="font-serif text-3xl">Wishlist</h1>
      <p className="mb-4 text-sm text-ink-soft">
        {data?.length ?? 0} saved item{data?.length === 1 ? '' : 's'} · prices update live
      </p>
      {!data?.length ? (
        <Empty
          icon={<Heart size={28} />}
          title="Your wishlist is empty"
          text="Tap the heart on any product to save it here."
          action={
            <Link to="/products" className={btn.primary}>
              Start shopping
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {data.map((w) => (
            <WishCard key={w.productId} w={w} />
          ))}
        </div>
      )}
    </div>
  );
}
