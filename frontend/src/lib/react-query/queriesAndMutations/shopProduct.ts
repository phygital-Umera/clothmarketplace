import {
  deleteShopProduct,
  deleteShopProductImage,
  deleteShopProductPreview,
  generateShopProductPreviews,
  getShopProduct,
  getShopProducts,
  saveShopProduct,
  updateShopProductImage,
  uploadShopProductImages,
  cleanShopProductImage,
  professionalShopProductImage,
  getAiStatus,
  PhotoPanel,
} from '@/lib/api/shopProduct';
import {CATALOG_KEYS} from '@/lib/react-query/queriesAndMutations/catalog';
import {PhotoStyle, ShopProduct, ShopProductParams} from '@/types/shopProduct';
import {getErrorMessage} from '@/utils/axios';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const SHOP_PRODUCT_KEYS = {
  PRODUCTS: 'shop-products',
  PRODUCT: 'shop-product',
};

const errorToast = (fallback: string) => (error: unknown) =>
  toast.error(getErrorMessage(error, fallback));

/** Refresh the list; put a fresh detail straight into the cache */
const useRefresh = () => {
  const queryClient = useQueryClient();
  return (product?: ShopProduct) => {
    queryClient.invalidateQueries({queryKey: [SHOP_PRODUCT_KEYS.PRODUCTS]});
    if (product) {
      queryClient.setQueryData(
        [SHOP_PRODUCT_KEYS.PRODUCT, product.id],
        product,
      );
    } else {
      queryClient.invalidateQueries({queryKey: [SHOP_PRODUCT_KEYS.PRODUCT]});
    }
  };
};

export const useShopProducts = (params: ShopProductParams) =>
  useQuery({
    queryKey: [SHOP_PRODUCT_KEYS.PRODUCTS, params],
    queryFn: () => getShopProducts(params).then((r) => r.data),
    placeholderData: keepPreviousData,
  });

export const useShopProduct = (id?: string) =>
  useQuery({
    queryKey: [SHOP_PRODUCT_KEYS.PRODUCT, id],
    queryFn: () => getShopProduct(id as string).then((r) => r.data),
    enabled: !!id,
  });

export const useSaveShopProduct = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: saveShopProduct,
    onSuccess: (res, vars) => {
      toast.success(
        vars.id
          ? `${res.data.name} updated successfully`
          : `${res.data.name} added successfully`,
      );
      refresh(res.data);
    },
    onError: errorToast('Failed to save product'),
  });
};

export const useDeleteShopProduct = () => {
  const refresh = useRefresh();
  return useMutation({
    mutationFn: deleteShopProduct,
    onSuccess: () => {
      toast.success('Product deleted successfully');
      refresh();
    },
    onError: errorToast('Failed to delete product'),
  });
};

export const useShopProductImages = (productId: string) => {
  const refresh = useRefresh();
  const done = (res: {message: string; data: ShopProduct}) => {
    toast.success(res.message);
    refresh(res.data);
  };
  return {
    upload: useMutation({
      mutationFn: (files: File[]) => uploadShopProductImages(productId, files),
      onSuccess: done,
      onError: errorToast('Could not upload the images'),
    }),
    setMain: useMutation({
      mutationFn: (imageId: string) =>
        updateShopProductImage(productId, imageId, {isMain: true}),
      onSuccess: done,
      onError: errorToast('Could not update the image'),
    }),
    remove: useMutation({
      mutationFn: (imageId: string) =>
        deleteShopProductImage(productId, imageId),
      onSuccess: done,
      onError: errorToast('Could not remove the image'),
    }),
    clean: useMutation({
      mutationFn: (imageId: string) =>
        cleanShopProductImage(productId, imageId),
      onSuccess: done,
      onError: errorToast('Could not clean the background'),
    }),
    professional: useMutation({
      mutationFn: ({
        imageId,
        style,
        details,
      }: {
        imageId: string;
        style: PhotoStyle;
        details?: string;
      }) => professionalShopProductImage(productId, imageId, style, details),
      onSuccess: done,
      onError: errorToast('Could not make the professional photo'),
    }),
  };
};

/** Are AI photos (Cloudflare keys) set up on the server? */
export const useAiStatus = (panel: PhotoPanel = 'shop-admin') =>
  useQuery({
    queryKey: ['ai-status', panel],
    queryFn: async () => (await getAiStatus(panel)).data.ready,
    staleTime: 60_000,
  });

/** AI photo tools on the company panel's product page; its catalog product is refetched after each */
export const useCompanyPhotoTools = (productId: string) => {
  const queryClient = useQueryClient();
  const done = (res: {message: string}) => {
    toast.success(res.message);
    queryClient.invalidateQueries({queryKey: [CATALOG_KEYS.PRODUCTS]});
  };
  return {
    clean: useMutation({
      mutationFn: (imageId: string) =>
        cleanShopProductImage(productId, imageId, 'company-admin'),
      onSuccess: done,
      onError: errorToast('Could not clean the background'),
    }),
    professional: useMutation({
      mutationFn: ({
        imageId,
        style,
        details,
      }: {
        imageId: string;
        style: PhotoStyle;
        details?: string;
      }) =>
        professionalShopProductImage(
          productId,
          imageId,
          style,
          details,
          'company-admin',
        ),
      onSuccess: done,
      onError: errorToast('Could not make the professional photo'),
    }),
  };
};

export const useShopProductPreviews = (productId: string) => {
  const refresh = useRefresh();
  return {
    generate: useMutation({
      mutationFn: (body: {colorIds: string[]; imageId?: string}) =>
        generateShopProductPreviews(productId, body),
      onSuccess: (res, vars) => {
        const sourceId = vars.imageId ?? res.data.images[0]?.id;
        const failed = (res.data.previews ?? []).filter(
          (p) =>
            p.sourceImageId === sourceId &&
            vars.colorIds.includes(p.colorId) &&
            p.status === 'FAILED',
        ).length;
        if (failed) toast.error(res.message);
        else toast.success(res.message);
        refresh(res.data);
      },
      onError: errorToast('Could not generate the preview'),
    }),
    remove: useMutation({
      mutationFn: (previewId: string) =>
        deleteShopProductPreview(productId, previewId),
      onSuccess: (res) => {
        toast.success(res.message);
        refresh(res.data);
      },
      onError: errorToast('Could not remove the preview'),
    }),
  };
};
