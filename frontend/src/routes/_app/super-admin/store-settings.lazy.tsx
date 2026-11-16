import StoreSettingsPage from '@/pages/superAdmin/StoreSettingsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/super-admin/store-settings')({
  component: StoreSettingsPage,
});
