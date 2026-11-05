import {api} from '@/utils/axios';
import {
  AttendanceStatus,
  Shift,
  StaffList,
  StaffRequest,
  StaffRequestPayload,
} from '@/types/staff';

type Res<T> = {statusCode: number; data: T; message: string};

// ---- Shop: Staff & rights ----

export const getStaff = (panel: string) =>
  api.get(`/${panel}/staff`).then((res: any) => res as Res<StaffList>);

export const updateStaffRights = (panel: string, id: string, permissions: string[]) =>
  api.patch(`/${panel}/staff/${id}/rights`, {permissions}).then((res: any) => res as Res<unknown>);

export const updateStaffShift = (panel: string, id: string, shift: Shift) =>
  api.patch(`/${panel}/staff/${id}/shift`, {shift}).then((res: any) => res as Res<unknown>);

export const markAttendance = (panel: string, id: string, status: AttendanceStatus) =>
  api.post(`/${panel}/staff/${id}/attendance`, {status}).then((res: any) => res as Res<unknown>);

export const getStaffRequests = (panel: string) =>
  api.get(`/${panel}/staff-requests`).then((res: any) => res as Res<StaffRequest[]>);

export const createStaffRequest = (panel: string, data: StaffRequestPayload) =>
  api.post(`/${panel}/staff-requests`, data).then((res: any) => res as Res<StaffRequest>);

// ---- Branch admin: approve / reject new staff ----

export const decideStaffRequest = (
  id: string,
  data: {decision: 'APPROVE' | 'REJECT'; password?: string; note?: string},
) =>
  api.post(`/branch-admin/staff-requests/${id}/decision`, data).then((res: any) => res as Res<StaffRequest>);
