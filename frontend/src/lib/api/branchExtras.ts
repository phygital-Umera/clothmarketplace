import {api} from '@/utils/axios';

type Res<T> = {statusCode: number; data: T; message: string};

// --- EXPENSES ---
export type ExpenseSummary = {
  thisMonth: number;
  thisMonthSub: string;
  salaries: number;
  rent: number;
  other: number;
};

export type ExpenseRow = {
  head: string;
  /** Amount per shop id */
  byShop: Record<string, number>;
  branch: number;
  total: number;
};

export type ExpensesData = {
  month: string;
  shops: {id: string; name: string}[];
  summary: ExpenseSummary;
  rows: ExpenseRow[];
  totalRow: ExpenseRow;
};

export const getBranchExpenses = () =>
  (api.get('/branch-admin/expenses') as unknown as Promise<Res<ExpensesData>>);

export type ExpensePaidFrom = 'BANK' | 'PETTY_CASH' | 'OWNER';

export const addBranchExpense = (data: {
  date: string;
  amount: number;
  head: string;
  /** A shop id, 'SPLIT' (equally over active shops) or 'BRANCH' */
  chargeTo: string;
  paidFrom: ExpensePaidFrom;
  note?: string;
}) =>
  (api.post('/branch-admin/expenses', data) as unknown as Promise<Res<{success: boolean; message: string}>>);

// --- APPROVALS ---
export type ApprovalItem = {
  id: string;
  type: 'DISCOUNT' | 'CREDIT' | 'CANCEL_BILL' | 'WRITE_OFF' | 'REFUND';
  title: string;
  description: string;
  shopAndStaff: string;
  amountLabel: string;
  amount: number;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
};

export type ApprovalsData = {
  counts: {
    pending: number;
    discount: number;
    credit: number;
    cancelBill: number;
    writeOff: number;
    refund: number;
    doneToday: number;
  };
  items: ApprovalItem[];
  limitsTable: Array<{
    action: string;
    cashierCan: string;
    managerCan: string;
    aboveThat: string;
  }>;
};

export const getBranchApprovals = (tab?: string) =>
  (api.get('/branch-admin/approvals', {params: {tab}}) as unknown as Promise<Res<ApprovalsData>>);

export const decideBranchApproval = (id: string, data: {decision: 'APPROVE' | 'REJECT'; note?: string}) =>
  (api.post(`/branch-admin/approvals/${id}/decision`, data) as unknown as Promise<Res<{success: boolean; message: string}>>);

// --- REPORTS ---
export type PnlRow = {
  line: string;
  byShop: Record<string, number>;
  branch: number;
  total: number;
  isNegative?: boolean;
};

export type PnlData = {
  period: string;
  range: {from: string; to: string};
  shops: {id: string; name: string}[];
  rows: PnlRow[];
  margins: Array<{shop: string; margin: number | null}>;
  note: string | null;
};

export type ReportPanel = 'branch-admin' | 'shop-admin';

export const getBranchPnlReport = (panel: ReportPanel, from?: string, to?: string) =>
  (api.get(`/${panel}/reports/pnl`, {params: {from, to}}) as unknown as Promise<Res<PnlData>>);

// --- STAFF ---
export type BranchStaffMember = {
  id: string;
  name: string;
  empCode: string;
  phone: string;
  initials: string;
  shopName: string;
  role: string;
  todayAttendance: string;
  status: 'ACTIVE' | 'INVITED' | 'INACTIVE';
};

export type StaffOverviewData = {
  shops: {id: string; name: string}[];
  summary: {
    totalStaff: number;
    totalStaffSub: string;
    onShiftNow: number;
    onShiftNowSub: string;
    invitesPending: number;
    invitesPendingSub: string;
  };
  totalCount: number;
  items: BranchStaffMember[];
};

export const getBranchStaffOverview = (params?: {tab?: string; shop?: string; search?: string}) =>
  (api.get('/branch-admin/staff-overview', {params}) as unknown as Promise<Res<StaffOverviewData>>);

export const inviteBranchStaff = (data: {
  fullname: string;
  phoneNumber: string;
  email?: string;
  shopId: string;
  employeeRole: string;
  shift: string;
  permissions: string[];
  note?: string;
}) =>
  (api.post('/branch-admin/staff-overview/invite', data) as unknown as Promise<Res<{success: boolean; message: string}>>);

// --- SHOP ASSIGNMENT ---
export type ShopStaffMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  shopName: string;
};

export type ShopAssignmentGroup = {
  shopId: string;
  shopName: string;
  shopCode: string;
  staffCount: number;
  /** Shop login(s) of the shop */
  manager: string;
  staff: ShopStaffMember[];
};

export type ShopAssignmentData = {
  shops: {id: string; name: string}[];
  groups: ShopAssignmentGroup[];
  /** Employees of the branch not in any shop */
  unassigned: ShopStaffMember[];
  history: Array<{
    id: string;
    employee: string;
    fromTo: string;
    role: string;
    date: string;
    by: string;
    reason: string;
  }>;
};

export const getBranchShopAssignment = () =>
  (api.get('/branch-admin/shop-assignment') as unknown as Promise<Res<ShopAssignmentData>>);

export const moveBranchEmployee = (data: {
  employeeId: string;
  targetShopId: string;
  roleInShop?: string;
  reason?: string;
}) =>
  (api.post('/branch-admin/shop-assignment/move', data) as unknown as Promise<Res<{success: boolean; message: string}>>);

// --- BRANCH PROFILE ---
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

export type BranchProfileContact = {
  email: string;
  phone: string;
  alternatePhone: string;
  address: string;
  city: string;
  district: string;
  state: string;
  postalCode: string;
};

export type BranchProfileHours = {
  openingTime: string;
  closingTime: string;
  weeklyHolidays: WeekDay[];
};

export type BranchProfileData = {
  identity: {branchName: string; branchCode: string; company: string};
  contact: BranchProfileContact;
  hours: BranchProfileHours;
  glance: {shops: number; employees: number; branchOpened: string; status: string};
};

export const getBranchProfileSetup = () =>
  (api.get('/branch-admin/branch-profile') as unknown as Promise<Res<BranchProfileData>>);

export const updateBranchProfileSetup = (data: BranchProfileContact & BranchProfileHours) =>
  (api.patch('/branch-admin/branch-profile', data) as unknown as Promise<Res<{success: boolean; message: string}>>);
