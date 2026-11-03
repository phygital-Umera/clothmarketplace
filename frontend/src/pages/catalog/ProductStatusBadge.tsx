import {ProductStatus} from '@/types/catalog';

// Existing tokens only: sage = live, blush = being prepared, ivory = off
const STYLES: Record<ProductStatus, {label: string; badge: string}> = {
  PUBLISHED: {label: 'Published', badge: 'badge-active'},
  DRAFT: {
    label: 'Draft',
    badge: 'badge rounded-full border border-hairline bg-blush text-burgundy',
  },
  PENDING_REVIEW: {
    label: 'In Review',
    badge: 'badge rounded-full border border-hairline bg-blush text-burgundy',
  },
  UNPUBLISHED: {label: 'Unpublished', badge: 'badge-inactive'},
  ARCHIVED: {label: 'Archived', badge: 'badge-inactive'},
};

const ProductStatusBadge = ({status}: {status: ProductStatus}) => (
  <span className={STYLES[status].badge}>{STYLES[status].label}</span>
);

export default ProductStatusBadge;
