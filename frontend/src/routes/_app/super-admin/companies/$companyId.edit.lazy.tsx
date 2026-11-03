import {CompanyFormPage} from '@/pages/companies';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute(
  '/_app/super-admin/companies/$companyId/edit',
)({
  component: CompanyFormPage,
});
