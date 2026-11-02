/** Admin panels that work with the catalog (API prefix) */
export type CatalogPanel =
  | 'super-admin'
  | 'company-admin'
  | 'branch-admin'
  | 'employee';

export type ProductStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'PUBLISHED'
  | 'UNPUBLISHED'
  | 'ARCHIVED';

export const GENDERS = [
  'MEN',
  'WOMEN',
  'UNISEX',
  'BOYS',
  'GIRLS',
  'KIDS',
] as const;
export type Gender = (typeof GENDERS)[number];

export interface Category {
  id: string;
  name: string;
  code: string;
  parentId: string | null;
  parent: {id: string; name: string} | null;
  description: string | null;
  displayOrder: number;
  seoTitle: string | null;
  seoDesc: string | null;
  isActive: boolean;
  productCount: number;
  childCount: number;
}

export interface Brand {
  id: string;
  name: string;
  code: string;
  description: string | null;
  website: string | null;
  isActive: boolean;
  isGlobal: boolean;
  productCount: number;
}

export interface Variant {
  id: string;
  variantSku: string;
  size: string;
  color: string;
  colorHex: string | null;
  mrp: number | null;
  sellingPrice: number | null;
  isActive: boolean;
  available: number;
}

export interface ProductImage {
  id: string;
  url: string;
  altText: string | null;
  order: number;
  isMain: boolean;
}

export interface Product {
  id: string;
  companyId: string;
  company: {id: string; name: string; code: string};
  name: string;
  sku: string;
  categoryId: string;
  category: {id: string; name: string};
  brandId: string | null;
  brand: {id: string; name: string} | null;
  shortDesc: string | null;
  detailedDesc: string | null;
  tags: string[];
  gender: Gender;
  productType: string | null;
  fabric: string | null;
  pattern: string | null;
  fit: string | null;
  sleeveType: string | null;
  neckType: string | null;
  occasion: string | null;
  season: string | null;
  careInstructions: string | null;
  countryOfOrigin: string | null;
  mrp: number;
  sellingPrice: number;
  taxRate: number;
  weightKg: number | null;
  dimensions: string | null;
  returnEligible: boolean;
  returnPeriodDays: number;
  seoTitle: string | null;
  seoDesc: string | null;
  status: ProductStatus;
  createdBy: {id: string; fullname: string} | null;
  images: ProductImage[];
  variants: Variant[];
  mainImage: string | null;
  activeVariantCount: number;
  stock: number;
  canEdit: boolean;
  canPublish: boolean;
  createdAt: string;
  updatedAt: string;
}

export type Option = {id: string; name: string};
