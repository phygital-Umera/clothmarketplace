import {MyCompany} from '@/pages/myCompany';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/company-admin/profile')({
  component: MyCompany,
});
