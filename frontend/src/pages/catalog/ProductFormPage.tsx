import ProductImages from '@/components/Catalog/ProductImages';
import VariantEditor from '@/components/Catalog/VariantEditor';
import {
  ConfirmDialog,
  GenericDropdown,
  GenericInputField,
  GenericSwitch,
  GenericTextArea,
} from '@/components/Forms';
import {PageHeader} from '@/components/ui';
import {FormError, FormFooter, FormGroup} from '@/components/ui/FormLayout';
import {
  useBrandOptions,
  useCategoryOptions,
  useProduct,
  useSaveProduct,
  useSetProductStatus,
} from '@/lib/react-query/queriesAndMutations/catalog';
import {applyServerErrors} from '@/lib/validation/fieldRules';
import {
  EMPTY_PRODUCT,
  productSchema,
  ProductValues,
  toProductBody,
} from '@/lib/validation/productSchema';
import {CatalogPanel, GENDERS, Product} from '@/types/catalog';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {Link, useNavigate, useParams} from '@tanstack/react-router';
import {Loader2, Send} from 'lucide-react';
import {useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import ProductStatusBadge from './ProductStatusBadge';

const FIELDS = Object.keys(EMPTY_PRODUCT);
const toOptions = (list: readonly string[]) =>
  list.map((v) => ({value: v, label: v.charAt(0) + v.slice(1).toLowerCase()}));

const fromProduct = (p: Product): ProductValues => ({
  name: p.name,
  categoryId: p.categoryId,
  brandId: p.brandId ?? '',
  gender: p.gender,
  productType: p.productType ?? '',
  mrp: p.mrp,
  sellingPrice: p.sellingPrice,
  taxRate: p.taxRate,
  fabric: p.fabric ?? '',
  pattern: p.pattern ?? '',
  fit: p.fit ?? '',
  sleeveType: p.sleeveType ?? '',
  neckType: p.neckType ?? '',
  occasion: p.occasion ?? '',
  season: p.season ?? '',
  careInstructions: p.careInstructions ?? '',
  shortDesc: p.shortDesc ?? '',
  detailedDesc: p.detailedDesc ?? '',
  tagsText: p.tags.join(', '),
  weightKg: p.weightKg ?? '',
  returnEligible: p.returnEligible,
  returnPeriodDays: p.returnPeriodDays,
  seoTitle: p.seoTitle ?? '',
  seoDesc: p.seoDesc ?? '',
  variants: p.variants.map((v) => ({
    id: v.id,
    size: v.size,
    color: v.color,
    colorHex: v.colorHex ?? '',
    mrp: v.mrp ?? '',
    sellingPrice: v.sellingPrice ?? '',
    isActive: v.isActive,
    available: v.available,
  })),
});

/** The product form (create or edit; read-only when the user cannot edit) */
const ProductForm = ({
  panel,
  product,
  onDone,
}: {
  panel: CatalogPanel;
  product?: Product;
  onDone: (saved: Product) => void;
}) => {
  const readOnly = !!product && !product.canEdit;
  const categories = useCategoryOptions(panel);
  const brands = useBrandOptions(panel);
  const save = useSaveProduct(panel);
  const [formError, setFormError] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const navigate = useNavigate();
  const toList = () => navigate({to: `/${panel}/products`});

  const form = useForm<ProductValues>({
    resolver: zodResolver(productSchema),
    defaultValues: product ? fromProduct(product) : EMPTY_PRODUCT,
    mode: 'onTouched',
  });
  const {
    handleSubmit,
    setError,
    formState: {isSubmitting, isDirty},
  } = form;

  const submit = handleSubmit(async (values) => {
    setFormError('');
    try {
      const res = await save.mutateAsync({
        ...toProductBody(productSchema.parse(values)),
        ...(product ? {id: product.id} : {}),
      });
      onDone(res.data);
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) {
        setFormError(getErrorMessage(error, 'Could not save the product'));
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <fieldset disabled={readOnly} className="panel space-y-5 p-4 md:p-5">
          <FormGroup title="Product">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
              <GenericInputField
                name="name"
                label="Product Name"
                kind="text"
                required
                autoFocus={!product}
                placeholder="Oxford Cotton Shirt"
                className="sm:col-span-2"
              />
              <GenericDropdown
                name="categoryId"
                label="Category"
                required
                loading={categories.isPending}
                options={categories.data ?? []}
              />
              <GenericDropdown
                name="brandId"
                label="Brand"
                placeholder="No brand"
                options={brands.data ?? []}
              />
              <GenericDropdown
                name="gender"
                label="For"
                options={toOptions(GENDERS)}
              />
              <GenericInputField
                name="productType"
                label="Product Type"
                kind="text"
                placeholder="Shirt"
              />
              <GenericInputField
                name="mrp"
                label="MRP"
                kind="price"
                prefix="₹"
                required
              />
              <GenericInputField
                name="sellingPrice"
                label="Selling Price"
                kind="price"
                prefix="₹"
                required
              />
            </div>
          </FormGroup>

          <FormGroup title="Variants">
            <VariantEditor disabled={readOnly} />
          </FormGroup>

          <FormGroup title="Clothing details">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
              <GenericInputField
                name="fabric"
                label="Fabric"
                kind="text"
                placeholder="Cotton"
              />
              <GenericInputField
                name="pattern"
                label="Pattern"
                kind="text"
                placeholder="Solid"
              />
              <GenericInputField
                name="fit"
                label="Fit"
                kind="text"
                placeholder="Regular"
              />
              <GenericInputField
                name="sleeveType"
                label="Sleeve"
                kind="text"
                placeholder="Full"
              />
              <GenericInputField
                name="neckType"
                label="Neck"
                kind="text"
                placeholder="Collar"
              />
              <GenericInputField
                name="occasion"
                label="Occasion"
                kind="text"
                placeholder="Formal"
              />
              <GenericInputField
                name="season"
                label="Season"
                kind="text"
                placeholder="All season"
              />
              <GenericDropdown
                name="taxRate"
                label="GST"
                options={[0, 5, 12, 18].map((r) => ({
                  value: String(r),
                  label: `${r}%`,
                }))}
              />
              <GenericTextArea
                name="shortDesc"
                label="Short Description"
                rows={2}
                maxLength={300}
                className="sm:col-span-2"
              />
              <GenericTextArea
                name="careInstructions"
                label="Care Instructions"
                rows={2}
                maxLength={300}
                className="sm:col-span-2"
              />
              <GenericTextArea
                name="detailedDesc"
                label="Detailed Description"
                rows={3}
                maxLength={4000}
                className="sm:col-span-2 md:col-span-4"
              />
            </div>
          </FormGroup>

          <FormGroup title="Shipping & search">
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
              <GenericInputField
                name="weightKg"
                label="Weight (kg)"
                kind="text"
                inputMode="decimal"
              />
              <GenericInputField
                name="returnPeriodDays"
                label="Return Days"
                kind="quantity"
              />
              <GenericSwitch name="returnEligible" label="Returnable" />
              <GenericInputField
                name="tagsText"
                label="Tags"
                kind="text"
                placeholder="formal, cotton"
                hint="Comma separated"
              />
              <GenericInputField
                name="seoTitle"
                label="SEO Title"
                kind="text"
                maxLength={70}
                className="sm:col-span-2"
              />
              <GenericInputField
                name="seoDesc"
                label="SEO Description"
                kind="text"
                maxLength={160}
                className="sm:col-span-2"
              />
            </div>
          </FormGroup>
        </fieldset>

        {readOnly ? (
          <Link to={`/${panel}/products`} className="btn-ghost">
            Back to products
          </Link>
        ) : (
          <FormFooter
            onCancel={() => (isDirty ? setConfirmLeave(true) : toList())}
            saving={isSubmitting}
            saveLabel={product ? 'Save Changes' : 'Save as Draft'}
          />
        )}

        <ConfirmDialog
          open={confirmLeave}
          title="Discard changes?"
          message="You have unsaved changes on this form. Leaving now will lose them."
          confirmLabel="Discard"
          tone="danger"
          onConfirm={toList}
          onCancel={() => setConfirmLeave(false)}
        />
      </form>
    </FormProvider>
  );
};

/** /<panel>/products/new and /<panel>/products/:productId */
const ProductFormPage = ({panel}: {panel: CatalogPanel}) => {
  const {productId} = useParams({strict: false}) as {productId?: string};
  const navigate = useNavigate();
  const {
    data: product,
    isPending,
    isError,
    error,
  } = useProduct(panel, productId);
  const setStatus = useSetProductStatus(panel);

  const header = (
    <PageHeader
      compact
      breadcrumbs={[
        {label: 'Products', to: `/${panel}/products`},
        {label: productId ? (product?.sku ?? '…') : 'New'},
      ]}
      title={productId ? (product?.name ?? 'Product') : 'Add Product'}
      actions={
        product && (
          <div className="flex items-center gap-2">
            <ProductStatusBadge status={product.status} />
            {product.canPublish && product.status !== 'PUBLISHED' && (
              <button
                type="button"
                className="btn-primary"
                disabled={setStatus.isPending}
                onClick={() =>
                  setStatus.mutate({id: product.id, status: 'PUBLISHED'})
                }
              >
                <Send size={14} /> Publish
              </button>
            )}
          </div>
        )
      }
    />
  );

  if (!productId) {
    return (
      <>
        {header}
        <ProductForm
          panel={panel}
          // Continue on the product page to add images and publish
          onDone={(saved) =>
            navigate({
              to: `/${panel}/products/$productId`,
              params: {productId: saved.id},
            })
          }
        />
      </>
    );
  }

  return (
    <>
      {header}
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
          <Link to={`/${panel}/products`} className="btn-ghost mt-4">
            Back to products
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          <section className="panel p-4 md:p-5">
            <FormGroup title="Images">
              <ProductImages panel={panel} product={product} />
            </FormGroup>
          </section>
          <ProductForm
            key={product.updatedAt}
            panel={panel}
            product={product}
            onDone={() => undefined}
          />
        </div>
      )}
    </>
  );
};

export default ProductFormPage;
