import {ApiResponse} from '@/types';
import {ListResult} from '@/types/org';
import {ShopProduct, ShopProductParams, PhotoStyle} from '@/types/shopProduct';
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

/** A new product is sent as form data: its fields and photos in one request */
const toFormData = (body: Body, files: File[]) => {
  const form = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined || value === null) continue;
    // Lists (sizes, colours, tags) go as JSON text; the server reads them back
    form.append(
      key,
      Array.isArray(value) ? JSON.stringify(value) : String(value),
    );
  }
  files.forEach((file) => form.append('images', file));
  return form;
};

export const saveShopProduct = ({
  id,
  files = [],
  ...body
}: Body & {id?: string; files?: File[]}) =>
  (id
    ? api.patch(`${BASE}/${id}`, body)
    : api.post(BASE, toFormData(body, files))) as unknown as Res<ShopProduct>;

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

/** Panels with the AI photo tools (API prefix): a shop's own products, or any product of the company */
export type PhotoPanel = 'shop-admin' | 'company-admin';

/** Clean white-background copy of a photo (takes 10–20 s on the server) */
export const cleanShopProductImage = (
  id: string,
  imageId: string,
  panel: PhotoPanel = 'shop-admin',
) =>
  api.post(
    `/${panel}/products/${id}/images/${imageId}/clean`,
    {},
    {timeout: 3 * 60 * 1000},
  ) as unknown as Res<ShopProduct>;

/** AI professional photo (3D invisible mannequin, dress form, model, or the garment enhanced); 10–40 s */
export const professionalShopProductImage = (
  id: string,
  imageId: string,
  style: PhotoStyle,
  details?: string,
  panel: PhotoPanel = 'shop-admin',
) =>
  api.post(
    `/${panel}/products/${id}/images/${imageId}/professional`,
    {style, details: details || undefined},
    {timeout: 3 * 60 * 1000},
  ) as unknown as Res<ShopProduct>;

/** Whether the Cloudflare AI keys are set on the server */
export const getAiStatus = (panel: PhotoPanel = 'shop-admin') =>
  api.get(`/${panel}/ai-status`) as unknown as Res<{ready: boolean}>;

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
