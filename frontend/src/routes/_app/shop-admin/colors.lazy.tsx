import ColorMaster from '@/pages/master/ColorMaster';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/colors')({
  component: ColorMaster,
});

