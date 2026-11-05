import {api} from '@/utils/axios';

type Res<T> = {statusCode: number; data: T; message: string};

// --- EXPENSES ---
export type ExpenseSummary = {
  thisMonth: number;
  thisMonthSub: string;
  salaries: number;
  salariesSub: string;
  rent: number;
  rentSub: string;
  other: number;
  otherSub: string;
};

export type ExpenseRow = {
  head: string;
  mens: number;
  womens: number;
  kids: number;
  branch: number;
  total: number;
};

export type ExpensesData = {
  summary: ExpenseSummary;
  rows: ExpenseRow[];
  totalRow: ExpenseRow;
};

export const getBranchExpenses = () =>
  api.get<Res<ExpensesData>>('/branch-admin/expenses').then((r: any) => r);

export const addBranchExpense = (data: {
  date: string;
  amount: number;
  head: string;
  chargeTo: string;
  paidFrom: string;
  billUrl?: string;
}) =>
  api.post<Res<{success: boolean; message: string}>>('/branch-admin/expenses', data).then((r: any) => r);

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
  api.get<Res<ApprovalsData>>('/branch-admin/approvals', {params: {tab}}).then((r: any) => r);

export const decideBranchApproval = (id: string, data: {decision: 'APPROVE' | 'REJECT'; note?: string}) =>
  api.post<Res<{success: boolean; message: string}>>(`/branch-admin/approvals/${id}/decision`, data).then((r: any) => r);

// --- REPORTS ---
export type PnlRow = {
  line: string;
  mens: number;
  womens: number;
  kids: number;
  branch: number;
  total: number;
  isNegative?: boolean;
};

export type PnlData = {
  period: string;
  rows: PnlRow[];
  margins: Array<{shop: string; margin: number}>;
  note: string;
};

export const getBranchPnlReport = (from?: string, to?: string) =>
  api.get<Res<PnlData>>('/branch-admin/reports/pnl', {params: {from, to}}).then((r: any) => r);

// --- SHOPS ---
export type BranchShopCard = {
  id: string;
  name: string;
  code: string;
  locationDesc: string;
  status: 'ACTIVE' | 'PENDING' | 'CLOSED';
  manager: string;
  staffCount: number;
  stockUnits: number;
  salesMtd: number;
  nextBillNo: string;
};

export type ShopsOverviewData = {
  branchName: string;
  branchCode: string;
  shopsCount: number;
  shops: BranchShopCard[];
};

export const getBranchShopsOverview = () =>
  api.get<Res<ShopsOverviewData>>('/branch-admin/shops-overview').then((r: any) => r);

export const addBranchShopOverview = (data: {
  name: string;
  code: string;
  shopType: string;
  floorSection?: string;
  phone?: string;
  invoicePrefix: string;
  posBillingEnabled?: boolean;
  allowCreditSales?: boolean;
}) =>
  api.post<Res<{success: boolean; message: string}>>('/branch-admin/shops-overview', data).then((r: any) => r);

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
  api.get<Res<StaffOverviewData>>('/branch-admin/staff-overview', {params}).then((r: any) => r);

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
  api.post<Res<{success: boolean; message: string}>>('/branch-admin/staff-overview/invite', data).then((r: any) => r);

// --- SHOP ASSIGNMENT ---
export type ShopStaffMember = {
  id: string;
  name: string;
  initials: string;
  role: string;
  shopName: string;
};

export type ShopAssignmentGroup = {
  shopName: string;
  shopCode: string;
  staffCount: number;
  manager: string;
  staff: ShopStaffMember[];
};

export type ShopAssignmentData = {
  groups: ShopAssignmentGroup[];
  history: Array<{
    id: string;
    employee: string;
    fromTo: string;
    role: string;
    date: string;
    by: string;
  }>;
};

export const getBranchShopAssignment = () =>
  api.get<Res<ShopAssignmentData>>('/branch-admin/shop-assignment').then((r: any) => r);

export const moveBranchEmployee = (data: {
  employeeName: string;
  targetShop: string;
  roleInShop: string;
  effectiveFrom: string;
  reason?: string;
}) =>
  api.post<Res<{success: boolean; message: string}>>('/branch-admin/shop-assignment/move', data).then((r: any) => r);

// --- BRANCH PROFILE ---
export type OperatingHourDay = {
  day: string;
  open: boolean;
  from: string;
  to: string;
};

export type BranchHoliday = {
  id: string;
  name: string;
  dateDesc: string;
};

export type BranchProfileData = {
  identity: {
    branchName: string;
    branchCode: string;
    company: string;
    gstin: string;
  };
  contact: {
    email: string;
    phone: string;
    alternatePhone?: string;
    whatsapp?: string;
    address: string;
    city: string;
    pincode: string;
    mapsLink?: string;
  };
  operatingHours: OperatingHourDay[];
  holidays: BranchHoliday[];
  glance: {
    shops: number;
    employees: number;
    branchOpened: string;
    status: string;
  };
};

export const getBranchProfileSetup = () =>
  api.get<Res<BranchProfileData>>('/branch-admin/branch-profile').then((r: any) => r);

export const updateBranchProfileSetup = (data: Partial<BranchProfileData>) =>
  api.patch<Res<{success: boolean; message: string}>>('/branch-admin/branch-profile', data).then((r: any) => r);

