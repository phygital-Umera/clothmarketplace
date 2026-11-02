import SizeMaster from '@/pages/master/SizeMaster';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/sizes')({
  component: SizeMaster,
});

