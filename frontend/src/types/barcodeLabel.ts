export type PurchaseBillOption = {
  id: string;
  billNumber: string;
  supplierName: string;
  billDate: string;
  totalQuantity: number;
  itemsCount: number;
  label: string;
};

export type BarcodeLabelRow = {
  id: string;
  productId: string;
  variantId?: string;
  productName: string;
  size: string;
  barcode: string;
  mrp: number;
  price: number;
  labels: number;
  selected: boolean;
  costCode?: string;
};

export type LabelSetupConfig = {
  labelSize: string;
  printer: string;
  showShopName: boolean;
  showItemNameSize: boolean;
  showMrp: boolean;
  showSalePrice: boolean;
  showCostCode: boolean;
};

export type PrintJobPayload = {
  sourceType: 'PURCHASE_BILL' | 'PRODUCT_PICK' | 'REPRINT';
  sourceRef?: string;
  labelSize: string;
  printer: string;
  showShopName: boolean;
  showItemNameSize: boolean;
  showMrp: boolean;
  showSalePrice: boolean;
  showCostCode: boolean;
  items: Array<{
    productId?: string;
    variantId?: string;
    productName: string;
    size: string;
    barcode: string;
    mrp: number;
    price: number;
    labelCount: number;
    costCode?: string;
  }>;
  totalLabels: number;
};

