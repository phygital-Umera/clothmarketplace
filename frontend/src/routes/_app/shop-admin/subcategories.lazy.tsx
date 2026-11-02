import SubcategoryMaster from '@/pages/master/SubcategoryMaster';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/subcategories')({
  component: SubcategoryMaster,
});

