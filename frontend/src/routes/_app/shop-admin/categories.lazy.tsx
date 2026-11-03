import CategoryMaster from '@/pages/master/CategoryMaster';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/categories')({
  component: CategoryMaster,
});

