import {ConfirmDialog} from '@/components/Forms';
import AiColorPreview from '@/components/ShopProduct/AiColorPreview';
import {ShopProductImages} from '@/components/ShopProduct/ShopProductImages';
import {PageHeader} from '@/components/ui';
import {FormGroup} from '@/components/ui/FormLayout';
import {
  useDeleteShopProduct,
  useShopProduct,
} from '@/lib/react-query/queriesAndMutations/shopProduct';
import ProductStatusBadge from '@/pages/catalog/ProductStatusBadge';
import {getErrorMessage} from '@/utils/axios';
import {Link, useNavigate, useParams} from '@tanstack/react-router';
import {Loader2, Pencil, Trash2} from 'lucide-react';
import {ReactNode, useEffect, useState} from 'react';
import {StockBadge} from './ShopProductList';

const money = (n: number) =>
  `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;
const title = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

const Detail = ({
  label,
  children,
  wide,
}: {
  label: string;
  children: ReactNode;
  wide?: boolean;
}) => (
  <div className={wide ? 'sm:col-span-2 md:col-span-4' : ''}>
    <dt className="text-label-caps uppercase text-outline">{label}</dt>
    <dd className="mt-1 whitespace-pre-line text-body-md text-espresso">
      {children || <span className="text-outline">None</span>}
    </dd>
  </div>
);

/** /shop-admin/products/:productId */
const ShopProductDetail = () => {
  const {productId} = useParams({strict: false}) as {productId: string};
  const navigate = useNavigate();
  const {data: p, isPending, isError, error} = useShopProduct(productId);
  const remove = useDeleteShopProduct();
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[
          {label: 'Products', to: '/shop-admin/products'},
          {label: p?.sku ?? '…'},
        ]}
        title={p?.name ?? 'Product'}
        actions={
          p && (
            <div className="flex items-center gap-2">
              <ProductStatusBadge status={p.status} />
              <button
                type="button"
                className="btn-ghost"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 size={14} /> Delete
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() =>
                  navigate({
                    to: '/shop-admin/products/edit/$productId',
                    params: {productId: p.id},
                  })
                }
              >
                <Pencil size={14} /> Edit
              </button>
            </div>
          )
        }
      />

      {isPending ? (
        <div className="flex items-center gap-2 py-16 text-on-surface-variant">
          <Loader2 size={16} className="animate-spin" /> Loading product…
        </div>
      ) : isError ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-serif text-headline-sm text-burgundy">
            Product not available
          </p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {getErrorMessage(error, 'It may have been removed.')}
          </p>
          <Link to="/shop-admin/products" className="btn-ghost mt-4">
            Back to products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="panel p-4 md:p-5">
            <FormGroup title="AI color preview">
              <AiColorPreview product={p} />
            </FormGroup>
          </section>

          <section className="panel space-y-5 p-4 md:p-5">
            <FormGroup title="Original images">
              <ShopProductImages product={p} />
            </FormGroup>

            <FormGroup title="Details">
              <dl className="grid gap-x-4 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
                <Detail label="SKU">{p.sku}</Detail>
                <Detail label="Category">{p.category.name}</Detail>
                <Detail label="Subcategory">{p.subcategory?.name}</Detail>
                <Detail label="For">{title(p.gender)}</Detail>
                <Detail label="Price">{money(p.mrp)}</Detail>
                <Detail label="Discount Price">
                  {p.sellingPrice < p.mrp
                    ? `${money(p.sellingPrice)} (${Math.round((1 - p.sellingPrice / p.mrp) * 100)}% off)`
                    : null}
                </Detail>
                <Detail label="Stock">
                  <StockBadge qty={p.stockQuantity} />
                </Detail>
                <Detail label="GST">{`${p.taxRate}%`}</Detail>
                <Detail label="Sizes" wide>
                  <span className="flex flex-wrap gap-1.5">
                    {p.sizes.map((s) => (
                      <span
                        key={s.id}
                        className="border border-ivory-300 px-2 py-0.5 text-body-sm"
                      >
                        {s.name}
                      </span>
                    ))}
                  </span>
                </Detail>
                <Detail label="Colors" wide>
                  <span className="flex flex-wrap gap-3">
                    {p.colors.map((c) => (
                      <span
                        key={c.id}
                        className="inline-flex items-center gap-1.5 text-body-sm"
                      >
                        <span
                          aria-hidden
                          className="h-3.5 w-3.5 rounded-full border border-hairline"
                          style={{backgroundColor: c.hexCode}}
                        />
                        {c.name}
                      </span>
                    ))}
                  </span>
                </Detail>
                <Detail label="Description" wide>
                  {p.detailedDesc}
                </Detail>
                {p.shortDesc && (
                  <Detail label="Short Description" wide>
                    {p.shortDesc}
                  </Detail>
                )}
              </dl>
            </FormGroup>

            <FormGroup title="Clothing details">
              <dl className="grid gap-x-4 gap-y-4 sm:grid-cols-2 md:grid-cols-4">
                <Detail label="Product Type">{p.productType}</Detail>
                <Detail label="Fabric">{p.fabric}</Detail>
                <Detail label="Pattern">{p.pattern}</Detail>
                <Detail label="Fit">{p.fit}</Detail>
                <Detail label="Sleeve">{p.sleeveType}</Detail>
                <Detail label="Neck">{p.neckType}</Detail>
                <Detail label="Occasion">{p.occasion}</Detail>
                <Detail label="Season">{p.season}</Detail>
                <Detail label="Tags">{p.tags.join(', ')}</Detail>
                <Detail label="Added">
                  {new Date(p.createdAt).toLocaleDateString()}
                  {p.createdBy ? ` by ${p.createdBy.fullname}` : ''}
                </Detail>
                <Detail label="Care Instructions" wide>
                  {p.careInstructions}
                </Detail>
              </dl>
            </FormGroup>
          </section>
        </div>
      )}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete Product?"
        message={`"${p?.name}" will be archived and removed from your product list. Order history is kept.`}
        confirmLabel="Delete Product"
        tone="danger"
        onConfirm={async () => {
          if (!p) return;
          try {
            await remove.mutateAsync(p.id);
            navigate({to: '/shop-admin/products'});
          } catch {
            // Error is handled by React Query toast
          }
        }}
        onCancel={() => setConfirmDelete(false)}
      />
    </>
  );
};

export default ShopProductDetail;
