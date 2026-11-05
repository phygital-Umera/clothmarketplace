import BarcodeLabelsPage from '@/pages/shop/barcode/BarcodeLabelsPage';
import {createLazyFileRoute} from '@tanstack/react-router';

export const Route = createLazyFileRoute('/_app/shop-admin/barcode-labels')({
  component: BarcodeLabelsPage,
});

