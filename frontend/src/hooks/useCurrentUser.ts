import {useAuthContext} from '@/context/AuthContext';
import {getCurrentUser} from '@/lib/api/Auth/auth';
import {AUTH_KEYS} from '@/lib/react-query/queryKeys';
import {useQuery} from '@tanstack/react-query';

export type CurrentUser = {
  id: string;
  fullname: string;
  email: string | null;
  phoneNumber: string;
  address: string | null;
  role: string;
  status: 'PENDING_INVITATION' | 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  companyId: string | null;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
  company: {id: string; name: string; code: string; status: string} | null;
  branch: {id: string; name: string; code: string; status: string} | null;
  shop: {
    id: string;
    name: string;
    code: string;
    status: string;
    gstin?: string | null;
  } | null;
  employeeCode: string | null;
  permissions: string[];
};

/**
 * The signed-in user as the backend sees them (GET /users/me). The role here
 * is the real one; the role inside the stored token is only used until this
 * loads.
 */
const useCurrentUser = () => {
  const {isAuthenticated, user} = useAuthContext();
  return useQuery({
    // Keyed by user id so a different sign-in never sees stale data
    queryKey: [AUTH_KEYS.GET_CURRENT_USER, user?.id],
    queryFn: getCurrentUser,
    select: (res) => res.data as CurrentUser,
    enabled: isAuthenticated,
    staleTime: 60 * 1000,
    retry: false,
  });
};

export default useCurrentUser;
