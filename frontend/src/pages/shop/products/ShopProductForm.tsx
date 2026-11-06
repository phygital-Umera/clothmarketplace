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
import {uploadShopProductImages} from '@/lib/api/shopProduct';
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
        ...(product ? {id: product.id} : {}),
      });
      saved = res.data;
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) {
        setFormError(getErrorMessage(error, 'Could not save the product'));
      }
      return;
    }
    // New product: upload the picked images now that it exists
    if (!product && files.length) {
      try {
        await uploadShopProductImages(saved.id, files);
      } catch (error) {
        toast.error(
          getErrorMessage(
            error,
            'Product saved, but the images could not be uploaded',
          ),
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
              <GenericInputField
                name="sku"
                label="SKU"
                kind="code"
                maxLength={40}
                placeholder="Auto-generated if blank"
                hint="Letters, numbers and dashes"
              />
              <GenericDropdown
                name="status"
                label="Status"
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
                className="sm:col-span-2 md:col-span-4"
              />
              <GenericTextArea
                name="shortDesc"
                label="Short Description"
                rows={2}
                maxLength={300}
                className="sm:col-span-2 md:col-span-4"
              />
            </div>
          </FormGroup>

          <FormGroup title="Classification">
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
                    ? 'No categories yet. Add one under Masters › Categories.'
                    : undefined
                }
              />
              <GenericDropdown
                name="subcategoryId"
                label="Subcategory"
                required
                dependsOn="categoryId"
                disabled={!categoryId}
                placeholder={
                  categoryId ? 'Select subcategory' : 'Select a category first'
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
                    ? 'No subcategories in this category yet.'
                    : undefined
                }
              />
              <GenericDropdown
                name="gender"
                label="For"
                options={GENDERS.map((g) => ({value: g, label: label(g)}))}
              />
              <GenericInputField
                name="productType"
                label="Product Type"
                kind="text"
                placeholder="Shirt"
              />
            </div>
          </FormGroup>

          <FormGroup title="Sizes & colors">
            <div className="space-y-4">
              <ChipMultiSelect
                name="sizeIds"
                label="Sizes"
                required
                options={masters.sizes}
                loading={masters.loading.sizes}
                emptyHint="No sizes yet. Add them under Masters › Sizes."
              />
              <ChipMultiSelect
                name="colorIds"
                label="Colors"
                required
                options={masters.colors}
                loading={masters.loading.colors}
                emptyHint="No colors yet. Add them under Masters › Colors."
              />
            </div>
          </FormGroup>

          <FormGroup title="Pricing & stock">
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
                options={[0, 5, 12, 18].map((r) => ({
                  value: String(r),
                  label: `${r}%`,
                }))}
              />
            </div>
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

          <FormGroup title="Images">
            {product ? (
              <ShopProductImages product={product} />
            ) : (
              <PendingImages files={files} onChange={setFiles} />
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
