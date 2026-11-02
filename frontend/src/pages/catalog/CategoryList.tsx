import {
  Column,
  ConfirmDialog,
  GenericDropdown,
  GenericInputField,
  GenericSwitch,
  GenericTable,
  GenericTextArea,
} from '@/components/Forms';
import ListToolbar from '@/components/Org/ListToolbar';
import {PageHeader, StatusBadge} from '@/components/ui';
import FormDialog from '@/components/ui/FormDialog';
import useListState from '@/hooks/useListState';
import {
  useCategories,
  useDeleteCategory,
  useSaveCategory,
} from '@/lib/react-query/queriesAndMutations/catalog';
import {applyServerErrors, field} from '@/lib/validation/fieldRules';
import {Category} from '@/types/catalog';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  CircleCheck,
  CirclePause,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from 'lucide-react';
import {useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';

const schema = z.object({
  name: field({label: 'Category Name', kind: 'text', max: 60}),
  parentId: z.string().optional(),
  displayOrder: field({
    label: 'Display Order',
    kind: 'displayOrder',
    required: false,
  }),
  description: field({
    label: 'Description',
    kind: 'text',
    max: 500,
    required: false,
  }),
  seoTitle: field({label: 'SEO Title', kind: 'text', max: 70, required: false}),
  seoDesc: field({
    label: 'SEO Description',
    kind: 'text',
    max: 160,
    required: false,
  }),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;
const EMPTY: Values = {
  name: '',
  parentId: '',
  displayOrder: 0,
  description: '',
  seoTitle: '',
  seoDesc: '',
  isActive: true,
};

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Active', value: 'true'},
  {label: 'Inactive', value: 'false'},
];

/** Super admin: the one category tree every company's products use */
const CategoryList = () => {
  const list = useListState();
  const {data, isPending, isError, error, refetch, isFetching} = useCategories({
    ...list.params,
    active: list.filters.status,
    status: undefined,
  });
  // Top-level categories, as parent choices
  const parents = useCategories({page: 1, limit: 100});
  const save = useSaveCategory();
  const remove = useDeleteCategory();
  const [editing, setEditing] = useState<Category | 'new' | null>(null);
  const [toDelete, setToDelete] = useState<Category | null>(null);
  const [formError, setFormError] = useState('');

  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });
  const open = (c: Category | 'new') => {
    setFormError('');
    form.reset(
      c === 'new'
        ? EMPTY
        : {
            name: c.name,
            parentId: c.parentId ?? '',
            displayOrder: c.displayOrder,
            description: c.description ?? '',
            seoTitle: c.seoTitle ?? '',
            seoDesc: c.seoDesc ?? '',
            isActive: c.isActive,
          },
    );
    setEditing(c);
  };
  const submit = form.handleSubmit(async (values) => {
    setFormError('');
    try {
      await save.mutateAsync({
        ...values,
        ...(editing && editing !== 'new' ? {id: editing.id} : {}),
      });
      setEditing(null);
    } catch (err) {
      if (!applyServerErrors(err, form.setError, Object.keys(EMPTY))) {
        setFormError(getErrorMessage(err, 'Could not save the category'));
      }
    }
  });

  const parentOptions = (parents.data?.items ?? [])
    .filter((c) => !c.parentId && (editing === 'new' || c.id !== editing?.id))
    .map((c) => ({value: c.id, label: c.name}));

  const columns: Column<Category>[] = [
    {
      header: 'Category',
      key: 'name',
      sortable: true,
      render: (c) => (
        <>
          <p className="text-body-md font-medium text-espresso">
            {c.parent ? `${c.parent.name} / ` : ''}
            {c.name}
          </p>
          <p className="text-technical-data uppercase text-outline">{c.code}</p>
        </>
      ),
    },
    {header: 'Products', key: 'productCount', align: 'right'},
    {
      header: 'Order',
      key: 'displayOrder',
      sortable: true,
      align: 'right',
      hideBelow: 'lg',
    },
    {
      header: 'Status',
      key: 'isActive',
      render: (c) => (
        <StatusBadge status={c.isActive ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Catalog'}]}
        title="Categories"
        actions={
          <button
            type="button"
            onClick={() => open('new')}
            className="btn-primary"
          >
            <Plus size={14} /> Add Category
          </button>
        }
      />
      <GenericTable
        caption="Categories"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorMessage={getErrorMessage(error, 'Something went wrong.')}
        onRetry={() => refetch()}
        emptyIcon={<Tags size={22} strokeWidth={1.5} />}
        emptyTitle={
          list.hasFilters ? 'No matching categories' : 'No categories yet'
        }
        emptyMessage={
          list.hasFilters
            ? undefined
            : 'Create the store categories, e.g. Men > Shirts.'
        }
        onRowClick={open}
        rowActions={(c) => [
          {label: 'Edit', icon: <Pencil size={16} />, onClick: open},
          {
            label: c.isActive ? 'Deactivate' : 'Activate',
            icon: c.isActive ? (
              <CirclePause size={16} />
            ) : (
              <CircleCheck size={16} />
            ),
            onClick: () => save.mutate({id: c.id, isActive: !c.isActive}),
          },
          ...(c.productCount || c.childCount
            ? []
            : [
                {
                  label: 'Delete',
                  icon: <Trash2 size={16} />,
                  onClick: setToDelete,
                  tone: 'danger' as const,
                },
              ]),
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
            placeholder="Search name or code"
          />
        }
      />

      <FormProvider {...form}>
        <FormDialog
          open={!!editing}
          title={editing === 'new' ? 'Add Category' : 'Edit Category'}
          onClose={() => setEditing(null)}
          onSubmit={submit}
          saving={form.formState.isSubmitting}
          error={formError}
        >
          <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
            <GenericInputField
              name="name"
              label="Category Name"
              kind="text"
              required
              autoFocus
            />
            <GenericInputField
              name="displayOrder"
              label="Display Order"
              kind="displayOrder"
            />
          </div>
          <GenericDropdown
            name="parentId"
            label="Parent Category"
            placeholder="None (top level)"
            options={parentOptions}
          />
          <GenericTextArea
            name="description"
            label="Description"
            rows={2}
            maxLength={500}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <GenericInputField
              name="seoTitle"
              label="SEO Title"
              kind="text"
              maxLength={70}
            />
            <GenericInputField
              name="seoDesc"
              label="SEO Description"
              kind="text"
              maxLength={160}
            />
          </div>
          <GenericSwitch
            name="isActive"
            label="Active"
            description="Inactive categories cannot be used for new products."
          />
        </FormDialog>
      </FormProvider>

      <ConfirmDialog
        open={!!toDelete}
        title="Delete category?"
        message={`${toDelete?.name ?? 'This category'} has no products and will be removed.`}
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

export default CategoryList;
