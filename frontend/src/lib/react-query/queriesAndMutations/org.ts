import {
  createBranch,
  createEmployee,
  createShop,
  getBranch,
  getBranches,
  getBranchOptions,
  getBranchProfile,
  getCompanyProfile,
  getEmployee,
  getEmployees,
  getBranchOverview,
  getScopedDashboard,
  getShop,
  getShopOptions,
  getShopStats,
  getShops,
  getSuperAdminDashboard,
  getUsers,
  revokeSessions,
  setBranchStatus,
  setShopStatus,
  setUserStatus,
  updateBranch,
  updateEmployee,
  updateShop,
} from '@/lib/api/org';
import {ListParams, Panel} from '@/types/org';
import {getErrorMessage} from '@/utils/axios';
import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const ORG_KEYS = {
  BRANCHES: 'branches',
  SHOPS: 'shops',
  EMPLOYEES: 'employees',
  USERS: 'users',
  DASHBOARD: 'dashboard',
  PROFILE: 'profile',
};

/** After any change, lists / dashboards of every panel refetch */
const useInvalidateOrg = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all(
      Object.values(ORG_KEYS).map((key) =>
        queryClient.invalidateQueries({queryKey: [key]}),
      ),
    );
};

// ---- Queries -------------------------------------------------------------

export const useSuperAdminDashboard = () =>
  useQuery({
    queryKey: [ORG_KEYS.DASHBOARD, 'super-admin'],
    queryFn: getSuperAdminDashboard,
    select: (res) => res.data,
  });

export const useBranchOverview = () =>
  useQuery({
    queryKey: [ORG_KEYS.DASHBOARD, 'branch-overview'],
    queryFn: getBranchOverview,
    select: (res) => res.data,
  });

export const useScopedDashboard = (panel: Panel) =>
  useQuery({
    queryKey: [ORG_KEYS.DASHBOARD, panel],
    queryFn: () => getScopedDashboard(panel),
    select: (res) => res.data,
  });

export const useCompanyProfile = () =>
  useQuery({
    queryKey: [ORG_KEYS.PROFILE, 'company'],
    queryFn: getCompanyProfile,
    select: (res) => res.data,
  });

export const useBranchProfile = () =>
  useQuery({
    queryKey: [ORG_KEYS.PROFILE, 'branch'],
    queryFn: getBranchProfile,
    select: (res) => res.data,
  });

export const useBranches = (panel: Panel, params: ListParams) =>
  useQuery({
    queryKey: [ORG_KEYS.BRANCHES, panel, params],
    queryFn: () => getBranches(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useBranch = (panel: Panel, id?: string) =>
  useQuery({
    queryKey: [ORG_KEYS.BRANCHES, panel, 'one', id],
    queryFn: () => getBranch(panel, id!),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useBranchOptions = (enabled = true) =>
  useQuery({
    queryKey: [ORG_KEYS.BRANCHES, 'options'],
    queryFn: getBranchOptions,
    select: (res) =>
      res.data.map((b) => ({value: b.id, label: `${b.name} (${b.code})`})),
    enabled,
  });

export const useShops = (panel: Panel, params: ListParams) =>
  useQuery({
    queryKey: [ORG_KEYS.SHOPS, panel, params],
    queryFn: () => getShops(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useShop = (panel: Panel, id?: string) =>
  useQuery({
    queryKey: [ORG_KEYS.SHOPS, panel, 'one', id],
    queryFn: () => getShop(panel, id!),
    select: (res) => res.data,
    enabled: !!id,
  });

/** Active shops for pickers; company admins narrow them to one branch */
/** Branch Shops page: stock, sales (MTD) and next bill number per shop */
export const useShopStats = (panel: Panel = 'branch-admin') =>
  useQuery({
    queryKey: [ORG_KEYS.SHOPS, panel, 'stats'],
    queryFn: () => getShopStats(panel),
    select: (res) => res.data,
  });

export const useShopOptions = (
  panel: Panel,
  branchId?: string,
  enabled = true,
) =>
  useQuery({
    queryKey: [ORG_KEYS.SHOPS, panel, 'options', branchId],
    queryFn: () => getShopOptions(panel, branchId),
    select: (res) =>
      res.data.map((s) => ({value: s.id, label: `${s.name} (${s.code})`})),
    enabled,
  });

export const useEmployees = (panel: Panel, params: ListParams) =>
  useQuery({
    queryKey: [ORG_KEYS.EMPLOYEES, panel, params],
    queryFn: () => getEmployees(panel, params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

export const useEmployee = (panel: Panel, id?: string) =>
  useQuery({
    queryKey: [ORG_KEYS.EMPLOYEES, panel, 'one', id],
    queryFn: () => getEmployee(panel, id!),
    select: (res) => res.data,
    enabled: !!id,
  });

export const useUsers = (params: ListParams) =>
  useQuery({
    queryKey: [ORG_KEYS.USERS, params],
    queryFn: () => getUsers(params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
  });

// ---- Mutations (forms show field errors inline; toasts confirm success) ---

export const useSaveBranch = () => {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: ({id, ...body}: Record<string, unknown> & {id?: string}) =>
      id ? updateBranch({id, ...body}) : createBranch(body),
    onSuccess: (res, vars) => {
      toast.success(`${res.data.name} ${vars.id ? 'updated' : 'added'}`);
      invalidate();
    },
  });
};

export const useSetBranchStatus = () => {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: setBranchStatus,
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not change the status')),
  });
};

export const useSaveShop = (panel: Panel) => {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: ({id, ...body}: Record<string, unknown> & {id?: string}) =>
      id ? updateShop(panel, id, body) : createShop(panel, body),
    onSuccess: (res, vars) => {
      toast.success(
        vars.id
          ? `${res.data.name} updated`
          : `${res.data.name} added as ${res.data.code}`,
      );
      invalidate();
    },
  });
};

export const useSetShopStatus = (panel: Panel) => {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => setShopStatus(panel, id, body),
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not change the status')),
  });
};

export const useSaveEmployee = (panel: Panel) => {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: ({id, ...body}: Record<string, unknown> & {id?: string}) =>
      id ? updateEmployee(panel, id, body) : createEmployee(panel, body),
    onSuccess: (res, vars) => {
      toast.success(
        vars.id
          ? `${res.data.fullname} updated`
          : `${res.data.fullname} added as ${res.data.employeeCode}`,
      );
      invalidate();
    },
  });
};

export const useSetUserStatus = (panel: Panel) => {
  const invalidate = useInvalidateOrg();
  return useMutation({
    mutationFn: ({
      id,
      ...body
    }: {
      id: string;
      status: string;
      reason?: string;
    }) => setUserStatus(panel, id, body),
    onSuccess: (res) => {
      toast.success(res.message);
      invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not change the status')),
  });
};

export const useRevokeSessions = (panel: Panel) =>
  useMutation({
    mutationFn: (id: string) => revokeSessions(panel, id),
    onSuccess: (res) => toast.success(res.message),
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not end the sessions')),
  });
