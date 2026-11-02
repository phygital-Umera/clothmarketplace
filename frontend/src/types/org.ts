import {Status} from '@/components/ui/StatusBadge';

/** Which admin panel is calling: decides the API base and the scope */
export type Panel =
  | 'super-admin'
  | 'company-admin'
  | 'branch-admin'
  | 'shop-admin';

export type BranchStatus = 'ACTIVE' | 'INACTIVE';
export type ShopStatus = 'ACTIVE' | 'INACTIVE';
export type AccountStatus = Exclude<Status, 'SUSPENDED'>;

export const WEEK_DAYS = [
  'MONDAY',
  'TUESDAY',
  'WEDNESDAY',
  'THURSDAY',
  'FRIDAY',
  'SATURDAY',
  'SUNDAY',
] as const;
export type WeekDay = (typeof WEEK_DAYS)[number];

type Ref = {id: string; name: string; code: string};

export interface Branch {
  id: string;
  code: string;
  name: string;
  companyId: string;
  company: Ref;
  email: string | null;
  phone: string | null;
  alternatePhone: string | null;
  address: string;
  postalCode: string;
  state: string;
  district: string;
  city: string;
  openingTime: string | null;
  closingTime: string | null;
  weeklyHolidays: WeekDay[];
  notes: string | null;
  status: BranchStatus;
  branchAdmin: {
    id: string;
    fullname: string;
    email: string | null;
    phoneNumber: string;
    status: AccountStatus;
  } | null;
  employeeCount: number;
  shopCount: number;
  createdAt: string;
}

/** A shop (counter / outlet) inside a branch; employees work in a shop */
export interface Shop {
  id: string;
  code: string;
  name: string;
  companyId: string;
  branchId: string;
  company: Ref;
  branch: Ref & {status: BranchStatus};
  email: string | null;
  phone: string | null;
  address: string | null;
  openingTime: string | null;
  closingTime: string | null;
  notes: string | null;
  status: ShopStatus;
  shopAdmin: {
    id: string;
    fullname: string;
    email: string | null;
    phoneNumber: string;
    status: AccountStatus;
  } | null;
  employeeCount: number;
  createdAt: string;
}

/** A user as the admin panels see it (never a password) */
export interface Account {
  id: string;
  fullname: string;
  email: string | null;
  phoneNumber: string;
  role: string;
  status: AccountStatus;
  blockedReason: string | null;
  companyId: string | null;
  branchId: string | null;
  shopId: string | null;
  employeeCode: string | null;
  employeeRole: string | null;
  jobTitle: string | null;
  department: string | null;
  joiningDate: string | null;
  permissions: string[];
  lastLoginAt: string | null;
  createdAt: string;
  company: Ref | null;
  branch: Ref | null;
  shop: Ref | null;
}

export type ListResult<T> = {
  items: T[];
  pagination: {page: number; limit: number; total: number; totalPages: number};
  summary?: {total: number; active: number; inactive: number};
};

export type ListParams = {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortDir?: 'asc' | 'desc';
  status?: string;
  branchId?: string;
  shopId?: string;
  companyId?: string;
  role?: string;
  categoryId?: string;
};

/** Permissions an admin can give an employee (backend EMPLOYEE_PERMISSIONS) */
export const EMPLOYEE_PERMISSIONS = [
  {value: 'products.manage', label: 'Manage products'},
  {value: 'products.publish', label: 'Publish products'},
  {value: 'inventory.view', label: 'View stock'},
  {value: 'inventory.adjust', label: 'Adjust stock'},
  {value: 'orders.process', label: 'Process orders'},
  {value: 'ai.studio', label: 'AI Product Studio'},
  {value: 'reports.view', label: 'View reports'},
] as const;

export type ScopedDashboard = {
  branches: number;
  activeBranches: number;
  shops: number;
  activeShops: number;
  branchAdmins: number;
  employees: number;
  activeEmployees: number;
  recentEmployees: Account[];
};

export type SuperAdminDashboard = {
  companies: {total: number; active: number; inactive: number};
  branches: {total: number; active: number};
  shops: {total: number; active: number};
  users: {
    companyAdmins: number;
    branchAdmins: number;
    employees: number;
    customers: number;
  };
  recentCompanies: {
    id: string;
    name: string;
    code: string;
    city: string;
    status: string;
    createdAt: string;
  }[];
  recentBranches: {
    id: string;
    name: string;
    code: string;
    city: string;
    status: string;
    createdAt: string;
    company: {name: string};
  }[];
};
