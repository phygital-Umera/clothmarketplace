import {
  ConfirmDialog,
  GenericDropdown,
  GenericInputField,
  GenericTextArea,
} from '@/components/Forms';
import ChipMultiSelect from '@/components/ShopProduct/ChipMultiSelect';
import {
  PendingImages,
  ShopProductImages,
} from '@/components/ShopProduct/ShopProductImages';
import useProductMasters from '@/components/ShopProduct/useProductMasters';
import {PageHeader} from '@/components/ui';
import {FormError, FormFooter, FormGroup} from '@/components/ui/FormLayout';
import {
  cleanShopProductImage,
  generateShopProductPreviews,
} from '@/lib/api/shopProduct';
import {
  useSaveShopProduct,
  useShopProduct,
} from '@/lib/react-query/queriesAndMutations/shopProduct';
import {applyServerErrors} from '@/lib/validation/fieldRules';
import {
  EMPTY_SHOP_PRODUCT,
  fromShopProduct,
  shopProductSchema,
  ShopProductValues,
  toShopProductBody,
} from '@/lib/validation/shopProductSchema';
import {GENDERS} from '@/types/catalog';
import {SHOP_PRODUCT_STATUSES, ShopProduct} from '@/types/shopProduct';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {Link, useNavigate, useParams} from '@tanstack/react-router';
import {Loader2} from 'lucide-react';
import {useEffect, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import toast from 'react-hot-toast';

const FIELDS = Object.keys(EMPTY_SHOP_PRODUCT);
const label = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

const Form = ({product}: {product?: ShopProduct}) => {
  const navigate = useNavigate();
  const save = useSaveShopProduct();
  const [formError, setFormError] = useState('');
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  // Make a photo in each selected colour from the first photo (AI), right after saving
  const [colourPhotos, setColourPhotos] = useState(false);
  // Put the garment of the first photo on a clean white background, right after saving
  const [cleanPhoto, setCleanPhoto] = useState(false);

  const form = useForm<ShopProductValues>({
    resolver: zodResolver(shopProductSchema),
    defaultValues: product ? fromShopProduct(product) : EMPTY_SHOP_PRODUCT,
    mode: 'onTouched',
  });
  const {
    handleSubmit,
    setError,
    watch,
    formState: {isSubmitting, isDirty},
  } = form;
  const categoryId = watch('categoryId');
  const masters = useProductMasters(categoryId, product);

  const toDetail = (id: string) =>
    navigate({to: '/shop-admin/products/$productId', params: {productId: id}});
  const leave = () =>
    product ? toDetail(product.id) : navigate({to: '/shop-admin/products'});

  const submit = handleSubmit(async (values) => {
    setFormError('');
    let saved: ShopProduct;
    try {
      const res = await save.mutateAsync({
        ...toShopProductBody(shopProductSchema.parse(values)),
        ...(product ? {id: product.id} : {files}),
      });
      saved = res.data;
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) {
        setFormError(getErrorMessage(error, 'Could not save the product'));
      }
      return;
    }
    // Photos were saved with the product. The first one can get a clean background
    // (it becomes the main photo); colour photos are made from that photo.
    const firstId = saved.images?.[0]?.id;
    let sourceId = firstId;
    if (!product && cleanPhoto && firstId) {
      const busy = toast.loading('Cleaning the photo background…');
      try {
        const res = await cleanShopProductImage(saved.id, firstId);
        sourceId =
          res.data.images.find((i) => i.cleanedFromId === firstId)?.id ??
          firstId;
        toast.success(res.message, {id: busy});
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            'Product saved, but the background could not be cleaned',
          ),
          {id: busy},
        );
      }
    }
    if (!product && colourPhotos && sourceId) {
      const colorIds = (values.colorIds ?? []).slice(0, 6);
      const busy = toast.loading(
        `Making photos in ${colorIds.length} colour${colorIds.length > 1 ? 's' : ''}…`,
      );
      try {
        const res = await generateShopProductPreviews(saved.id, {
          colorIds,
          imageId: sourceId,
        });
        toast.success(res.message, {id: busy});
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            'Product saved, but the colour photos could not be made',
          ),
          {id: busy},
        );
      }
    }
    toDetail(saved.id);
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="space-y-4">
        <FormError message={formError} />
        <div className="panel space-y-5 p-4 md:p-5">
          <p className="rounded border border-ivory-300 bg-ivory-100 px-3 py-2 text-body-sm text-espresso">
            Fill the fields marked <span className="text-error">*</span>: name,
            description, category, sizes, colours, price and stock. Everything
            else is optional and can be added later.
          </p>
          <FormGroup
            title="Product"
            description="What the customer sees: the name, a description and whether it is on the online store."
          >
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
              <GenericInputField
                name="sku"
                label="SKU"
                kind="code"
                maxLength={40}
                placeholder="Auto-generated if blank"
                hint="Your own product code. Leave blank and one is made for you."
              />
              <GenericDropdown
                name="status"
                label="Status"
                hint="Draft: saved, not on the online store. Published: shown on the online store."
                options={SHOP_PRODUCT_STATUSES.map((s) => ({
                  value: s,
                  label: label(s),
                }))}
              />
              <GenericTextArea
                name="detailedDesc"
                label="Description"
                required
                rows={4}
                maxLength={4000}
                placeholder="Fabric feel, fit, styling notes…"
                hint="A few lines about the fabric, fit and how to wear it."
                className="sm:col-span-2 md:col-span-4"
              />
              <GenericTextArea
                name="shortDesc"
                label="Short Description"
                hint="Optional one-line summary."
                rows={2}
                maxLength={300}
                className="sm:col-span-2 md:col-span-4"
              />
            </div>
          </FormGroup>

          <FormGroup
            title="Classification"
            description="Where the product shows up in the online store's menus and filters."
          >
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
              <GenericDropdown
                name="categoryId"
                label="Category"
                required
                placeholder="Select category"
                loading={masters.loading.categories}
                options={masters.categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
                hint={
                  !masters.loading.categories && !masters.categories.length
                    ? 'No categories yet. Add one under Setup (Masters) › Categories.'
                    : 'For example Shirts, Trousers, Sarees.'
                }
              />
              <GenericDropdown
                name="subcategoryId"
                label="Subcategory"
                dependsOn="categoryId"
                disabled={!categoryId}
                placeholder={
                  categoryId ? 'None (optional)' : 'Select a category first'
                }
                loading={!!categoryId && masters.loading.subcategories}
                options={
                  categoryId
                    ? masters.subcategories.map((s) => ({
                        value: s.id,
                        label: s.name,
                      }))
                    : []
                }
                hint={
                  categoryId &&
                  !masters.loading.subcategories &&
                  !masters.subcategories.length
                    ? 'None in this category. You can leave it blank.'
                    : 'Optional. A narrower group, e.g. Formal Shirts.'
                }
              />
              <GenericDropdown
                name="gender"
                label="For"
                hint="Who wears it: used in store filters and AI photos."
                options={GENDERS.map((g) => ({value: g, label: label(g)}))}
              />
              <GenericInputField
                name="productType"
                label="Product Type"
                kind="text"
                placeholder="Shirt"
                hint="Optional, e.g. Shirt, Kurta, Jeans."
              />
            </div>
          </FormGroup>

          <FormGroup
            title="Sizes & colors"
            description="Tap every size and colour you have. Each size + colour pair (for example M + Red) gets its own stock count and barcode. Common sizes and colours are already listed; add others under Setup (Masters)."
          >
            <div className="space-y-4">
              <ChipMultiSelect
                name="sizeIds"
                label="Sizes"
                required
                options={masters.sizes}
                loading={masters.loading.sizes}
                hint="Sarees and dupattas: pick Free Size."
                emptyHint="No sizes yet. Add them under Setup (Masters) › Sizes."
              />
              <ChipMultiSelect
                name="colorIds"
                label="Colors"
                required
                options={masters.colors}
                loading={masters.loading.colors}
                hint="Pick the colours you have in stock."
                emptyHint="No colours yet. Add them under Setup (Masters) › Colors."
              />
            </div>
          </FormGroup>

          <FormGroup
            title="Pricing & stock"
            description="Price is the MRP on the tag. If you sell for less, put that in Discount Price."
          >
            <div className="grid gap-x-4 gap-y-3 sm:grid-cols-2 md:grid-cols-4">
              <GenericInputField
                name="mrp"
                label="Price"
                kind="price"
                prefix="₹"
                required
              />
              <GenericInputField
                name="sellingPrice"
                label="Discount Price"
                kind="price"
                prefix="₹"
                hint="Leave blank for no discount"
              />
              <GenericInputField
                name="stockQuantity"
                label="Stock Quantity"
                kind="quantity"
                required
              />
              <GenericDropdown
                name="taxRate"
                label="GST"
                hint="GST rate on this item."
                options={[0, 5, 12, 18].map((r) => ({
                  value: String(r),
                  label: `${r}%`,
                }))}
              />
            </div>
          </FormGroup>

          <FormGroup
            title="Clothing details"
            description="All optional. They help customers search and filter on the online store."
          >
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
              <GenericInputField
                name="tagsText"
                label="Tags"
                kind="text"
                placeholder="formal, cotton"
                hint="Comma separated"
              />
              <GenericTextArea
                name="careInstructions"
                label="Care Instructions"
                rows={2}
                maxLength={300}
                className="sm:col-span-2 md:col-span-4"
              />
            </div>
          </FormGroup>

          <FormGroup
            title="Images"
            description="Up to 8 photos; the first is the main one. A photo on a bed or floor is fine: the options below can clean it up."
          >
            {product ? (
              <ShopProductImages product={product} />
            ) : (
              <div className="space-y-3">
                <PendingImages files={files} onChange={setFiles} />
                <label className="flex items-start gap-2 text-body-sm text-espresso">
                  <input
                    type="checkbox"
                    checked={cleanPhoto}
                    disabled={!files.length}
                    onChange={(e) => setCleanPhoto(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-burgundy"
                  />
                  <span>
                    Clean the background of the first photo
                    <span className="block text-xs text-on-surface-variant">
                      For photos taken on a bed, floor or mat: the garment is
                      put on plain white, centred, and becomes the main photo.
                      Your photo is kept as well.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-body-sm text-espresso">
                  <input
                    type="checkbox"
                    checked={colourPhotos}
                    disabled={!files.length}
                    onChange={(e) => setColourPhotos(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-burgundy"
                  />
                  <span>
                    Make a photo in each selected colour
                    <span className="block text-xs text-on-surface-variant">
                      Made from the first photo after saving, up to 6 colours.
                      Uses Cloudflare AI when its keys are set, otherwise a
                      built-in recolour. You can also make or redo them on the
                      product page.
                    </span>
                  </span>
                </label>
              </div>
            )}
          </FormGroup>
        </div>

        <FormFooter
          onCancel={() =>
            isDirty || files.length ? setConfirmLeave(true) : leave()
          }
          saving={isSubmitting}
          saveLabel={product ? 'Save Changes' : 'Save Product'}
        />

        <ConfirmDialog
          open={confirmLeave}
          title="Discard changes?"
          message="You have unsaved changes on this form. Leaving now will lose them."
          confirmLabel="Discard"
          tone="danger"
          onConfirm={leave}
          onCancel={() => setConfirmLeave(false)}
        />
      </form>
    </FormProvider>
  );
};

/** /shop-admin/products/new and /shop-admin/products/edit/:productId */
const ShopProductForm = () => {
  const {productId} = useParams({strict: false}) as {productId?: string};
  const {data: product, isPending, isError, error} = useShopProduct(productId);

  const header = (
    <PageHeader
      compact
      breadcrumbs={[
        {label: 'Products', to: '/shop-admin/products'},
        {label: productId ? (product?.sku ?? '…') : 'New'},
      ]}
      title={productId ? `Edit ${product?.name ?? 'Product'}` : 'Add Product'}
    />
  );

  if (!productId) {
    return (
      <>
        {header}
        <Form />
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
          <Link to="/shop-admin/products" className="btn-ghost mt-4">
            Back to products
          </Link>
        </div>
      ) : (
        // Images save on their own; keep the form state across those updates
        <Form key={product.id} product={product} />
      )}
    </>
  );
};

export default ShopProductForm;
