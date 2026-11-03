import {CompanyAvatar, formatDate, StatusBadge} from '@/components/Company';
import {PageHeader} from '@/components/ui';
import {useCompanyProfile} from '@/lib/react-query/queriesAndMutations/org';
import {getErrorMessage} from '@/utils/axios';
import {Loader2} from 'lucide-react';
import {ReactNode} from 'react';

const Row = ({label, children}: {label: string; children: ReactNode}) => (
  <div className="grid grid-cols-[8rem_1fr] gap-3 py-2">
    <dt className="text-label-caps uppercase text-outline">{label}</dt>
    <dd className="break-words text-body-sm text-espresso">{children}</dd>
  </div>
);

const Group = ({title, children}: {title: string; children: ReactNode}) => (
  <section className="panel p-4 md:p-5">
    <h2 className="mb-1 border-b border-ivory-300 pb-1.5 text-label-caps uppercase text-burgundy">
      {title}
    </h2>
    <dl className="divide-y divide-ivory-200">{children}</dl>
  </section>
);

/** Home page of a COMPANY_ADMIN: their company's details (read-only) */
const MyCompany = () => {
  const {
    data: company,
    isPending,
    isError,
    error,
    refetch,
  } = useCompanyProfile();

  if (isPending) {
    return (
      <div className="flex items-center gap-2 py-16 text-on-surface-variant">
        <Loader2 size={16} className="animate-spin" /> Loading company…
      </div>
    );
  }

  if (isError) {
    return (
      <div className="panel px-6 py-12 text-center">
        <p className="font-serif text-headline-sm text-burgundy">
          Company not available
        </p>
        <p className="mt-1 text-body-sm text-on-surface-variant">
          {getErrorMessage(error, 'Something went wrong.')}
        </p>
        <button onClick={() => refetch()} className="btn-ghost mt-4">
          Try again
        </button>
      </div>
    );
  }

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Company Profile'}]}
        title={company.name}
      />

      <div className="panel mb-4 flex items-center gap-4 p-4 md:p-5">
        <CompanyAvatar company={company} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="text-technical-data uppercase text-outline">
            {company.code}
          </p>
          <p className="truncate font-serif text-headline-sm text-burgundy">
            {company.name}
          </p>
        </div>
        <StatusBadge status={company.status} />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Group title="Contact">
          <Row label="Email">{company.email}</Row>
          <Row label="Phone">+91 {company.contactNumber}</Row>
        </Group>
        <Group title="Location">
          <Row label="Address">{company.address}</Row>
          <Row label="City">{company.city}</Row>
          {company.district && <Row label="District">{company.district}</Row>}
          <Row label="State">{company.state}</Row>
          <Row label="Pincode">{company.postalCode}</Row>
        </Group>
        <Group title="Administrator">
          <Row label="Name">{company.adminName}</Row>
          <Row label="Email">{company.adminEmail}</Row>
          <Row label="Phone">+91 {company.adminPhone}</Row>
          <Row label="Since">{formatDate(company.createdAt)}</Row>
        </Group>
      </div>
    </>
  );
};

export default MyCompany;
