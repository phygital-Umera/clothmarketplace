// Shop Staff & rights

export type Shift = 'FULL_DAY' | 'MORNING' | 'EVENING';
export type AttendanceStatus = 'IN' | 'OUT' | 'LEAVE' | 'ABSENT';

export const SHIFT_LABEL: Record<Shift, string> = {
  FULL_DAY: 'Full day',
  MORNING: 'Morning',
  EVENING: 'Evening',
};

export const STAFF_ROLES = [
  'Cashier',
  'Sales associate',
  'Stock keeper',
  'Tailor',
  'Helper',
  'Shop manager',
] as const;

export type StaffRight = {key: string; label: string};

export type StaffMember = {
  id: string;
  fullname: string;
  employeeCode: string | null;
  phoneNumber: string;
  isManager: boolean;
  role: string;
  shift: Shift;
  shiftHours: {start: string; end: string};
  permissions: string[];
  attendance: {
    status: AttendanceStatus;
    inAt: string | null;
    outAt: string | null;
    note: string | null;
  } | null;
};

export type StaffList = {
  date: string;
  rights: StaffRight[];
  items: StaffMember[];
  summary: {total: number; in: number; onLeave: number; pendingRequests: number};
};

export type StaffRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export type StaffRequest = {
  id: string;
  requestNumber: string;
  shopId: string;
  shop?: {id: string; name: string; code: string};
  fullname: string;
  phoneNumber: string;
  email: string | null;
  employeeRole: string;
  shift: Shift;
  permissions: string[];
  note: string | null;
  status: StaffRequestStatus;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
};

export type StaffRequestPayload = {
  fullname: string;
  phoneNumber: string;
  email?: string;
  employeeRole: string;
  shift: Shift;
  permissions: string[];
  note?: string;
};
