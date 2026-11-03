import {useState} from 'react';
import ClickOutside from '../ClickOutside';
import {useAuthContext} from '@/context/AuthContext';
import {roleConfig} from '@/lib/roles';
import {logoutUser} from '@/lib/api/Auth/auth';
import {ChevronDown, LogOut} from 'lucide-react';
import {useQueryClient} from '@tanstack/react-query';

const DropdownUser = () => {
  const {user, logout} = useAuthContext();
  const queryClient = useQueryClient();
  const [dropdownOpen, setDropdownOpen] = useState<boolean>(false);

  const handleSignOut = async () => {
    // Sign out locally even if the server is unreachable
    await logoutUser().catch(() => undefined);
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
    <ClickOutside onClick={() => setDropdownOpen(false)} className="relative">
      <button
        type="button"
        onClick={() => setDropdownOpen(!dropdownOpen)}
        aria-expanded={dropdownOpen}
        className="flex items-center gap-3"
      >
        <span className="hidden text-right sm:block">
          <span className="block text-body-sm font-medium text-espresso">
            {user?.fullname}
          </span>
          <span className="block text-label-caps uppercase text-outline">
            {roleConfig(user?.role)?.label ?? user?.role}
          </span>
        </span>
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-burgundy font-serif text-ivory">
          {initials}
        </span>
        <ChevronDown size={14} className="text-outline" />
      </button>

      {dropdownOpen && (
        <div className="absolute right-0 mt-3 w-56 border border-ivory-300 bg-white">
          <div className="border-b border-ivory-300 px-4 py-3">
            <p className="truncate text-body-sm font-medium text-espresso">
              {user?.fullname}
            </p>
            <p className="truncate text-technical-data text-outline">
              {user?.email}
            </p>
          </div>
          <button
            onClick={handleSignOut}
            className="flex w-full items-center gap-3 px-4 py-3 text-body-sm text-espresso transition-colors hover:bg-ivory-100 hover:text-burgundy"
          >
            <LogOut size={16} /> Sign out
          </button>
        </div>
      )}
    </ClickOutside>
  );
};

export default DropdownUser;
