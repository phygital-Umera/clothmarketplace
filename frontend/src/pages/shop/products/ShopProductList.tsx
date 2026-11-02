import {Column, ConfirmDialog, GenericTable} from '@/components/Forms';
import ListToolbar, {FilterSelect} from '@/components/Org/ListToolbar';
import useProductMasters from '@/components/ShopProduct/useProductMasters';
import {PageHeader} from '@/components/ui';
import useListState from '@/hooks/useListState';
import {
  useDeleteShopProduct,
  useShopProducts,
} from '@/lib/react-query/queriesAndMutations/shopProduct';
import ProductStatusBadge from '@/pages/catalog/ProductStatusBadge';
import {LOW_STOCK, ShopProduct, StockFilter} from '@/types/shopProduct';
import {getErrorMessage} from '@/utils/axios';
import {useNavigate} from '@tanstack/react-router';
import {Eye, ImageOff, Package, Pencil, Plus, Trash2} from 'lucide-react';
import {useState} from 'react';

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Draft', value: 'DRAFT'},
  {label: 'Published', value: 'PUBLISHED'},
  {label: 'Unpublished', value: 'UNPUBLISHED'},
];

const STOCK_OPTIONS: {value: StockFilter; label: string}[] = [
  {value: 'in', label: 'In stock'},
  {value: 'low', label: `Low stock (≤ ${LOW_STOCK})`},
  {value: 'out', label: 'Out of stock'},
];

const money = (n: number) =>
  `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 2})}`;

export const StockBadge = ({qty}: {qty: number}) =>
  qty <= 0 ? (
    <span className="badge-inactive">Out of stock</span>
  ) : qty <= LOW_STOCK ? (
    <span className="badge rounded-full border border-hairline bg-blush text-burgundy">
      Low · {qty}
    </span>
  ) : (
    <span className="text-body-sm text-espresso">{qty}</span>
  );

const ShopProductList = () => {
  const navigate = useNavigate();
  const list = useListState();
  const masters = useProductMasters(list.filters.categoryId);
  const {data, isPending, isError, error, refetch, isFetching} =
    useShopProducts({
      ...list.params,
      stock: list.filters.stock as StockFilter | undefined,
    });
  const remove = useDeleteShopProduct();
  const [toDelete, setToDelete] = useState<ShopProduct | null>(null);

  const view = (p: ShopProduct) =>
    navigate({
      to: '/shop-admin/products/$productId',
      params: {productId: p.id},
    });
  const edit = (p: ShopProduct) =>
    navigate({
      to: '/shop-admin/products/edit/$productId',
      params: {productId: p.id},
    });

  const columns: Column<ShopProduct>[] = [
    {
      header: 'Product',
      key: 'name',
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center border border-ivory-300 bg-ivory-100">
            {p.mainImage ? (
              <img
                src={p.mainImage}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageOff size={16} className="text-outline" />
            )}
          </div>
          <div className="min-w-0">
            <p className="truncate text-body-md font-medium text-espresso">
              {p.name}
            </p>
            <p className="text-technical-data uppercase text-outline">
              {p.sku}
            </p>
          </div>
        </div>
      ),
    },
    {
      header: 'Category',
      hideBelow: 'md',
      render: (p) => (
        <span className="text-body-sm text-espresso">
          {p.category.name}
          {p.subcategory && (
            <span className="text-outline"> › {p.subcategory.name}</span>
          )}
        </span>
      ),
    },
    {
      header: 'Colors',
      hideBelow: 'lg',
      render: (p) => (
        <div className="flex flex-wrap gap-1">
          {p.colors.map((c) => (
            <span
              key={c.id}
              title={c.name}
              className="h-4 w-4 rounded-full border border-hairline"
              style={{backgroundColor: c.hexCode}}
            />
          ))}
        </div>
      ),
    },
    {
      header: 'Sizes',
      hideBelow: 'lg',
      render: (p) => (
        <span className="text-espresso-muted text-body-sm">
          {p.sizes.map((s) => s.name).join(', ')}
        </span>
      ),
    },
    {
      header: 'Price',
      key: 'sellingPrice',
      sortable: true,
      align: 'right',
      render: (p) => (
        <div className="text-right">
          <p className="text-body-md text-espresso">{money(p.sellingPrice)}</p>
          {p.sellingPrice < p.mrp && (
            <p className="text-technical-data text-outline line-through">
              {money(p.mrp)}
            </p>
          )}
        </div>
      ),
    },
    {
      header: 'Stock',
      key: 'stockQuantity',
      sortable: true,
      align: 'right',
      render: (p) => <StockBadge qty={p.stockQuantity} />,
    },
    {
      header: 'Status',
      key: 'status',
      render: (p) => <ProductStatusBadge status={p.status} />,
    },
  ];

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Shop'}, {label: 'Products'}]}
        title="Product Management"
        actions={
          <button
            type="button"
            onClick={() => navigate({to: '/shop-admin/products/new'})}
            className="btn-primary"
          >
            <Plus size={14} /> Add Product
          </button>
        }
      />

      <GenericTable
        caption="Products"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorMessage={getErrorMessage(error, 'Failed to load products')}
        onRetry={() => refetch()}
        emptyIcon={<Package size={22} strokeWidth={1.5} />}
        emptyTitle={
          list.hasFilters ? 'No matching products' : 'No products yet'
        }
        emptyMessage={
          list.hasFilters
            ? undefined
            : 'Add your first product with its sizes, colors and images.'
        }
        onRowClick={view}
        rowActions={(p) => [
          {label: 'View', icon: <Eye size={16} />, onClick: view},
          {label: 'Edit', icon: <Pencil size={16} />, onClick: edit},
          {
            label: 'Delete',
            icon: <Trash2 size={16} />,
            tone: 'danger',
            onClick: () => setToDelete(p),
          },
        ]}
        pagination={data?.pagination}
        onPageChange={list.setPage}
        sort={list.sort}
        onSortChange={list.setSort}
        toolbar={
          <div className="flex flex-col gap-3">
            <ListToolbar
              tabs={STATUS_TABS}
              tab={list.filters.status}
              onTab={(status) => list.setFilter({status})}
              searchText={list.searchText}
              onSearch={list.setSearchText}
              placeholder="Search name, SKU or tag"
            />
            <div className="flex flex-col gap-2 border-t border-ivory-200 pt-2 sm:flex-row sm:flex-wrap">
              <FilterSelect
                label="Categories"
                value={list.filters.categoryId}
                onChange={(categoryId) =>
                  list.setFilter({categoryId, subcategoryId: undefined})
                }
                options={masters.categories.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
              <FilterSelect
                label="Subcategories"
                value={list.filters.subcategoryId}
                onChange={(subcategoryId) => list.setFilter({subcategoryId})}
                options={masters.subcategories.map((s) => ({
                  value: s.id,
                  label: list.filters.categoryId
                    ? s.name
                    : `${s.category?.name ?? ''} › ${s.name}`,
                }))}
              />
              <FilterSelect
                label="Colors"
                value={list.filters.colorId}
                onChange={(colorId) => list.setFilter({colorId})}
                options={masters.colors.map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
              <FilterSelect
                label="Sizes"
                value={list.filters.sizeId}
                onChange={(sizeId) => list.setFilter({sizeId})}
                options={masters.sizes.map((s) => ({
                  value: s.id,
                  label: s.name,
                }))}
              />
              <FilterSelect
                label="Stock"
                value={list.filters.stock}
                onChange={(stock) => list.setFilter({stock})}
                options={STOCK_OPTIONS}
              />
              {list.hasFilters && (
                <button type="button" className="btn-text" onClick={list.clear}>
                  Clear filters
                </button>
              )}
            </div>
          </div>
        }
      />

      <ConfirmDialog
        open={!!toDelete}
        title="Delete Product?"
        message={`"${toDelete?.name}" will be archived and removed from your product list. Order history is kept.`}
        confirmLabel="Delete Product"
        tone="danger"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await remove.mutateAsync(toDelete.id);
            setToDelete(null);
          } catch {
            // Error is handled by React Query toast
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
};

export default ShopProductList;
