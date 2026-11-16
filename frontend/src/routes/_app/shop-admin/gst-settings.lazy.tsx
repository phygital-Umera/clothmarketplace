import GstSettingsPage from '@/pages/shop/settings/GstSettingsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/gst-settings')({
  component: GstSettingsPage,
});
