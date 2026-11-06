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
  useDeleteMasterSize,
  useMasterSizes,
  useSaveMasterSize,
} from '@/lib/react-query/queriesAndMutations/master';
import {applyServerErrors, field} from '@/lib/validation/fieldRules';
import {MasterSize} from '@/types/master';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  CircleCheck,
  CirclePause,
  Eye,
  Pencil,
  Plus,
  Ruler,
  Trash2,
} from 'lucide-react';
import {useEffect, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';

const schema = z.object({
  name: z
    .string({required_error: 'Size Name is required'})
    .trim()
    .min(1, 'Size Name must be at least 1 character')
    .max(20, 'Size Name must be at most 20 characters'),
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

const COMMON_SIZES = [
  'XS',
  'S',
  'M',
  'L',
  'XL',
  'XXL',
  '3XL',
  '28',
  '30',
  '32',
  '34',
  '36',
  '38',
  '40',
  'Free Size',
];

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Active', value: 'true'},
  {label: 'Inactive', value: 'false'},
];

const SizeMaster = () => {
  const list = useListState();
  const {data, isPending, isError, error, refetch, isFetching} = useMasterSizes({
    ...list.params,
    active: list.filters.status,
  });
  const save = useSaveMasterSize();
  const remove = useDeleteMasterSize();

  const [editing, setEditing] = useState<MasterSize | 'new' | null>(null);
  const [viewing, setViewing] = useState<MasterSize | null>(null);
  const [toDelete, setToDelete] = useState<MasterSize | null>(null);
  const [formError, setFormError] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const openForm = (s: MasterSize | 'new') => {
    setFormError('');
    form.reset(
      s === 'new'
        ? EMPTY
        : {
            name: s.name,
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
        setFormError(getErrorMessage(err, 'Could not save the size'));
      }
    }
  });

  const columns: Column<MasterSize>[] = [
    {
      header: 'Size',
      key: 'name',
      sortable: true,
      render: (s) => (
        <div className="flex items-center gap-3">
          <span className="inline-flex min-w-[36px] items-center justify-center rounded-sm border border-ivory-300 bg-sand/20 px-2 py-1 font-mono text-body-md font-bold text-espresso">
            {s.name}
          </span>
          <div>
            <p className="text-body-md font-medium text-espresso">{s.name}</p>
            <p className="text-technical-data uppercase text-outline">{s.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Description',
      key: 'description',
      hideBelow: 'md',
      render: (s) => (
        <span className="line-clamp-1 text-on-surface-variant">
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
          {label: 'Sizes'},
        ]}
        title="Size Management"
        actions={
          <button
            type="button"
            onClick={() => openForm('new')}
            className="btn-primary"
          >
            <Plus size={14} /> Add Size
          </button>
        }
      />

      <GenericTable
        caption="Sizes"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorMessage={getErrorMessage(error, 'Failed to load sizes')}
        onRetry={() => refetch()}
        emptyIcon={<Ruler size={22} strokeWidth={1.5} />}
        emptyTitle={list.hasFilters ? 'No matching sizes' : 'No sizes yet'}
        emptyMessage={
          list.hasFilters
            ? undefined
            : 'Add apparel sizes such as XS, S, M, L, XL, 32, 34 etc.'
        }
        onRowClick={(s) => setViewing(s)}
        rowActions={(s) => [
          {label: 'View', icon: <Eye size={16} />, onClick: () => setViewing(s)},
          {label: 'Edit', icon: <Pencil size={16} />, onClick: () => openForm(s)},
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
          <ListToolbar
            tabs={STATUS_TABS}
            tab={list.filters.status}
            onTab={(status) => list.setFilter({status})}
            searchText={list.searchText}
            onSearch={list.setSearchText}
            placeholder="Search size name or code"
          />
        }
      />

      {/* Add / Edit Dialog */}
      <FormProvider {...form}>
        <FormDialog
          open={!!editing}
          title={editing === 'new' ? 'Add Size' : 'Edit Size'}
          onClose={() => setEditing(null)}
          onSubmit={submit}
          saving={form.formState.isSubmitting}
          error={formError}
          saveLabel={editing === 'new' ? 'Save Size' : 'Save Changes'}
        >
          {editing === 'new' && (
            <div className="space-y-1.5">
              <span className="text-technical-data font-medium uppercase text-outline">
                Quick Select Common Sizes:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {COMMON_SIZES.map((sz) => (
                  <button
                    key={sz}
                    type="button"
                    onClick={() => form.setValue('name', sz)}
                    className="rounded border border-ivory-300 bg-sand/20 px-2.5 py-1 font-mono text-xs font-semibold text-espresso transition hover:bg-burgundy hover:text-white"
                  >
                    {sz}
                  </button>
                ))}
              </div>
            </div>
          )}

          <GenericInputField
            name="name"
            label="Size Name"
            kind="text"
            required
            autoFocus
            placeholder="e.g. XS, S, M, L, XL, XXL, 32, 34"
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
            rows={2}
            maxLength={500}
            placeholder="e.g. Chest 38-40 inches, Waist 32 inches..."
          />

          <GenericSwitch
            name="isActive"
            label="Active Status"
            description="Active sizes are available when configuring product variants."
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
            {label: 'Size Name', value: viewing.name},
            {label: 'Size Code', value: viewing.code},
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
        title="Delete Size?"
        message={`Are you sure you want to delete size "${toDelete?.name}"? This action cannot be undone.`}
        confirmLabel="Delete Size"
        tone="danger"
        onConfirm={async () => {
          if (!toDelete) return;
          try {
            await remove.mutateAsync(toDelete.id);
            setToDelete(null);
          } catch {
            // Handled by toast
          }
        }}
        onCancel={() => setToDelete(null)}
      />
    </>
  );
};

export default SizeMaster;

