import {PageHeader} from '@/components/ui';
import {Link} from '@tanstack/react-router';

type Props = {section: string; title: string; description: string};

/** Branch admin menu items whose screens are not built yet */
const ComingSoon = ({section, title, description}: Props) => (
  <>
    <PageHeader
      compact
      breadcrumbs={[{label: section}, {label: title}]}
      title={title}
    />
    <section className="panel flex flex-col items-start gap-3 p-6">
      <span className="badge-ribbon">Coming soon</span>
      <p className="max-w-xl text-body-md text-on-surface-variant">
        {description}
      </p>
      <Link to="/branch-admin/dashboard" className="btn-text">
        Back to dashboard
      </Link>
    </section>
  </>
);

export default ComingSoon;
