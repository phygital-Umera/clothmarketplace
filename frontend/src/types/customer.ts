export type CustomerType = 'Retail' | 'B2B';

export interface ShopCustomer {
  id: string;
  shopId: string;
  companyId: string;
  branchId: string;
  name: string;
  mobile: string;
  customerType: CustomerType;
  businessName: string | null;
  gstin: string | null;
  address: string | null;
  creditLimit: number;
  openingDue: number;
  totalBought: number;
  balanceDue: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerMetrics {
  totalCustomers: number;
  newThisMonth: number;
  onCreditCount: number;
  totalDue: number;
  b2bCount: number;
}

export interface CustomerListResponse {
  items: ShopCustomer[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  };
  metrics: CustomerMetrics;
}

export interface CustomerListParams {
  search?: string;
  tab?: 'ALL' | 'WITH_DUE' | 'B2B';
  page?: number;
  limit?: number;
}

export interface CreateCustomerPayload {
  name: string;
  mobile: string;
  customerType: CustomerType;
  businessName?: string | null;
  gstin?: string | null;
  address?: string | null;
  creditLimit?: number;
  openingDue?: number;
  notes?: string | null;
}

export type UpdateCustomerPayload = Partial<CreateCustomerPayload>;

