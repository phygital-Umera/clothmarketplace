import {Overlay} from '@/components/ui';
import usePermissions from '@/hooks/usePermissions';
import {Company} from '@/types/company';
import {Link} from '@tanstack/react-router';
import {Pencil, Trash2, X} from 'lucide-react';
import {ReactNode} from 'react';
import CompanyAvatar from './CompanyAvatar';
import StatusBadge from './StatusBadge';
import {formatDate} from './format';

type Props = {
  company: Company | null;
  onClose: () => void;
  onDelete: (company: Company) => void;
};

const Row = ({label, children}: {label: string; children: ReactNode}) => (
  <div className="grid grid-cols-[8rem_1fr] gap-3 py-2">
    <dt className="text-label-caps uppercase text-outline">{label}</dt>
    <dd className="break-words text-body-sm text-espresso">{children}</dd>
  </div>
);

const Group = ({title, children}: {title: string; children: ReactNode}) => (
  <section className="border-t border-ivory-300 px-6 py-4">
    <h3 className="mb-1 font-serif text-subheading text-burgundy">{title}</h3>
    <dl className="divide-y divide-ivory-200">{children}</dl>
  </section>
);

const CompanyDetailsDrawer = ({company, onClose, onDelete}: Props) => {
  const {can} = usePermissions();
  const canEdit = can('companies.edit');
  const canDelete = can('companies.delete');

  return (
    <Overlay
      open={!!company}
      onClose={onClose}
      placement="right"
      label="Company details"
    >
      {company && (
        <aside className="flex h-full w-full max-w-md flex-col border-l border-ivory-300 bg-white">
          <div className="flex items-start gap-4 px-6 py-5">
            <CompanyAvatar company={company} size="lg" />
            <div className="min-w-0 flex-1">
              <p className="text-technical-data uppercase text-outline">
                {company.code}
              </p>
              <h2 className="truncate font-serif text-headline-sm text-burgundy">
                {company.name}
              </h2>
              <div className="mt-1">
                <StatusBadge status={company.status} />
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="btn-icon"
              aria-label="Close details"
            >
              <X size={18} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <Group title="Contact">
              <Row label="Email">
                <a
                  href={`mailto:${company.email}`}
                  className="hover:text-burgundy"
                >
                  {company.email}
                </a>
              </Row>
              <Row label="Phone">+91 {company.contactNumber}</Row>
              <Row label="Address">{company.address}</Row>
            </Group>
            <Group title="Location">
              <Row label="City">{company.city}</Row>
              {company.district && (
                <Row label="District">{company.district}</Row>
              )}
              <Row label="State">{company.state}</Row>
              <Row label="Pincode">{company.postalCode}</Row>
            </Group>
            <Group title="Administrator">
              <Row label="Name">{company.adminName}</Row>
              <Row label="Email">{company.adminEmail}</Row>
              <Row label="Phone">+91 {company.adminPhone}</Row>
            </Group>
            <Group title="Record">
              <Row label="Added">{formatDate(company.createdAt)}</Row>
              <Row label="Last updated">{formatDate(company.updatedAt)}</Row>
            </Group>
          </div>

          {(canEdit || canDelete) && (
            <div className="flex gap-2 border-t border-ivory-300 px-6 py-4">
              {canEdit && (
                <Link
                  to="/super-admin/companies/$companyId/edit"
                  params={{companyId: company.id}}
                  className="btn-primary flex-1"
                >
                  <Pencil size={14} /> Edit
                </Link>
              )}
              {canDelete && (
                <button
                  type="button"
                  onClick={() => onDelete(company)}
                  className="btn border border-error/40 text-error hover:bg-error-container"
                >
                  <Trash2 size={14} /> Delete
                </button>
              )}
            </div>
          )}
        </aside>
      )}
    </Overlay>
  );
};

export default CompanyDetailsDrawer;
