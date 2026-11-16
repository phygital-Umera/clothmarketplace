import {
  CompanyRules,
  getCompanyRules,
  getStoreRules,
  StoreRules,
  updateCompanyRules,
  updateStoreRules,
} from '@/lib/api/companySettings';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const companyRulesKey = (panel: string) => ['companyRules', panel] as const;

/** The company's rules (P4-08). Shop screens pass 'shop-admin'; the owner's page 'company-admin' */
export const useCompanyRules = (panel: 'company-admin' | 'shop-admin' = 'shop-admin') =>
  useQuery({
    queryKey: companyRulesKey(panel),
    queryFn: () => getCompanyRules(panel),
    staleTime: 60_000,
  });

export const useUpdateCompanyRules = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules: CompanyRules) => updateCompanyRules(rules),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['companyRules']}),
  });
};

/** Store-wide settings (P4-08b), super admin */
export const useStoreRules = () =>
  useQuery({queryKey: ['storeRules'], queryFn: getStoreRules, staleTime: 60_000});

export const useUpdateStoreRules = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rules: StoreRules) => updateStoreRules(rules),
    onSuccess: () => queryClient.invalidateQueries({queryKey: ['storeRules']}),
  });
};
