import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import {
  getBranchExpenses,
  addBranchExpense,
  getBranchApprovals,
  decideBranchApproval,
  getBranchPnlReport,
  getBranchShopsOverview,
  addBranchShopOverview,
  getBranchStaffOverview,
  inviteBranchStaff,
  getBranchShopAssignment,
  moveBranchEmployee,
  getBranchProfileSetup,
  updateBranchProfileSetup,
} from '@/lib/api/branchExtras';
import toast from 'react-hot-toast';

// Expenses
export const useBranchExpenses = () =>
  useQuery({
    queryKey: ['branch-expenses'],
    queryFn: async () => {
      const res = await getBranchExpenses();
      return res?.data?.data || res?.data;
    },
  });

export const useAddBranchExpense = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addBranchExpense,
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Expense added successfully');
      qc.invalidateQueries({queryKey: ['branch-expenses']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add expense');
    },
  });
};

// Approvals
export const useBranchApprovals = (tab?: string) =>
  useQuery({
    queryKey: ['branch-approvals', tab],
    queryFn: async () => {
      const res = await getBranchApprovals(tab);
      return res?.data?.data || res?.data;
    },
  });

export const useDecideBranchApproval = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, decision, note}: {id: string; decision: 'APPROVE' | 'REJECT'; note?: string}) =>
      decideBranchApproval(id, {decision, note}),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Decision recorded successfully');
      qc.invalidateQueries({queryKey: ['branch-approvals']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record decision');
    },
  });
};

// Reports
export const useBranchPnlReport = (from = '2026-11-01', to = '2026-11-03') =>
  useQuery({
    queryKey: ['branch-pnl-report', from, to],
    queryFn: async () => {
      const res = await getBranchPnlReport(from, to);
      return res?.data?.data || res?.data;
    },
  });

// Shops
export const useBranchShopsOverview = () =>
  useQuery({
    queryKey: ['branch-shops-overview'],
    queryFn: async () => {
      const res = await getBranchShopsOverview();
      return res?.data?.data || res?.data;
    },
  });

export const useAddBranchShop = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: addBranchShopOverview,
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Shop submitted successfully');
      qc.invalidateQueries({queryKey: ['branch-shops-overview']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to add shop');
    },
  });
};

// Staff
export const useBranchStaffOverview = (params?: {tab?: string; shop?: string; search?: string}) =>
  useQuery({
    queryKey: ['branch-staff-overview', params],
    queryFn: async () => {
      const res = await getBranchStaffOverview(params);
      return res?.data?.data || res?.data;
    },
  });

export const useInviteBranchStaff = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: inviteBranchStaff,
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Staff invitation sent successfully');
      qc.invalidateQueries({queryKey: ['branch-staff-overview']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to send invitation');
    },
  });
};

// Shop Assignment
export const useBranchShopAssignment = () =>
  useQuery({
    queryKey: ['branch-shop-assignment'],
    queryFn: async () => {
      const res = await getBranchShopAssignment();
      return res?.data?.data || res?.data;
    },
  });

export const useMoveBranchEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: moveBranchEmployee,
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Employee moved successfully');
      qc.invalidateQueries({queryKey: ['branch-shop-assignment']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to move employee');
    },
  });
};

// Branch Profile
export const useBranchProfileSetup = () =>
  useQuery({
    queryKey: ['branch-profile-setup'],
    queryFn: async () => {
      const res = await getBranchProfileSetup();
      return res?.data?.data || res?.data;
    },
  });

export const useUpdateBranchProfileSetup = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateBranchProfileSetup,
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Branch profile updated successfully');
      qc.invalidateQueries({queryKey: ['branch-profile-setup']});
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update branch profile');
    },
  });
};


