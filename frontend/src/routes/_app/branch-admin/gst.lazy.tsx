import ComingSoon from '@/pages/dashboards/ComingSoon';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/gst')({
  component: () => (
    <ComingSoon
      section="Reports"
      title="GST Summary"
      description="Output GST on sales, input GST on purchases and the net amount payable."
    />
  ),
});
