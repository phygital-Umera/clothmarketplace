import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import {useAuthContext} from '@/context/AuthContext';
import useCurrentUser from '@/hooks/useCurrentUser';
import {canOpen, homeFor, roleConfig} from '@/lib/roles';
import {getErrorMessage} from '@/utils/axios';
import {Link, Navigate, Outlet, useRouterState} from '@tanstack/react-router';
import {Loader2, ShieldAlert} from 'lucide-react';
import {ReactNode, useState} from 'react';

const Centered = ({children}: {children: ReactNode}) => (
  <div className="flex min-h-screen items-center justify-center bg-ivory p-4">
    {children}
  </div>
);

const AppLayout = () => {
  const {isAuthenticated, role: tokenRole, logout} = useAuthContext();
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const pathname = useRouterState({select: (s) => s.location.pathname});
  // Session check with the backend: real role, status, password-change flag
  const {data: me, isPending, isError, error} = useCurrentUser();

  if (!isAuthenticated) return <Navigate to="/signin" />;

  if (isPending) {
    return (
      <Centered>
        <Loader2 className="animate-spin text-burgundy" aria-label="Loading" />
      </Centered>
    );
  }

  if (isError) {
    return (
      <Centered>
        <div className="panel max-w-md p-8 text-center">
          <h1 className="font-serif text-headline-sm text-burgundy">
            You are signed out
          </h1>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            {getErrorMessage(error, 'Your session could not be checked.')}
          </p>
          <button onClick={logout} className="btn-primary mt-6">
            Sign in again
          </button>
        </div>
      </Centered>
    );
  }

  // A token whose role no longer matches the account is not trusted
  if (me.role !== tokenRole || !roleConfig(me.role)) {
    return (
      <Centered>
        <div className="panel max-w-md p-8 text-center">
          <h1 className="font-serif text-headline-sm text-burgundy">
            No access
          </h1>
          <p className="mt-2 text-body-sm text-on-surface-variant">
            This account cannot use the Cloth Pro panel, or its role has
            changed. Please sign in again.
          </p>
          <button onClick={logout} className="btn-primary mt-6">
            Sign in again
          </button>
        </div>
      </Centered>
    );
  }

  if (pathname === '/') return <Navigate to={homeFor(me.role)} />;

  const allowed = canOpen(me.role, pathname);

  return (
    <div className="flex h-screen overflow-hidden bg-ivory">
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      <div className="relative flex flex-1 flex-col overflow-y-auto overflow-x-hidden">
        <Header sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
        <main className="flex-1">
          <div className="mx-auto max-w-screen-2xl p-4 md:p-6 2xl:p-10">
            {allowed ? (
              <Outlet />
            ) : (
              <div className="panel mx-auto mt-8 max-w-md p-8 text-center">
                <ShieldAlert
                  size={28}
                  strokeWidth={1.5}
                  className="mx-auto text-burgundy"
                />
                <h1 className="mt-3 font-serif text-headline-sm text-burgundy">
                  Access denied
                </h1>
                <p className="mt-2 text-body-sm text-on-surface-variant">
                  Your account ({roleConfig(me.role)?.label}) cannot open this
                  page.
                </p>
                <Link to={homeFor(me.role)} className="btn-primary mt-6">
                  Go to my dashboard
                </Link>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
