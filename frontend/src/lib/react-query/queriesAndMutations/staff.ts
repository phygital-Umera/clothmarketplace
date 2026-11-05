import {
  createStaffRequest,
  decideStaffRequest,
  getStaff,
  getStaffRequests,
  markAttendance,
  updateStaffRights,
  updateStaffShift,
} from '@/lib/api/staff';
import {AttendanceStatus, Shift, StaffList, StaffRequestPayload} from '@/types/staff';
import {getErrorMessage} from '@/utils/axios';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';
import toast from 'react-hot-toast';

export const STAFF_KEYS = {
  all: ['shop-staff'] as const,
  list: (panel: string) => [...STAFF_KEYS.all, 'list', panel] as const,
  requests: (panel: string) => [...STAFF_KEYS.all, 'requests', panel] as const,
};

export const useStaff = (panel: string) =>
  useQuery({
    queryKey: STAFF_KEYS.list(panel),
    queryFn: () => getStaff(panel),
    select: (res) => res.data as StaffList,
  });

export const useStaffRequests = (panel: string) =>
  useQuery({
    queryKey: STAFF_KEYS.requests(panel),
    queryFn: () => getStaffRequests(panel),
    select: (res) => res.data,
  });

/** Ticking a right saves at once; the table updates before the server answers */
export const useUpdateStaffRights = (panel: string) => {
  const qc = useQueryClient();
  const key = STAFF_KEYS.list(panel);
  return useMutation({
    mutationFn: ({id, permissions}: {id: string; permissions: string[]}) =>
      updateStaffRights(panel, id, permissions),
    onMutate: async ({id, permissions}) => {
      await qc.cancelQueries({queryKey: key});
      const previous = qc.getQueryData(key);
      qc.setQueryData(key, (old: any) =>
        old
          ? {
              ...old,
              data: {
                ...old.data,
                items: old.data.items.map((s: any) => (s.id === id ? {...s, permissions} : s)),
              },
            }
          : old,
      );
      return {previous};
    },
    onError: (err, _v, ctx) => {
      if (ctx?.previous) qc.setQueryData(key, ctx.previous);
      toast.error(getErrorMessage(err, 'Could not update rights'));
    },
    onSettled: () => qc.invalidateQueries({queryKey: key}),
  });
};

export const useUpdateStaffShift = (panel: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, shift}: {id: string; shift: Shift}) => updateStaffShift(panel, id, shift),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Shift updated');
      qc.invalidateQueries({queryKey: STAFF_KEYS.list(panel)});
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not update shift')),
  });
};

export const useMarkAttendance = (panel: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({id, status}: {id: string; status: AttendanceStatus}) =>
      markAttendance(panel, id, status),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Attendance marked');
      qc.invalidateQueries({queryKey: STAFF_KEYS.list(panel)});
    },
    onError: (err) => toast.error(getErrorMessage(err, 'Could not mark attendance')),
  });
};

export const useCreateStaffRequest = (panel: string) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: StaffRequestPayload) => createStaffRequest(panel, data),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Request sent');
      qc.invalidateQueries({queryKey: STAFF_KEYS.all});
    },
  });
};

export const useDecideStaffRequest = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {decision: 'APPROVE' | 'REJECT'; password?: string; note?: string};
    }) => decideStaffRequest(id, data),
    onSuccess: (res: any) => {
      toast.success(res?.message || 'Done');
      qc.invalidateQueries({queryKey: STAFF_KEYS.all});
      qc.invalidateQueries({queryKey: ['branch-staff-overview']});
    },
  });
};
