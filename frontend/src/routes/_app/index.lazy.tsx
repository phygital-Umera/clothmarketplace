import {createLazyFileRoute} from '@tanstack/react-router';

// "/" never renders: AppLayout sends each role to its own dashboard
export const Route = createLazyFileRoute('/_app/')({
  component: () => null,
});
