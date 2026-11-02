import {
  deleteCategory,
  deleteProduct,
  deleteProductImage,
  getBrandOptions,
  getBrands,
  getCategories,
  getCategoryOptions,
  getProduct,
  getProducts,
  saveBrand,
  saveCategory,
  saveProduct,
  setProductStatus,
  updateProductImage,
  uploadProductImages,
} from '@/lib/api/catalog';
import {CatalogPanel} from '@/types/catalog';
import {ListParams} from '@/types/org';
import {getErrorMessage} from '@/utils/axios';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const CATALOG_KEYS = {
  CATEGORIES: 'categories',
  BRANDS: 'brands',
  PRODUCTS: 'products',
};

type Params = ListParams & {
  categoryId?: string;
  brandId?: string;
  active?: string;
};

const useInvalidate = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      Object.values(CATALOG_KEYS).map((key) =>
        queryClient.invalidateQueries({queryKey: [key]}),
      ),
    );
};

const errorToast = (fallback: string) => (error: unknown) =>
  toast.error(getErrorMessage(error, fallback));

// ---- Queries -------------------------------------------------------------

export const useCategories = (params: Params) =>
  useQuery({
    queryKey: [CATALOG_KEYS.CATEGORIES, params],
    queryFn: () => getCategories(params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useCategoryOptions = (panel: CatalogPanel) =>
  useQuery({
    queryKey: [CATALOG_KEYS.CATEGORIES, 'options', panel],
    queryFn: () => getCategoryOptions(panel),
    select: (res) => res.data.map((c) => ({value: c.id, label: c.name})),
  });

export const useBrands = (panel: CatalogPanel, params: Params) =>
  useQuery({
    queryKey: [CATALOG_KEYS.BRANDS, panel, params],
    queryFn: () => getBrands(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useBrandOptions = (panel: CatalogPanel) =>
  useQuery({
    queryKey: [CATALOG_KEYS.BRANDS, 'options', panel],
    queryFn: () => getBrandOptions(panel),
    select: (res) => res.data.map((b) => ({value: b.id, label: b.name})),
  });

export const useProducts = (panel: CatalogPanel, params: Params) =>
  useQuery({
    queryKey: [CATALOG_KEYS.PRODUCTS, panel, params],
    queryFn: () => getProducts(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useProduct = (panel: CatalogPanel, id?: string) =>
  useQuery({
    queryKey: [CATALOG_KEYS.PRODUCTS, panel, 'one', id],
    queryFn: () => getProduct(panel, id!),
    select: (res) => res.data,
    enabled: !!id,
  });

// ---- Mutations (forms show field errors inline) --------------------------

export const useSaveCategory = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: saveCategory,
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
  });
};

export const useDeleteCategory = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
    onError: errorToast('Could not delete the category'),
  });
};

export const useSaveBrand = (panel: CatalogPanel) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: Record<string, unknown> & {id?: string}) =>
      saveBrand(panel, body),
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
  });
};

export const useSaveProduct = (panel: CatalogPanel) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: (body: Record<string, unknown> & {id?: string}) =>
      saveProduct(panel, body),
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
  });
};

export const useSetProductStatus = (panel: CatalogPanel) => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => setProductStatus(panel, id, body),
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
    onError: errorToast('Could not change the status'),
  });
};

export const useDeleteProduct = () => {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: deleteProduct,
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
    onError: errorToast('Could not delete the product'),
  });
};

/** Upload / set main / remove: all return the updated product */
export const useProductImages = (panel: CatalogPanel, productId: string) => {
  const invalidate = useInvalidate();
  const done = (res: {message: string}) => {
    toast.success(res.message);
    invalidate();
  };
  return {
    upload: useMutation({
      mutationFn: (files: File[]) =>
        uploadProductImages(panel, productId, files),
      onSuccess: done,
      onError: errorToast('Could not upload the images'),
    }),
    setMain: useMutation({
      mutationFn: (imageId: string) =>
        updateProductImage(panel, productId, imageId, {isMain: true}),
      onSuccess: done,
      onError: errorToast('Could not update the image'),
    }),
    remove: useMutation({
      mutationFn: (imageId: string) =>
        deleteProductImage(panel, productId, imageId),
      onSuccess: done,
      onError: errorToast('Could not remove the image'),
    }),
  };
};
