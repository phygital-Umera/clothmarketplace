import PromotionsPage from '@/pages/promotions/PromotionsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/promotions/')({
  component: () => <PromotionsPage panel="shop-admin" />,
});

