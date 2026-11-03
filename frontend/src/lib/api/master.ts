import {ApiResponse} from '@/types';
import {
  MasterCategory,
  MasterColor,
  MasterOption,
  MasterSize,
  MasterSubcategory,
} from '@/types/master';
import {ListParams, ListResult} from '@/types/org';
import {api} from '@/utils/axios';

type Res<T> = Promise<ApiResponse<T>>;
type Body = Record<string, unknown>;

export type MasterParams = ListParams & {
  active?: string;
  categoryId?: string;
};

const clean = (params: MasterParams) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  );

// ==========================================
// 1. CATEGORIES
// ==========================================

export const getMasterCategories = (params: MasterParams) =>
  api.get('/shop-admin/categories', {
    params: clean(params),
  }) as unknown as Res<ListResult<MasterCategory>>;

export const getMasterCategory = (id: string) =>
  api.get(`/shop-admin/categories/${id}`) as unknown as Res<MasterCategory>;

export const getMasterCategoryOptions = () =>
  api.get('/shop-admin/categories/options') as unknown as Res<MasterOption[]>;

export const saveMasterCategory = ({id, ...body}: Body & {id?: string}) =>
  (id
    ? api.patch(`/shop-admin/categories/${id}`, body)
    : api.post('/shop-admin/categories', body)) as unknown as Res<MasterCategory>;

export const deleteMasterCategory = (id: string) =>
  api.delete(`/shop-admin/categories/${id}`) as unknown as Res<object>;

// ==========================================
// 2. SUBCATEGORIES
// ==========================================

export const getMasterSubcategories = (params: MasterParams) =>
  api.get('/shop-admin/subcategories', {
    params: clean(params),
  }) as unknown as Res<ListResult<MasterSubcategory>>;

export const getMasterSubcategory = (id: string) =>
  api.get(`/shop-admin/subcategories/${id}`) as unknown as Res<MasterSubcategory>;

export const saveMasterSubcategory = ({id, ...body}: Body & {id?: string}) =>
  (id
    ? api.patch(`/shop-admin/subcategories/${id}`, body)
    : api.post(
        '/shop-admin/subcategories',
        body,
      )) as unknown as Res<MasterSubcategory>;

export const deleteMasterSubcategory = (id: string) =>
  api.delete(`/shop-admin/subcategories/${id}`) as unknown as Res<object>;

// ==========================================
// 3. COLORS
// ==========================================

export const getMasterColors = (params: MasterParams) =>
  api.get('/shop-admin/colors', {
    params: clean(params),
  }) as unknown as Res<ListResult<MasterColor>>;

export const getMasterColor = (id: string) =>
  api.get(`/shop-admin/colors/${id}`) as unknown as Res<MasterColor>;

export const saveMasterColor = ({id, ...body}: Body & {id?: string}) =>
  (id
    ? api.patch(`/shop-admin/colors/${id}`, body)
    : api.post('/shop-admin/colors', body)) as unknown as Res<MasterColor>;

export const deleteMasterColor = (id: string) =>
  api.delete(`/shop-admin/colors/${id}`) as unknown as Res<object>;

// ==========================================
// 4. SIZES
// ==========================================

export const getMasterSizes = (params: MasterParams) =>
  api.get('/shop-admin/sizes', {
    params: clean(params),
  }) as unknown as Res<ListResult<MasterSize>>;

export const getMasterSize = (id: string) =>
  api.get(`/shop-admin/sizes/${id}`) as unknown as Res<MasterSize>;

export const saveMasterSize = ({id, ...body}: Body & {id?: string}) =>
  (id
    ? api.patch(`/shop-admin/sizes/${id}`, body)
    : api.post('/shop-admin/sizes', body)) as unknown as Res<MasterSize>;

export const deleteMasterSize = (id: string) =>
  api.delete(`/shop-admin/sizes/${id}`) as unknown as Res<object>;

