import {ApiResponse} from '@/types';
import {ListResult} from '@/types/org';
import {ShopProduct, ShopProductParams} from '@/types/shopProduct';
import {api} from '@/utils/axios';

type Res<T> = Promise<ApiResponse<T>>;
type Body = Record<string, unknown>;

const BASE = '/shop-admin/products';

const clean = (params: ShopProductParams) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  );

export const getShopProducts = (params: ShopProductParams) =>
  api.get(BASE, {params: clean(params)}) as unknown as Res<
    ListResult<ShopProduct>
  >;

export const getShopProduct = (id: string) =>
  api.get(`${BASE}/${id}`) as unknown as Res<ShopProduct>;

export const saveShopProduct = ({id, ...body}: Body & {id?: string}) =>
  (id
    ? api.patch(`${BASE}/${id}`, body)
    : api.post(BASE, body)) as unknown as Res<ShopProduct>;

export const deleteShopProduct = (id: string) =>
  api.delete(`${BASE}/${id}`) as unknown as Res<object>;

// ---- Images ----

export const uploadShopProductImages = (id: string, files: File[]) => {
  const form = new FormData();
  files.forEach((file) => form.append('images', file));
  return api.post(`${BASE}/${id}/images`, form) as unknown as Res<ShopProduct>;
};

export const updateShopProductImage = (
  id: string,
  imageId: string,
  body: {isMain?: boolean; altText?: string},
) =>
  api.patch(
    `${BASE}/${id}/images/${imageId}`,
    body,
  ) as unknown as Res<ShopProduct>;

export const deleteShopProductImage = (id: string, imageId: string) =>
  api.delete(`${BASE}/${id}/images/${imageId}`) as unknown as Res<ShopProduct>;

// ---- AI color previews ----

// Each color is a separate AI call on the server, so allow a long wait
export const generateShopProductPreviews = (
  id: string,
  body: {colorIds: string[]; imageId?: string},
) =>
  api.post(`${BASE}/${id}/previews`, body, {
    timeout: 10 * 60 * 1000,
  }) as unknown as Res<ShopProduct>;

export const deleteShopProductPreview = (id: string, previewId: string) =>
  api.delete(
    `${BASE}/${id}/previews/${previewId}`,
  ) as unknown as Res<ShopProduct>;
