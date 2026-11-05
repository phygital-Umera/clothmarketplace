import BarcodeLabelsPage from '@/pages/shop/barcode/BarcodeLabelsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/branch-admin/barcode-labels')({
  component: () => <BarcodeLabelsPage panel="branch-admin" />,
});

