import useCurrentUser from '@/hooks/useCurrentUser';
import {setOwnerShop, useOwnerShop} from '@/lib/ownerShop';
import {useShopOptions} from '@/lib/react-query/queriesAndMutations/org';
import {inShopPanel} from '@/lib/roles';
import {useRouterState} from '@tanstack/react-router';
import {Menu, Repeat} from 'lucide-react';
import DropdownUser from './DropdownUser';

const Header = (props: {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}) => {
  const {data: me} = useCurrentUser();
  const pathname = useRouterState({select: (s) => s.location.pathname});
  // Company admin working in one of their shops
  const ownerShop = useOwnerShop(me?.id);
  const openShop =
    me?.role === 'ADMIN' && inShopPanel(pathname) ? ownerShop : null;
  // With one shop the picker would just reopen it, so no "Change shop"
  const shops = useShopOptions('company-admin', undefined, !!openShop);
  const canChange = (shops.data?.length ?? 0) > 1;
  return (
    <header className="sticky top-0 z-50 flex w-full border-b border-ivory-300 bg-ivory/95 backdrop-blur">
      <div className="flex flex-grow items-center justify-between gap-4 px-4 py-3 md:px-6 2xl:px-10">
        <div className="flex min-w-0 items-center gap-3">
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
          {/* Shop staff: which counter they are working on */}
          {me?.shop && (
            <p className="hidden truncate text-technical-data text-on-surface-variant md:block">
              {[
                me.shop.name,
                me.branch?.name,
                me.shop.gstin && `GSTIN ${me.shop.gstin}`,
              ]
                .filter(Boolean)
                .join(' · ')}
            </p>
          )}
          {openShop && (
            <>
              <p className="hidden truncate text-technical-data text-on-surface-variant sm:block">
                Selling in{' '}
                <span className="font-medium text-espresso">
                  {openShop.name}
                </span>
              </p>
              {canChange && (
                <button
                  type="button"
                  onClick={() => setOwnerShop(null)}
                  className="btn-text shrink-0"
                >
                  <Repeat size={14} /> Change shop
                </button>
              )}
            </>
          )}
        </div>

        <DropdownUser />
      </div>
    </header>
  );
};

export default Header;
