import {APP_NAME} from '@/lib/appName';
import {Menu} from 'lucide-react';

// Small screens only: opens the sidebar. On desktop the sidebar is always
// visible and carries the account, role and sign out at its bottom.
const Header = (props: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) => (
  <header className="sticky top-0 z-50 flex w-full items-center gap-3 border-b border-ivory-300 bg-ivory/95 px-3 py-2 backdrop-blur sm:px-4 lg:hidden">
    <button
      aria-controls="sidebar"
      aria-expanded={props.sidebarOpen}
      aria-label="Open menu"
      onClick={(e) => {
        e.stopPropagation();
        props.setSidebarOpen(!props.sidebarOpen);
      }}
      className="btn-icon border-ivory-300"
    >
      <Menu size={18} />
    </button>
    <span className="font-serif text-subheading text-burgundy">{APP_NAME}</span>
  </header>
);

export default Header;
