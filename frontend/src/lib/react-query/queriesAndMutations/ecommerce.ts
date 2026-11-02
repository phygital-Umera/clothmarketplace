import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getBrands,
  getInventory,
  adjustStock,
  getStockMovements,
  getOrders,
  getOrder,
  updateOrderStatus,
  getReturns,
  ProductListParams,
  InventoryListParams,
  OrderListParams,
} from '@/lib/api/ecommerce';
import {getErrorMessage} from '@/utils/axios';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const ECOMM_KEYS = {
  PRODUCTS: 'ecomm_products',
  INVENTORY: 'ecomm_inventory',
  MOVEMENTS: 'ecomm_movements',
  ORDERS: 'ecomm_orders',
  RETURNS: 'ecomm_returns',
  CATEGORIES: 'ecomm_categories',
  BRANDS: 'ecomm_brands',
};

export const useProducts = (panel: string, params: ProductListParams) =>
  useQuery({
    queryKey: [ECOMM_KEYS.PRODUCTS, panel, params],
    queryFn: () => getProducts(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useProduct = (panel: string, id?: string) =>
  useQuery({
    queryKey: [ECOMM_KEYS.PRODUCTS, panel, 'one', id],
    queryFn: () => getProduct(panel, id!),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useCreateProduct = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => createProduct(panel, data),
    onSuccess: () => {
      toast.success('Product created successfully');
      queryClient.invalidateQueries({queryKey: [ECOMM_KEYS.PRODUCTS]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to create product'));
    },
  });
};

export const useCategories = (panel: string) =>
  useQuery({
    queryKey: [ECOMM_KEYS.CATEGORIES, panel],
    queryFn: () => getCategories(panel),
    select: (res) => res.data,
  });

export const useBrands = (panel: string) =>
  useQuery({
    queryKey: [ECOMM_KEYS.BRANDS, panel],
    queryFn: () => getBrands(panel),
    select: (res) => res.data,
  });

export const useInventory = (panel: string, params: InventoryListParams) =>
  useQuery({
    queryKey: [ECOMM_KEYS.INVENTORY, panel, params],
    queryFn: () => getInventory(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useAdjustStock = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => adjustStock(panel, data),
    onSuccess: () => {
      toast.success('Stock adjusted successfully');
      queryClient.invalidateQueries({queryKey: [ECOMM_KEYS.INVENTORY]});
      queryClient.invalidateQueries({queryKey: [ECOMM_KEYS.MOVEMENTS]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to adjust stock'));
    },
  });
};

export const useStockMovements = (panel: string, params: any) =>
  useQuery({
    queryKey: [ECOMM_KEYS.MOVEMENTS, panel, params],
    queryFn: () => getStockMovements(panel, params),
    select: (res) => res.data,
  });

export const useOrders = (panel: string, params: OrderListParams) =>
  useQuery({
    queryKey: [ECOMM_KEYS.ORDERS, panel, params],
    queryFn: () => getOrders(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useOrder = (panel: string, id?: string) =>
  useQuery({
    queryKey: [ECOMM_KEYS.ORDERS, panel, 'one', id],
    queryFn: () => getOrder(panel, id!),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useUpdateOrderStatus = (panel: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({id, data}: {id: string; data: any}) =>
      updateOrderStatus(panel, id, data),
    onSuccess: () => {
      toast.success('Order status updated');
      queryClient.invalidateQueries({queryKey: [ECOMM_KEYS.ORDERS]});
    },
    onError: (err) => {
      toast.error(getErrorMessage(err, 'Failed to update order status'));
    },
  });
};

export const useReturns = (panel: string, params: any) =>
  useQuery({
    queryKey: [ECOMM_KEYS.RETURNS, panel, params],
    queryFn: () => getReturns(panel, params),
    select: (res) => res.data,
  });
