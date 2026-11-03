import CategoryList from '@/pages/catalog/CategoryList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/super-admin/categories')({
  component: CategoryList,
});
