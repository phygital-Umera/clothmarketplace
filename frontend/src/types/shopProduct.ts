import {Gender, ProductStatus} from '@/types/catalog';
import {ListParams} from '@/types/org';

export type ShopProductStatus = Extract<
  ProductStatus,
  'DRAFT' | 'PUBLISHED' | 'UNPUBLISHED'
>;
export const SHOP_PRODUCT_STATUSES: ShopProductStatus[] = [
  'DRAFT',
  'PUBLISHED',
  'UNPUBLISHED',
];

export type StockFilter = 'in' | 'low' | 'out';
/** Same threshold as backend LOW_STOCK */
export const LOW_STOCK = 5;

export type PreviewStatus = 'PENDING' | 'READY' | 'FAILED';

export interface ShopProductImage {
  id: string;
  url: string;
  altText: string | null;
  order: number;
  isMain: boolean;
  /** Set on a clean white-background photo: the shop photo it was made from */
  cleanedFromId?: string | null;
  /** AI professional photo style, when the AI made this photo */
  aiStyle?: PhotoStyle | null;
}

export type PhotoStyle = 'GHOST' | 'MANNEQUIN' | 'MODEL';

export interface ColorPreview {
  id: string;
  colorId: string;
  sourceImageId: string;
  url: string | null;
  status: PreviewStatus;
  error: string | null;
  model: string;
  createdAt: string;
  updatedAt: string;
  color: {id: string; name: string; hexCode: string};
}

export interface ShopProduct {
  id: string;
  name: string;
  sku: string;
  status: ProductStatus;
  shortDesc: string | null;
  detailedDesc: string | null;
  categoryId: string;
  subcategoryId: string | null;
  category: {id: string; name: string};
  subcategory: {id: string; name: string} | null;
  sizes: {id: string; name: string; code: string; displayOrder: number}[];
  colors: {id: string; name: string; code: string; hexCode: string}[];
  mrp: number;
  sellingPrice: number;
  taxRate: number;
  stockQuantity: number;
  gender: Gender;
  tags: string[];
  productType: string | null;
  fabric: string | null;
  pattern: string | null;
  fit: string | null;
  sleeveType: string | null;
  neckType: string | null;
  occasion: string | null;
  season: string | null;
  careInstructions: string | null;
  images: ShopProductImage[];
  mainImage: string | null;
  /** Detail only */
  previews?: ColorPreview[];
  createdBy?: {id: string; fullname: string} | null;
  createdAt: string;
  updatedAt: string;
}

export type ShopProductParams = ListParams & {
  subcategoryId?: string;
  colorId?: string;
  sizeId?: string;
  stock?: StockFilter;
};
