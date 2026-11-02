import {Menu} from 'lucide-react';
import DropdownUser from './DropdownUser';

const Header = (props: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) => {
  return (
    <header className="sticky top-0 z-50 flex w-full border-b border-ivory-300 bg-ivory/95 backdrop-blur">
      <div className="flex flex-grow items-center justify-between gap-4 px-4 py-3 md:px-6 2xl:px-10">
        <div className="flex items-center gap-3">
          <button
            aria-controls="sidebar"
            aria-expanded={props.sidebarOpen}
            aria-label="Open menu"
            onClick={(e) => {
              e.stopPropagation();
              props.setSidebarOpen(!props.sidebarOpen);
            }}
            className="btn-icon border-ivory-300 lg:hidden"
          >
            <Menu size={18} />
          </button>
          <span className="font-serif text-subheading text-burgundy lg:hidden">
            Cloth Pro
          </span>
        </div>

        <DropdownUser />
      </div>
    </header>
  );
};

export default Header;
