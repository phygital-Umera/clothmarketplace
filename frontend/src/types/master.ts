export interface MasterCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  productCount?: number;
  subcategoryCount?: number;
  subcategories?: {id: string; name: string; code: string; isActive: boolean}[];
  createdAt: string;
  updatedAt: string;
}

export interface MasterSubcategory {
  id: string;
  categoryId: string;
  name: string;
  code: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  category: {
    id: string;
    name: string;
    code: string;
  };
}

export interface MasterColor {
  id: string;
  name: string;
  code: string;
  hexCode: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MasterSize {
  id: string;
  name: string;
  code: string;
  description: string | null;
  displayOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MasterOption {
  id: string;
  name: string;
  code?: string;
  hexCode?: string;
}

