import BranchStockTransfersPage from '@/pages/branch/BranchStockTransfersPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/stock-transfers')({
  component: BranchStockTransfersPage,
});
