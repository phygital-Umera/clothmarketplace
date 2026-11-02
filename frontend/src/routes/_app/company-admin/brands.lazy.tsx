import BrandList from '@/pages/catalog/BrandList';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/brands')({
  component: () => <BrandList panel="company-admin" />,
});
