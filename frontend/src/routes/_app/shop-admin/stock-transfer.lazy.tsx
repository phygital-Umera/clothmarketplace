import BranchStockTransfersPage from '@/pages/branch/BranchStockTransfersPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/stock-transfer')({
  component: BranchStockTransfersPage,
});

