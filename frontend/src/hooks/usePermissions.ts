import {useCallback} from 'react';
import useCurrentUser from './useCurrentUser';

/**
 * The signed-in user's permissions from GET /users/me (loaded from the
 * backend's RolePermission table). Use `can()` to HIDE actions; the backend
 * still rejects anything not allowed with 403.
 */
const usePermissions = () => {
  const {data, isPending, fetchStatus} = useCurrentUser();
  const permissions = data?.permissions;

  const can = useCallback(
    (permission?: string) => !permission || !!permissions?.includes(permission),
    [permissions],
  );

  return {
    permissions: permissions ?? [],
    can,
    isLoading: isPending && fetchStatus !== 'idle',
  };
};

export default usePermissions;
