import {CompanyForm} from '@/components/Company';
import {PageHeader} from '@/components/ui';
import {
  useCompany,
  useCreateCompany,
  useUpdateCompany,
} from '@/lib/react-query/queriesAndMutations/company';
import {getErrorMessage} from '@/utils/axios';
import {Link, useNavigate, useParams} from '@tanstack/react-router';
import {Loader2} from 'lucide-react';

/** Add Company (/companies/new) and Edit Company (/companies/:id/edit) */
const CompanyFormPage = () => {
  const {companyId} = useParams({strict: false}) as {companyId?: string};
  const isEdit = !!companyId;
  const navigate = useNavigate();
  const toList = () => navigate({to: '/super-admin/companies'});

  const {data: company, isPending, isError, error} = useCompany(companyId);
  const create = useCreateCompany();
  const update = useUpdateCompany();

  const title = isEdit ? 'Edit Company' : 'Add Company';

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[
          {label: 'Companies', to: '/super-admin/companies'},
          {label: isEdit ? (company?.code ?? 'Edit') : 'New'},
        ]}
        title={isEdit && company ? company.name : title}
      />

      {!isEdit ? (
        <CompanyForm
          mode="create"
          onCancel={toList}
          onSubmit={async (payload, intent) => {
            await create.mutateAsync(payload);
            if (intent === 'save') toList();
          }}
        />
      ) : isPending ? (
        <div className="flex items-center gap-2 py-16 text-on-surface-variant">
          <Loader2 size={16} className="animate-spin" /> Loading company…
        </div>
      ) : isError ? (
        <div className="panel px-6 py-12 text-center">
          <p className="font-serif text-headline-sm text-burgundy">
            Company not available
          </p>
          <p className="mt-1 text-body-sm text-on-surface-variant">
            {getErrorMessage(error, 'It may have been deleted.')}
          </p>
          <Link to="/super-admin/companies" className="btn-ghost mt-4">
            Back to companies
          </Link>
        </div>
      ) : (
        <CompanyForm
          key={company.id}
          mode="edit"
          existingLogo={company.logo}
          hasAdminLogin={company.hasAdminLogin}
          defaultValues={{
            name: company.name,
            email: company.email,
            contactNumber: company.contactNumber,
            postalCode: company.postalCode,
            state: company.state,
            district: company.district ?? '',
            city: company.city,
            address: company.address,
            adminName: company.adminName,
            adminEmail: company.adminEmail,
            adminPhone: company.adminPhone,
            status: company.status === 'INACTIVE' ? 'INACTIVE' : 'ACTIVE',
            adminPassword: '',
          }}
          onCancel={toList}
          onSubmit={async (payload) => {
            await update.mutateAsync({id: company.id, ...payload});
            toList();
          }}
        />
      )}
    </>
  );
};

export default CompanyFormPage;
