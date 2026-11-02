import {ApiResponse} from '@/types';
import {Company} from '@/types/company';
import {
  Account,
  Branch,
  ListParams,
  ListResult,
  Panel,
  ScopedDashboard,
  Shop,
  SuperAdminDashboard,
} from '@/types/org';
import {api} from '@/utils/axios';

// The response interceptor already unwraps axios' `res.data`
type Res<T> = Promise<ApiResponse<T>>;
type Body = Record<string, unknown>;

/** Drop empty filters so the URL stays clean */
const clean = (params: ListParams) =>
  Object.fromEntries(
    Object.entries(params).filter(([, v]) => v !== undefined && v !== ''),
  );

// Dashboards and profiles
export const getSuperAdminDashboard = () =>
  api.get('/super-admin/dashboard') as unknown as Res<SuperAdminDashboard>;
export const getScopedDashboard = (panel: Panel) =>
  api.get(`/${panel}/dashboard`) as unknown as Res<ScopedDashboard>;
export const getCompanyProfile = () =>
  api.get('/company-admin/profile') as unknown as Res<Company>;
export const getBranchProfile = () =>
  api.get('/branch-admin/profile') as unknown as Res<Branch>;

// Branches
export const getBranches = (panel: Panel, params: ListParams) =>
  api.get(`/${panel}/branches`, {params: clean(params)}) as unknown as Res<
    ListResult<Branch>
  >;
export const getBranch = (panel: Panel, id: string) =>
  api.get(`/${panel}/branches/${id}`) as unknown as Res<Branch>;
export const getBranchOptions = () =>
  api.get('/company-admin/branches/options') as unknown as Res<
    {id: string; name: string; code: string}[]
  >;
export const createBranch = (body: Body) =>
  api.post('/company-admin/branches', body) as unknown as Res<Branch>;
export const updateBranch = ({id, ...body}: Body & {id: string}) =>
  api.patch(`/company-admin/branches/${id}`, body) as unknown as Res<Branch>;
export const setBranchStatus = ({
  id,
  ...body
}: {
  id: string;
  status: string;
  reason?: string;
}) =>
  api.patch(
    `/company-admin/branches/${id}/status`,
    body,
  ) as unknown as Res<Branch>;

// Shops (company admin: all branches; branch admin: own branch; super admin: read)
export const getShops = (panel: Panel, params: ListParams) =>
  api.get(`/${panel}/shops`, {params: clean(params)}) as unknown as Res<
    ListResult<Shop>
  >;
export const getShop = (panel: Panel, id: string) =>
  api.get(`/${panel}/shops/${id}`) as unknown as Res<Shop>;
export const getShopOptions = (panel: Panel, branchId?: string) =>
  api.get(`/${panel}/shops/options`, {
    params: branchId ? {branchId} : {},
  }) as unknown as Res<
    {id: string; name: string; code: string; branchId: string}[]
  >;
export const createShop = (panel: Panel, body: Body) =>
  api.post(`/${panel}/shops`, body) as unknown as Res<Shop>;
export const updateShop = (panel: Panel, id: string, body: Body) =>
  api.patch(`/${panel}/shops/${id}`, body) as unknown as Res<Shop>;
export const setShopStatus = (
  panel: Panel,
  id: string,
  body: {status: string; reason?: string},
) => api.patch(`/${panel}/shops/${id}/status`, body) as unknown as Res<Shop>;

// Employees (company admin: whole company; branch admin: own branch)
export const getEmployees = (panel: Panel, params: ListParams) =>
  api.get(`/${panel}/employees`, {params: clean(params)}) as unknown as Res<
    ListResult<Account>
  >;
export const getEmployee = (panel: Panel, id: string) =>
  api.get(`/${panel}/employees/${id}`) as unknown as Res<Account>;
export const createEmployee = (panel: Panel, body: Body) =>
  api.post(`/${panel}/employees`, body) as unknown as Res<Account>;
export const updateEmployee = (panel: Panel, id: string, body: Body) =>
  api.patch(`/${panel}/employees/${id}`, body) as unknown as Res<Account>;

// Users: list (super admin), status and sessions (any admin, within scope)
export const getUsers = (params: ListParams) =>
  api.get('/super-admin/users', {params: clean(params)}) as unknown as Res<
    ListResult<Account>
  >;
export const setUserStatus = (
  panel: Panel,
  id: string,
  body: {status: string; reason?: string},
) => api.patch(`/${panel}/users/${id}/status`, body) as unknown as Res<Account>;
export const revokeSessions = (panel: Panel, id: string) =>
  api.post(`/${panel}/users/${id}/revoke-sessions`) as unknown as Res<object>;
