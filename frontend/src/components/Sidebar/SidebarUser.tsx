import {useAuthContext} from '@/context/AuthContext';
import {logoutUser} from '@/lib/api/Auth/auth';
import {setOwnerShop} from '@/lib/ownerShop';
import {roleConfig} from '@/lib/roles';
import {useQueryClient} from '@tanstack/react-query';
import {Link} from '@tanstack/react-router';
import {LogOut} from 'lucide-react';

// Bottom of the sidebar: who is signed in, their role, and sign out
const SidebarUser = ({onNavigate}: {onNavigate: () => void}) => {
  const {user, logout} = useAuthContext();
  const queryClient = useQueryClient();

  const handleSignOut = async () => {
    // Sign out locally even if the server is unreachable
    await logoutUser().catch(() => undefined);
    setOwnerShop(null);
    queryClient.clear();
    logout();
  };

  const initials = (user?.fullname || user?.email || '?')
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="flex items-center gap-2 border-t border-[#5c1c2b] px-3 py-3">
      <Link
        to="/my-profile"
        onClick={onNavigate}
        title="My profile"
        className="flex min-w-0 flex-1 items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-[#5C1E2B]"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#FAF7F5] font-serif text-sm text-burgundy">
          {initials}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold text-white">
            {user?.fullname}
          </span>
          <span className="block truncate text-[10px] font-bold uppercase tracking-wider text-[#C99A9F]">
            {roleConfig(user?.role)?.label ?? user?.role}
          </span>
        </span>
      </Link>
      <button
        type="button"
        onClick={handleSignOut}
        title="Sign out"
        aria-label="Sign out"
        className="shrink-0 rounded-lg p-2 text-[#D4B5B9] transition-colors hover:bg-[#5C1E2B] hover:text-white"
      >
        <LogOut size={18} />
      </button>
    </div>
  );
};

export default SidebarUser;
