import {Link} from '@tanstack/react-router';
import {ReactNode} from 'react';

type Crumb = {label: string; to?: string};

type PageHeaderProps = {
  breadcrumbs: Crumb[];
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  /** Tighter spacing and a smaller title, for form pages */
  compact?: boolean;
};

const PageHeader = ({
  breadcrumbs,
  title,
  subtitle,
  actions,
  compact = false,
}: PageHeaderProps) => (
  <header
    className={`flex flex-col border-b border-ivory-300 md:flex-row md:items-end md:justify-between ${
      compact ? 'mb-4 gap-2 pb-3' : 'mb-6 gap-4 pb-5'
    }`}
  >
    <div className="min-w-0">
      <nav aria-label="Breadcrumb">
        <ol className="flex flex-wrap items-center gap-1.5 text-label-caps uppercase text-outline">
          {breadcrumbs.map((crumb, i) => (
            <li key={crumb.label} className="flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">/</span>}
              {crumb.to ? (
                <Link to={crumb.to} className="hover:text-burgundy">
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="text-burgundy">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>
      <h1
        className={`font-serif text-burgundy ${
          compact
            ? 'mt-1 text-headline-sm'
            : 'mt-2 text-headline-lg-mobile md:text-headline-md'
        }`}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="mt-1 text-body-md text-on-surface-variant">{subtitle}</p>
      )}
    </div>
    {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
  </header>
);

export default PageHeader;
