import {useAuthContext} from '@/context/AuthContext';
import {landingFor} from '@/lib/roles';
import {Navigate, Outlet} from '@tanstack/react-router';

const AuthLayout = () => {
  const {isAuthenticated, role} = useAuthContext();

  if (isAuthenticated) {
    const landing = landingFor(role);
    return <Navigate to={landing.to} search={landing.search as never} />;
  }

  return (
    <div className="grid min-h-screen bg-ivory lg:grid-cols-2">
      {/* Editorial panel */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-burgundy-deep p-margin-lg text-ivory lg:flex">
        <span className="font-serif text-headline-sm">Cloth Pro</span>
        <div>
          <p className="text-label-caps uppercase text-blush">Welcome</p>
          <h1 className="mt-4 max-w-md font-serif text-headline-lg">
            Every label, every atelier, in one place.
          </h1>
          <p className="mt-4 max-w-sm text-body-lg text-ivory/70">
            One sign-in for the platform team, company and branch admins, staff
            and customers. You land on the page your account is for.
          </p>
        </div>
        <span className="text-technical-data uppercase text-ivory/40">
          Admin, staff and customer sign-in
        </span>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -right-24 top-1/3 h-72 w-72 rounded-full border border-blush/20"
        />
      </div>

      <div className="flex items-center justify-center p-margin md:p-margin-md">
        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
