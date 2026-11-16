import {GstRule, getGstRule, updateGstRule} from '@/lib/api/gst';
import {useMutation, useQuery, useQueryClient} from '@tanstack/react-query';

export const gstKeys = {rule: ['gstRule'] as const};

/** The open shop's GST rule (D-18); `enabled` off outside a shop (company/branch panels) */
export const useGstRule = (enabled = true) =>
  useQuery({
    queryKey: gstKeys.rule,
    queryFn: getGstRule,
    staleTime: 5 * 60_000,
    enabled,
  });

export const useUpdateGstRule = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (rule: GstRule) => updateGstRule(rule),
    onSuccess: (data) => {
      queryClient.setQueryData(gstKeys.rule, data);
      // Product GST shown in lists and the POS follows the rule
      queryClient.invalidateQueries({queryKey: ['shopProducts']});
      queryClient.invalidateQueries({queryKey: ['inventory']});
    },
  });
};
