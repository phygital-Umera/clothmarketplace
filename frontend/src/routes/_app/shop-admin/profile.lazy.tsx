import MyProfilePage from '@/pages/profile/MyProfilePage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/profile')({
  component: MyProfilePage,
});

