import {PageHeader, StatusBadge} from '@/components/ui';
import {useBranchProfile} from '@/lib/react-query/queriesAndMutations/org';
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

const day = (d: string) => d.charAt(0) + d.slice(1, 3).toLowerCase();

/** Branch admin: their branch (read-only; the company admin edits it) */
const BranchProfile = () => {
  const {data: branch, isPending, isError, error} = useBranchProfile();

  if (isPending) {
    return (
      <div className="flex items-center gap-2 py-16 text-on-surface-variant">
        <Loader2 size={16} className="animate-spin" /> Loading branch…
      </div>
    );
  }
  if (isError) {
    return (
      <p role="alert" className="panel p-6 text-body-sm text-error">
        {getErrorMessage(error, 'Branch could not be loaded.')}
      </p>
    );
  }

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Branch Profile'}]}
        title={branch.name}
        actions={<StatusBadge status={branch.status} />}
      />
      <div className="grid gap-4 lg:grid-cols-3">
        <Group title="Branch">
          <Row label="Code">{branch.code}</Row>
          <Row label="Company">{branch.company.name}</Row>
          <Row label="Email">{branch.email ?? '–'}</Row>
          <Row label="Phone">{branch.phone ? `+91 ${branch.phone}` : '–'}</Row>
        </Group>
        <Group title="Location">
          <Row label="Address">{branch.address}</Row>
          <Row label="City">{branch.city}</Row>
          <Row label="District">{branch.district}</Row>
          <Row label="State">{branch.state}</Row>
          <Row label="Pincode">{branch.postalCode}</Row>
        </Group>
        <Group title="Hours">
          <Row label="Open">
            {branch.openingTime && branch.closingTime
              ? `${branch.openingTime} – ${branch.closingTime}`
              : '–'}
          </Row>
          <Row label="Closed on">
            {branch.weeklyHolidays.length
              ? branch.weeklyHolidays.map(day).join(', ')
              : 'Open all week'}
          </Row>
        </Group>
      </div>
    </>
  );
};

export default BranchProfile;
