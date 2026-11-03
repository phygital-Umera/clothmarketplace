import {Column, ConfirmDialog, GenericTable} from '@/components/Forms';
import ListToolbar, {FilterSelect} from '@/components/Org/ListToolbar';
import {PageHeader} from '@/components/ui';
import useListState from '@/hooks/useListState';
import {useCompanies} from '@/lib/react-query/queriesAndMutations/company';
import {
  useCategoryOptions,
  useDeleteProduct,
  useProducts,
  useSetProductStatus,
} from '@/lib/react-query/queriesAndMutations/catalog';
import {CatalogPanel, Product} from '@/types/catalog';
import {getErrorMessage} from '@/utils/axios';
import {Link, useNavigate} from '@tanstack/react-router';
import {
  Archive,
  Eye,
  EyeOff,
  Package,
  Pencil,
  Plus,
  Send,
  Trash2,
} from 'lucide-react';
import {useState} from 'react';
import ProductStatusBadge from './ProductStatusBadge';

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Draft', value: 'DRAFT'},
  {label: 'Published', value: 'PUBLISHED'},
  {label: 'Unpublished', value: 'UNPUBLISHED'},
  {label: 'Archived', value: 'ARCHIVED'},
];

const inr = (n: number) => `₹${n.toLocaleString('en-IN')}`;

type Pending = {product: Product; status: 'UNPUBLISHED' | 'ARCHIVED'} | null;

/**
 * Products for every panel. What each row offers (edit / publish / delete)
 * comes from the backend (canEdit / canPublish); the backend checks it again.
 */
const ProductList = ({panel}: {panel: CatalogPanel}) => {
  const isSuper = panel === 'super-admin';
  const navigate = useNavigate();
  const list = useListState();
  const {data, isPending, isError, error, refetch, isFetching} = useProducts(
    panel,
    list.params,
  );
  const categories = useCategoryOptions(panel);
  const companies = useCompanies({page: 1, limit: 100}, isSuper);
  const setStatus = useSetProductStatus(panel);
  const remove = useDeleteProduct();
  const [pending, setPending] = useState<Pending>(null);
  const [toDelete, setToDelete] = useState<Product | null>(null);

  const openProduct = (p: Product) =>
    navigate({to: `/${panel}/products/$productId`, params: {productId: p.id}});

  const columns: Column<Product>[] = [
    {
      header: 'Product',
      key: 'name',
      sortable: true,
      render: (p) => (
        <div className="flex items-center gap-3">
          {p.mainImage ? (
            <img
              src={p.mainImage}
              alt=""
              className="h-11 w-11 border border-ivory-300 object-cover"
            />
          ) : (
            <span className="flex h-11 w-11 items-center justify-center border border-ivory-300 bg-ivory-100 text-outline">
              <Package size={16} />
            </span>
          )}
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
    ...(isSuper
      ? [
          {
            header: 'Company',
            render: (p: Product) => p.company.name,
          } as Column<Product>,
        ]
      : []),
    {header: 'Category', hideBelow: 'lg', render: (p) => p.category.name},
    {
      header: 'Price',
      key: 'sellingPrice',
      sortable: true,
      align: 'right',
      render: (p) => (
        <>
          <p className="text-espresso">{inr(p.sellingPrice)}</p>
          {p.mrp > p.sellingPrice && (
            <p className="text-technical-data text-outline line-through">
              {inr(p.mrp)}
            </p>
          )}
        </>
      ),
    },
    {
      header: 'Variants',
      key: 'activeVariantCount',
      align: 'right',
      hideBelow: 'xl',
    },
    {header: 'Stock', key: 'stock', align: 'right', hideBelow: 'lg'},
    {
      header: 'Status',
      key: 'status',
      render: (p) => <ProductStatusBadge status={p.status} />,
    },
  ];

  const addButton = !isSuper && (
    <Link to={`/${panel}/products/new`} className="btn-primary">
      <Plus size={14} /> Add Product
    </Link>
  );

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Catalog'}]}
        title="Products"
        actions={addButton}
      />
      <GenericTable
        caption="Products"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorTitle="Products could not be loaded"
        errorMessage={getErrorMessage(error, 'Something went wrong.')}
        onRetry={() => refetch()}
        emptyIcon={<Package size={22} strokeWidth={1.5} />}
        emptyTitle={
          list.hasFilters ? 'No matching products' : 'No products yet'
        }
        emptyAction={
          list.hasFilters ? (
            <button type="button" onClick={list.clear} className="btn-ghost">
              Clear filters
            </button>
          ) : (
            addButton
          )
        }
        onRowClick={openProduct}
        rowActions={(p) => [
          {
            label: p.canEdit ? 'Edit' : 'View',
            icon: p.canEdit ? <Pencil size={16} /> : <Eye size={16} />,
            onClick: openProduct,
          },
          ...(p.canPublish && p.status !== 'PUBLISHED'
            ? [
                {
                  label: 'Publish',
                  icon: <Send size={16} />,
                  onClick: () =>
                    setStatus.mutate({id: p.id, status: 'PUBLISHED'}),
                },
              ]
            : []),
          ...((p.canPublish || isSuper) && p.status === 'PUBLISHED'
            ? [
                {
                  label: 'Unpublish',
                  icon: <EyeOff size={16} />,
                  onClick: () =>
                    setPending({product: p, status: 'UNPUBLISHED'}),
                },
              ]
            : []),
          ...(p.canPublish && p.status !== 'ARCHIVED'
            ? [
                {
                  label: 'Archive',
                  icon: <Archive size={16} />,
                  onClick: () => setPending({product: p, status: 'ARCHIVED'}),
                },
              ]
            : []),
          ...(panel === 'company-admin'
            ? [
                {
                  label: 'Delete',
                  icon: <Trash2 size={16} />,
                  onClick: setToDelete,
                  tone: 'danger' as const,
                },
              ]
            : []),
        ]}
        pagination={data?.pagination}
        onPageChange={list.setPage}
        sort={list.sort}
        onSortChange={list.setSort}
        toolbar={
          <ListToolbar
            tabs={STATUS_TABS}
            tab={list.filters.status}
            onTab={(status) => list.setFilter({status})}
            searchText={list.searchText}
            onSearch={list.setSearchText}
            placeholder="Search name, SKU or tag"
          >
            {isSuper && (
              <FilterSelect
                label="Companies"
                value={list.filters.companyId}
                onChange={(companyId) => list.setFilter({companyId})}
                options={(companies.data?.items ?? []).map((c) => ({
                  value: c.id,
                  label: c.name,
                }))}
              />
            )}
            <FilterSelect
              label="Categories"
              value={list.filters.categoryId}
              onChange={(categoryId) => list.setFilter({categoryId})}
              options={categories.data ?? []}
            />
          </ListToolbar>
        }
      />

      <ConfirmDialog
        open={!!pending}
        title={
          pending?.status === 'ARCHIVED'
            ? 'Archive product?'
            : 'Unpublish product?'
        }
        message={`${pending?.product.name ?? 'This product'} will no longer be shown in the store.`}
        confirmLabel={pending?.status === 'ARCHIVED' ? 'Archive' : 'Unpublish'}
        tone="danger"
        requireReason={isSuper}
        isLoading={setStatus.isPending}
        onCancel={() => setPending(null)}
        onConfirm={async (reason) => {
          if (!pending) return;
          await setStatus
            .mutateAsync({
              id: pending.product.id,
              status: pending.status,
              reason,
            })
            .catch(() => undefined);
          setPending(null);
        }}
      />
      <ConfirmDialog
        open={!!toDelete}
        title="Delete product?"
        message={`${toDelete?.name ?? 'This product'} will be removed from your catalog. Order history keeps it.`}
        confirmLabel="Delete"
        tone="danger"
        isLoading={remove.isPending}
        onCancel={() => setToDelete(null)}
        onConfirm={async () => {
          if (toDelete)
            await remove.mutateAsync(toDelete.id).catch(() => undefined);
          setToDelete(null);
        }}
      />
    </>
  );
};

export default ProductList;
