export type Gender = 'MEN' | 'WOMEN' | 'UNISEX' | 'BOYS' | 'GIRLS' | 'KIDS';

export type ColorSwatch = {name: string; hex: string | null};

export type ProductCard = {
  id: string;
  slug: string | null;
  name: string;
  brand: string;
  category: string | null;
  subcategory: string | null;
  gender: Gender;
  image: string | null;
  colors: ColorSwatch[];
  price: number;
  mrp: number;
  discountPct: number;
  rating: {avg: number; count: number};
  inStock: boolean;
  stock: number;
  badge: 'OUT_OF_STOCK' | 'BESTSELLER' | 'LIMITED' | 'NEW' | null;
  sizes: string[];
  fabric: string | null;
  shop: {name: string; city: string};
};

export type Facet = {value: string; count: number};

export type ProductList = {
  items: ProductCard[];
  pagination: {total: number; page: number; limit: number; pages: number};
  facets: {
    categories: Facet[];
    subcategories: Facet[];
    brands: Facet[];
    sizes: Facet[];
    colors: (Facet & {hex: string | null})[];
    fabrics: Facet[];
    price: {min: number; max: number};
  };
};

export type Variant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  colorHex: string | null;
  image: string | null;
  price: number;
  mrp: number;
  discountPct: number;
  stock: number;
};

export type Review = {
  id: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  author: string;
  fit?: Fit | null;
  images?: string[];
};

export type ProductDetail = {
  id: string;
  slug: string | null;
  name: string;
  brand: string;
  category: string | null;
  subcategory: string | null;
  gender: Gender;
  shortDesc: string | null;
  description: string;
  attributes: Record<string, string | null>;
  careInstructions: string | null;
  returnEligible: boolean;
  returnPeriodDays: number;
  taxRate: number;
  images: {id: string; url: string; altText: string | null}[];
  mrp: number;
  price: number;
  colors: ColorSwatch[];
  sizes: string[];
  variants: Variant[];
  offers: Coupon[];
  shop: {name: string; city: string};
  rating: {avg: number; count: number; distribution: {star: number; count: number}[]};
  fit: {count: number; small: number; true: number; large: number} | null;
  reviews: Review[];
  similar: ProductCard[];
};

export type Coupon = {
  code: string;
  name: string | null;
  description: string | null;
  type: 'PERCENTAGE' | 'FLAT';
  discountValue: number;
  minPurchaseAmount: number;
  maxDiscountLimit: number | null;
  endDate: string;
};

export type Home = {
  categories: {name: string; count: number}[];
  under999: number;
  newArrivals: ProductCard[];
  trending: {women: ProductCard[]; men: ProductCard[]; kids: ProductCard[]};
  coupons: Coupon[];
  cities: string[];
};

export type DeliveryOption = 'STANDARD' | 'EXPRESS' | 'PICKUP';

export type CartLine = {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  brand: string;
  image: string | null;
  color: string;
  colorHex: string | null;
  size: string;
  sizeOptions: {variantId: string; size: string; stock: number}[];
  quantity: number;
  price: number;
  mrp: number;
  lineTotal: number;
  lineMrp: number;
  stock: number;
  shop: {name: string; city: string} | null;
  problem: string | null;
};

export type Cart = {
  items: CartLine[];
  count: number;
  summary: {
    totalMrp: number;
    discountOnMrp: number;
    itemsTotal: number;
    coupon: {code: string; description: string | null; discount: number} | null;
    couponError: string | null;
    delivery: DeliveryOption;
    deliveryFee: number;
    freeDeliveryAbove: number;
    total: number;
    savings: number;
  };
  hasProblems: boolean;
};

export type WishlistItem = {
  productId: string;
  name: string;
  brand: string;
  image: string | null;
  colorHex: string | null;
  price: number;
  mrp: number;
  discountPct: number;
  available: boolean;
  stock: number;
  variants: {variantId: string; size: string; color: string; colorHex: string | null; stock: number; price: number}[];
};

export type Address = {
  id: string;
  recipient: string;
  phone: string;
  address1: string;
  address2: string | null;
  city: string;
  district: string | null;
  state: string;
  postalCode: string;
  label: 'HOME' | 'WORK' | 'OTHER';
  isDefault: boolean;
};

export type AddressInput = Omit<Address, 'id' | 'district' | 'address2'> & {address2?: string; district?: string};

export type OrderStatus =
  | 'PENDING'
  | 'CONFIRMED'
  | 'PROCESSING'
  | 'PACKED'
  | 'READY_FOR_DISPATCH'
  | 'DISPATCHED'
  | 'SHIPPED'
  | 'OUT_FOR_DELIVERY'
  | 'DELIVERED'
  | 'CANCELLED'
  | 'RETURNED';

export type OrderItem = {
  id: string;
  productId: string;
  slug: string | null;
  variantId: string;
  name: string;
  size: string | null;
  color: string | null;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  image: string | null;
  taxRate: number;
  returnUntil: string | null;
  returnableQty: number;
  returnedQty: number;
  refundPerUnit: number;
};

export type ReturnResolution = 'REFUND' | 'EXCHANGE';
export type ReturnStatus = 'REQUESTED' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED' | 'RECEIVED' | 'COMPLETED';
export type RefundStatus = 'NONE' | 'PENDING' | 'APPROVED' | 'PROCESSED' | 'REJECTED';

export type OrderReturn = {
  id: string;
  reason: string;
  description: string | null;
  resolution: ReturnResolution;
  exchangeFor: string | null;
  images: string[];
  returnStatus: ReturnStatus;
  refundStatus: RefundStatus;
  refundAmount: number | null;
  createdAt: string;
  items: {orderItemId: string; name: string; size: string | null; color: string | null; image: string | null; quantity: number}[];
};

export type TrackStep = {key: string; label: string; at: string | null; done: boolean; current: boolean};

export type Order = {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED' | 'REFUNDED';
  paymentMethod: string;
  paymentDetails: {razorpayOrderId?: string; razorpayPaymentId?: string; lastError?: string} | null;
  subtotal: number;
  couponDiscount: number;
  couponCode: string | null;
  shippingFee: number;
  totalAmount: number;
  taxIncluded: number;
  shippingAddress: Address & {delivery?: DeliveryOption; contact?: {name: string; email: string | null; phone: string}};
  delivery: DeliveryOption;
  courierName: string | null;
  trackingNumber: string | null;
  cancelRequested: boolean;
  cancelApproved: boolean | null;
  cancelRejectionReason: string | null;
  createdAt: string;
  deliveredAt: string | null;
  expectedBy: string | null;
  shop: {id: string; name: string; phone: string | null; address: string | null; gstin: string | null} | null;
  seller: {name: string; address: string; city: string; state: string; postalCode: string};
  items: OrderItem[];
  steps: TrackStep[];
  history: {id: string; status: OrderStatus; comment: string | null; createdAt: string}[];
  returns: OrderReturn[];
  can: {cancel: boolean; track: boolean; return: boolean; review: boolean; invoice: boolean; buyAgain: boolean; pay: boolean};
  tab: OrderTab;
};

export type OrderTab = 'all' | 'active' | 'delivered' | 'cancelled' | 'returns';
export type OrderList = {items: Order[]; counts: Record<OrderTab, number>};

export type ReturnRow = OrderReturn & {order: {id: string; orderNumber: string; paymentMethod: string; createdAt: string}};

export type NotificationType = 'ORDER' | 'PAYMENT' | 'RETURN' | 'OFFER' | 'ACCOUNT';
export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
};
export type NotificationList = {items: Notification[]; total: number; unread: number; page: number; pages: number};

export type Profile = {
  id: string;
  fullname: string;
  email: string | null;
  phoneNumber: string;
  alternatePhone: string | null;
  gender: 'WOMAN' | 'MAN' | 'OTHER' | null;
  dateOfBirth: string | null;
  createdAt: string;
  lastLoginAt: string | null;
  stats: {orders: number; delivered: number; wishlist: number; reviews: number; unread: number};
};

export type Fit = 'SMALL' | 'TRUE' | 'LARGE';

export type RazorpayInfo = {
  provider: 'razorpay';
  keyId: string;
  razorpayOrderId: string;
  amount: number;
  currency: string;
  prefill: {name: string; email?: string; contact: string};
};

export type CheckoutResult = {
  orders: {id: string; orderNumber: string; totalAmount: number}[];
  total: number;
  paymentMethod: 'COD' | 'ONLINE';
  payment: RazorpayInfo | null;
};

export type PaymentStatus = {
  razorpayOrderId: string;
  paymentMethod: string;
  paymentStatus: 'PAID' | 'FAILED' | 'PENDING';
  lastError: string | null;
  total: number;
  orders: {id: string; orderNumber: string; totalAmount: number; items: number}[];
  address: Address;
};

export type Me = {
  id: string;
  fullname: string;
  email: string | null;
  phoneNumber: string;
  role: string;
};
