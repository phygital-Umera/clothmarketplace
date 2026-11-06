import {
  Column,
  ConfirmDialog,
  GenericInputField,
  GenericSwitch,
  GenericTable,
  GenericTextArea,
} from '@/components/Forms';
import ListToolbar from '@/components/Org/ListToolbar';
import {PageHeader, StatusBadge} from '@/components/ui';
import FormDialog from '@/components/ui/FormDialog';
import ViewDetailsDialog from '@/components/ui/ViewDetailsDialog';
import useListState from '@/hooks/useListState';
import {
  useDeleteMasterCategory,
  useMasterCategories,
  useSaveMasterCategory,
} from '@/lib/react-query/queriesAndMutations/master';
import {applyServerErrors, field} from '@/lib/validation/fieldRules';
import {MasterCategory} from '@/types/master';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  CircleCheck,
  CirclePause,
  Eye,
  Pencil,
  Plus,
  Tags,
  Trash2,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';

const schema = z.object({
  name: field({label: 'Category Name', kind: 'text', max: 60}),
  description: field({
    label: 'Description',
    kind: 'text',
    max: 500,
    required: false,
  }),
  displayOrder: field({
    label: 'Display Order',
    kind: 'displayOrder',
    required: false,
  }),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  name: '',
  description: '',
  displayOrder: 0,
  isActive: true,
};

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Active', value: 'true'},
  {label: 'Inactive', value: 'false'},
];

const CategoryMaster = () => {
  const list = useListState();
  const {data, isPending, isError, error, refetch, isFetching} =
    useMasterCategories({
      ...list.params,
      active: list.filters.status,
    });
  const save = useSaveMasterCategory();
  const remove = useDeleteMasterCategory();

  const [editing, setEditing] = useState<MasterCategory | 'new' | null>(null);
  const [viewing, setViewing] = useState<MasterCategory | null>(null);
  const [toDelete, setToDelete] = useState<MasterCategory | null>(null);
  const [formError, setFormError] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const openForm = (c: MasterCategory | 'new') => {
    setFormError('');
    form.reset(
      c === 'new'
        ? EMPTY
        : {
            name: c.name,
            description: c.description ?? '',
            displayOrder: c.displayOrder,
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

  const columns: Column<MasterCategory>[] = [
    {
      header: 'Category',
      key: 'name',
      sortable: true,
      render: (c) => (
        <div>
          <p className="text-body-md font-medium text-espresso">{c.name}</p>
          <p className="text-technical-data uppercase text-outline">{c.code}</p>
        </div>
      ),
    },
    {
      header: 'Description',
      key: 'description',
      hideBelow: 'md',
      render: (c) => (
        <span className="text-on-surface-variant line-clamp-1">
          {c.description || '–'}
        </span>
      ),
    },
    {
      header: 'Subcategories',
      align: 'right',
      render: (c) => c.subcategoryCount ?? 0,
    },
    {
      header: 'Products',
      align: 'right',
      hideBelow: 'lg',
      render: (c) => c.productCount ?? 0,
    },
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
        breadcrumbs={[
          {label: 'Shop Masters', to: '/shop-admin/categories'},
          {label: 'Categories'},
        ]}
        title="Category Management"
        actions={
          <button
            type="button"
            onClick={() => openForm('new')}
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
        errorMessage={getErrorMessage(error, 'Failed to load categories')}
        onRetry={() => refetch()}
        emptyIcon={<Tags size={22} strokeWidth={1.5} />}
        emptyTitle={
          list.hasFilters ? 'No matching categories' : 'No categories yet'
        }
        emptyMessage={
          list.hasFilters
            ? undefined
            : 'Get started by creating your first clothing category.'
        }
        onRowClick={(c) => setViewing(c)}
        rowActions={(c) => [
          {
            label: 'View',
            icon: <Eye size={16} />,
            onClick: () => setViewing(c),
          },
          {
            label: 'Edit',
            icon: <Pencil size={16} />,
            onClick: () => openForm(c),
          },
          {
            label: c.isActive ? 'Deactivate' : 'Activate',
            icon: c.isActive ? (
              <CirclePause size={16} />
            ) : (
              <CircleCheck size={16} />
            ),
            onClick: () => save.mutate({id: c.id, isActive: !c.isActive}),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={16} />,
            tone: 'danger',
            onClick: () => setToDelete(c),
          },
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
            placeholder="Search category name or code"
          />
        }
      />

      {/* Add / Edit Dialog */}
      <FormProvider {...form}>
        <FormDialog
          open={!!editing}
          title={editing === 'new' ? 'Add Category' : 'Edit Category'}
          onClose={() => setEditing(null)}
          onSubmit={submit}
          saving={form.formState.isSubmitting}
          error={formError}
          saveLabel={editing === 'new' ? 'Save Category' : 'Save Changes'}
        >
          <GenericInputField
            name="name"
            label="Category Name"
            kind="text"
            required
            autoFocus
            placeholder="e.g. Men's Wear, Ethnic, Casual"
          />
          <GenericInputField
            name="displayOrder"
            label="Display Order"
            kind="displayOrder"
            placeholder="0"
          />
          <GenericTextArea
            name="description"
            label="Description"
            rows={3}
            maxLength={500}
            placeholder="Brief description about this category..."
          />
          <GenericSwitch
            name="isActive"
            label="Active Status"
            description="Active categories are visible for subcategory creation and product listing."
          />
        </FormDialog>
      </FormProvider>

      {/* View Dialog */}
      {viewing && (
        <ViewDetailsDialog
          open={!!viewing}
          title={viewing.name}
          badge={
            <StatusBadge status={viewing.isActive ? 'ACTIVE' : 'INACTIVE'} />
          }
          onClose={() => setViewing(null)}
          items={[
            {label: 'Category Name', value: viewing.name},
            {label: 'Code', value: viewing.code},
            {label: 'Display Order', value: viewing.displayOrder},
            {label: 'Subcategories', value: viewing.subcategoryCount ?? 0},
            {label: 'Products Count', value: viewing.productCount ?? 0},
            {
              label: 'Created At',
              value: new Date(viewing.createdAt).toLocaleDateString(),
            },
            {
              label: 'Description',
              value: viewing.description,
              fullWidth: true,
            },
          ]}
        />
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Category?"
        message={`Are you sure you want to delete category "${toDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Category"
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

export default CategoryMaster;
