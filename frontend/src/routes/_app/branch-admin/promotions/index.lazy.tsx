import PromotionsPage from '@/pages/promotions/PromotionsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/promotions/')({
  component: () => <PromotionsPage panel="branch-admin" />,
});

