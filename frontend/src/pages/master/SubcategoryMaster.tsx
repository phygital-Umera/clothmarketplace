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
import ViewDetailsDialog from '@/components/ui/ViewDetailsDialog';
import useListState from '@/hooks/useListState';
import {
  useDeleteMasterSubcategory,
  useMasterCategoryOptions,
  useMasterSubcategories,
  useSaveMasterSubcategory,
} from '@/lib/react-query/queriesAndMutations/master';
import {applyServerErrors, field} from '@/lib/validation/fieldRules';
import {MasterSubcategory} from '@/types/master';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  CircleCheck,
  CirclePause,
  Eye,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';

const schema = z.object({
  name: field({label: 'Subcategory Name', kind: 'text', max: 60}),
  categoryId: z
    .string({required_error: 'Parent Category is required'})
    .min(1, 'Please select a parent category'),
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
  categoryId: '',
  description: '',
  displayOrder: 0,
  isActive: true,
};

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Active', value: 'true'},
  {label: 'Inactive', value: 'false'},
];

const SubcategoryMaster = () => {
  const list = useListState();
  // Fetch real categories from the backend
  const categoryOptionsQuery = useMasterCategoryOptions();
  const categories = categoryOptionsQuery.data ?? [];
  const categoryOptions = categories.map((c) => ({
    value: c.id,
    label: c.name,
  }));

  const {data, isPending, isError, error, refetch, isFetching} =
    useMasterSubcategories({
      ...list.params,
      active: list.filters.status,
      categoryId: list.filters.categoryId,
    });

  const save = useSaveMasterSubcategory();
  const remove = useDeleteMasterSubcategory();

  const [editing, setEditing] = useState<MasterSubcategory | 'new' | null>(
    null,
  );
  const [viewing, setViewing] = useState<MasterSubcategory | null>(null);
  const [toDelete, setToDelete] = useState<MasterSubcategory | null>(null);
  const [formError, setFormError] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const openForm = (s: MasterSubcategory | 'new') => {
    setFormError('');
    form.reset(
      s === 'new'
        ? {
            ...EMPTY,
            // Pre-select current category filter if active
            categoryId: list.filters.categoryId ?? '',
          }
        : {
            name: s.name,
            categoryId: s.categoryId,
            description: s.description ?? '',
            displayOrder: s.displayOrder,
            isActive: s.isActive,
          },
    );
    setEditing(s);
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
        setFormError(getErrorMessage(err, 'Could not save the subcategory'));
      }
    }
  });

  const columns: Column<MasterSubcategory>[] = [
    {
      header: 'Subcategory',
      key: 'name',
      sortable: true,
      render: (s) => (
        <div>
          <p className="text-body-md font-medium text-espresso">{s.name}</p>
          <p className="text-technical-data uppercase text-outline">{s.code}</p>
        </div>
      ),
    },
    {
      header: 'Parent Category',
      render: (s) => (
        <span className="bg-sand/30 inline-flex items-center rounded-sm px-2.5 py-0.5 text-body-sm font-medium text-espresso">
          {s.category?.name ?? '–'}
        </span>
      ),
    },
    {
      header: 'Description',
      key: 'description',
      hideBelow: 'md',
      render: (s) => (
        <span className="text-on-surface-variant line-clamp-1">
          {s.description || '–'}
        </span>
      ),
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
      render: (s) => (
        <StatusBadge status={s.isActive ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[
          {label: 'Shop Masters', to: '/shop-admin/categories'},
          {label: 'Subcategories'},
        ]}
        title="Subcategory Management"
        actions={
          <button
            type="button"
            onClick={() => openForm('new')}
            className="btn-primary"
          >
            <Plus size={14} /> Add Subcategory
          </button>
        }
      />

      <GenericTable
        caption="Subcategories"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorMessage={getErrorMessage(error, 'Failed to load subcategories')}
        onRetry={() => refetch()}
        emptyIcon={<Layers size={22} strokeWidth={1.5} />}
        emptyTitle={
          list.hasFilters ? 'No matching subcategories' : 'No subcategories yet'
        }
        emptyMessage={
          list.hasFilters
            ? undefined
            : 'Add subcategories to organize products under parent categories.'
        }
        onRowClick={(s) => setViewing(s)}
        rowActions={(s) => [
          {
            label: 'View',
            icon: <Eye size={16} />,
            onClick: () => setViewing(s),
          },
          {
            label: 'Edit',
            icon: <Pencil size={16} />,
            onClick: () => openForm(s),
          },
          {
            label: s.isActive ? 'Deactivate' : 'Activate',
            icon: s.isActive ? (
              <CirclePause size={16} />
            ) : (
              <CircleCheck size={16} />
            ),
            onClick: () => save.mutate({id: s.id, isActive: !s.isActive}),
          },
          {
            label: 'Delete',
            icon: <Trash2 size={16} />,
            tone: 'danger',
            onClick: () => setToDelete(s),
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
              placeholder="Search subcategory name or code"
            />
            {/* Category filter pills if options exist */}
            {categoryOptions.length > 0 && (
              <div className="flex flex-wrap items-center gap-1.5 border-t border-ivory-200 pt-2 text-body-sm">
                <span className="mr-1 text-technical-data font-medium uppercase text-outline">
                  Filter Category:
                </span>
                <button
                  type="button"
                  onClick={() => list.setFilter({categoryId: undefined})}
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                    !list.filters.categoryId
                      ? 'bg-burgundy text-white'
                      : 'bg-ivory-200 text-espresso hover:bg-ivory-300'
                  }`}
                >
                  All ({categories.length})
                </button>
                {categoryOptions.map((c) => (
                  <button
                    key={c.value}
                    type="button"
                    onClick={() => list.setFilter({categoryId: c.value})}
                    className={`rounded-full px-2.5 py-0.5 text-xs font-medium transition ${
                      list.filters.categoryId === c.value
                        ? 'bg-burgundy text-white'
                        : 'bg-ivory-200 text-espresso hover:bg-ivory-300'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        }
      />

      {/* Add / Edit Dialog */}
      <FormProvider {...form}>
        <FormDialog
          open={!!editing}
          title={editing === 'new' ? 'Add Subcategory' : 'Edit Subcategory'}
          onClose={() => setEditing(null)}
          onSubmit={submit}
          saving={form.formState.isSubmitting}
          error={formError}
          saveLabel={editing === 'new' ? 'Save Subcategory' : 'Save Changes'}
        >
          <GenericDropdown
            name="categoryId"
            label="Parent Category"
            required
            options={categoryOptions}
            placeholder="Select parent category"
            loading={categoryOptionsQuery.isPending}
            hint={
              categoryOptions.length === 0
                ? 'No categories found. Create a category first.'
                : undefined
            }
          />
          <GenericInputField
            name="name"
            label="Subcategory Name"
            kind="text"
            required
            autoFocus
            placeholder="e.g. T-Shirts, Jeans, Kurtas, Sarees"
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
            placeholder="Brief description about this subcategory..."
          />
          <GenericSwitch
            name="isActive"
            label="Active Status"
            description="Active subcategories are available for product categorization."
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
            {label: 'Subcategory Name', value: viewing.name},
            {
              label: 'Parent Category',
              value: viewing.category?.name ?? '–',
            },
            {label: 'Subcategory Code', value: viewing.code},
            {
              label: 'Parent Category Code',
              value: viewing.category?.code ?? '–',
            },
            {label: 'Display Order', value: viewing.displayOrder},
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
        title="Delete Subcategory?"
        message={`Are you sure you want to delete subcategory "${toDelete?.name}" under "${toDelete?.category?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Subcategory"
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

export default SubcategoryMaster;
