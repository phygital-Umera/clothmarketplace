import {ApiResponse} from '@/types';
import {Brand, CatalogPanel, Category, Option, Product} from '@/types/catalog';
import {ListParams, ListResult} from '@/types/org';
import {api} from '@/utils/axios';

// The response interceptor already unwraps axios' `res.data`
type Res<T> = Promise<ApiResponse<T>>;
type Body = Record<string, unknown>;
type Params = ListParams & {
  categoryId?: string;
  brandId?: string;
  active?: string;
  gender?: string;
};

const clean = (params: Params) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  );

// Categories (super admin) and pickers (everyone)
export const getCategories = (params: Params) =>
  api.get('/super-admin/categories', {params: clean(params)}) as unknown as Res<
    ListResult<Category>
  >;
export const getCategoryOptions = (panel: CatalogPanel) =>
  api.get(`/${panel}/categories/options`) as unknown as Res<Option[]>;
export const saveCategory = ({id, ...body}: Body & {id?: string}) =>
  (id
    ? api.patch(`/super-admin/categories/${id}`, body)
    : api.post('/super-admin/categories', body)) as unknown as Res<Category>;
export const deleteCategory = (id: string) =>
  api.delete(`/super-admin/categories/${id}`) as unknown as Res<object>;

// Brands (super admin: global; company admin: own)
export const getBrands = (panel: CatalogPanel, params: Params) =>
  api.get(`/${panel}/brands`, {params: clean(params)}) as unknown as Res<
    ListResult<Brand>
  >;
export const getBrandOptions = (panel: CatalogPanel) =>
  api.get(`/${panel}/brands/options`) as unknown as Res<Option[]>;
export const saveBrand = (
  panel: CatalogPanel,
  {id, ...body}: Body & {id?: string},
) =>
  (id
    ? api.patch(`/${panel}/brands/${id}`, body)
    : api.post(`/${panel}/brands`, body)) as unknown as Res<Brand>;

// Products
export const getProducts = (panel: CatalogPanel, params: Params) =>
  api.get(`/${panel}/products`, {params: clean(params)}) as unknown as Res<
    ListResult<Product>
  >;
export const getProduct = (panel: CatalogPanel, id: string) =>
  api.get(`/${panel}/products/${id}`) as unknown as Res<Product>;
export const saveProduct = (
  panel: CatalogPanel,
  {id, ...body}: Body & {id?: string},
) =>
  (id
    ? api.patch(`/${panel}/products/${id}`, body)
    : api.post(`/${panel}/products`, body)) as unknown as Res<Product>;
export const setProductStatus = (
  panel: CatalogPanel,
  id: string,
  body: {status: string; reason?: string},
) =>
  api.patch(`/${panel}/products/${id}/status`, body) as unknown as Res<Product>;
export const deleteProduct = (id: string) =>
  api.delete(`/company-admin/products/${id}`) as unknown as Res<object>;

export const uploadProductImages = (
  panel: CatalogPanel,
  id: string,
  files: File[],
) => {
  const form = new FormData();
  files.forEach((file) => form.append('images', file));
  return api.post(
    `/${panel}/products/${id}/images`,
    form,
  ) as unknown as Res<Product>;
};
export const updateProductImage = (
  panel: CatalogPanel,
  id: string,
  imageId: string,
  body: Body,
) =>
  api.patch(
    `/${panel}/products/${id}/images/${imageId}`,
    body,
  ) as unknown as Res<Product>;
export const deleteProductImage = (
  panel: CatalogPanel,
  id: string,
  imageId: string,
) =>
  api.delete(
    `/${panel}/products/${id}/images/${imageId}`,
  ) as unknown as Res<Product>;
