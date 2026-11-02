import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import toast from 'react-hot-toast';
import {
  createCompany,
  deleteCompany,
  getCompanies,
  getCompany,
  updateCompany,
} from '@/lib/api/company';
import {lookupPincode} from '@/lib/api/pincode';
import {CompanyListParams} from '@/types/company';
import {getErrorMessage} from '@/utils/axios';
import {COMPANY_KEYS} from '../queryKeys';

export const useCompanies = (params: CompanyListParams, enabled = true) =>
  useQuery({
    queryKey: [COMPANY_KEYS.COMPANIES, params],
    queryFn: () => getCompanies(params),
    select: (res) => res.data,
    placeholderData: keepPreviousData,
    enabled,
  });

export const useCompany = (id?: string) =>
  useQuery({
    queryKey: [COMPANY_KEYS.COMPANY, id],
    queryFn: () => getCompany(id!),
    select: (res) => res.data,
    enabled: !!id,
  });

/** State / district / city for a 6-digit pincode (cached; pincodes don't change) */
export const usePincode = (pincode?: string) =>
  useQuery({
    queryKey: [COMPANY_KEYS.PINCODE, pincode],
    queryFn: () => lookupPincode(pincode!),
    enabled: !!pincode,
    staleTime: Infinity,
    retry: false,
  });

const useInvalidateCompanies = () => {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({queryKey: [COMPANY_KEYS.COMPANIES]}),
      queryClient.invalidateQueries({queryKey: [COMPANY_KEYS.COMPANY]}),
    ]);
};

export const useCreateCompany = () => {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: createCompany,
    onSuccess: (res) => {
      toast.success(`${res.data.name} added`);
      invalidate();
    },
  });
};

export const useUpdateCompany = () => {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: updateCompany,
    onSuccess: (res) => {
      toast.success(`${res.data.name} updated`);
      invalidate();
    },
  });
};

export const useDeleteCompany = () => {
  const invalidate = useInvalidateCompanies();
  return useMutation({
    mutationFn: deleteCompany,
    onSuccess: () => {
      toast.success('Company deleted');
      invalidate();
    },
    onError: (error) =>
      toast.error(getErrorMessage(error, 'Could not delete company')),
  });
};
