import {
  Column,
  ConfirmDialog,
  GenericInputField,
  GenericSwitch,
  GenericTable,
} from '@/components/Forms';
import ListToolbar from '@/components/Org/ListToolbar';
import {PageHeader, StatusBadge} from '@/components/ui';
import FormDialog from '@/components/ui/FormDialog';
import ViewDetailsDialog from '@/components/ui/ViewDetailsDialog';
import useListState from '@/hooks/useListState';
import {
  useDeleteMasterColor,
  useMasterColors,
  useSaveMasterColor,
} from '@/lib/react-query/queriesAndMutations/master';
import {applyServerErrors, field} from '@/lib/validation/fieldRules';
import {MasterColor} from '@/types/master';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {
  CircleCheck,
  CirclePause,
  Eye,
  Palette,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';
import {useState} from 'react';
import {FormProvider, useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';

const schema = z.object({
  name: field({label: 'Color Name', kind: 'text', max: 50}),
  hexCode: z
    .string({required_error: 'Color Code / Hex Value is required'})
    .trim()
    .regex(
      /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/,
      'Enter a valid hex color code (e.g. #FF0000 or #FFF)',
    ),
  isActive: z.boolean(),
});

type FormValues = z.infer<typeof schema>;

const EMPTY: FormValues = {
  name: '',
  hexCode: '#000000',
  isActive: true,
};

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Active', value: 'true'},
  {label: 'Inactive', value: 'false'},
];

const ColorMaster = () => {
  const list = useListState();
  const {data, isPending, isError, error, refetch, isFetching} =
    useMasterColors({
      ...list.params,
      active: list.filters.status,
    });
  const save = useSaveMasterColor();
  const remove = useDeleteMasterColor();

  const [editing, setEditing] = useState<MasterColor | 'new' | null>(null);
  const [viewing, setViewing] = useState<MasterColor | null>(null);
  const [toDelete, setToDelete] = useState<MasterColor | null>(null);
  const [formError, setFormError] = useState('');

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });

  const hexValue = useWatch({control: form.control, name: 'hexCode'});

  const openForm = (c: MasterColor | 'new') => {
    setFormError('');
    form.reset(
      c === 'new'
        ? EMPTY
        : {
            name: c.name,
            hexCode: c.hexCode,
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
        setFormError(getErrorMessage(err, 'Could not save the color'));
      }
    }
  });

  const columns: Column<MasterColor>[] = [
    {
      header: 'Color',
      key: 'name',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-3">
          <div
            className="h-7 w-7 rounded-full border border-ivory-400 shadow-sm"
            style={{backgroundColor: c.hexCode}}
            title={c.hexCode}
          />
          <div>
            <p className="text-body-md font-medium text-espresso">{c.name}</p>
            <p className="text-technical-data uppercase text-outline">{c.code}</p>
          </div>
        </div>
      ),
    },
    {
      header: 'Hex Code',
      key: 'hexCode',
      render: (c) => (
        <span className="font-mono text-body-sm font-medium uppercase text-espresso">
          {c.hexCode}
        </span>
      ),
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
          {label: 'Colors'},
        ]}
        title="Color Management"
        actions={
          <button
            type="button"
            onClick={() => openForm('new')}
            className="btn-primary"
          >
            <Plus size={14} /> Add Color
          </button>
        }
      />

      <GenericTable
        caption="Colors"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorMessage={getErrorMessage(error, 'Failed to load colors')}
        onRetry={() => refetch()}
        emptyIcon={<Palette size={22} strokeWidth={1.5} />}
        emptyTitle={list.hasFilters ? 'No matching colors' : 'No colors yet'}
        emptyMessage={
          list.hasFilters
            ? undefined
            : 'Add colors for product variants with names and hex codes.'
        }
        onRowClick={(c) => setViewing(c)}
        rowActions={(c) => [
          {label: 'View', icon: <Eye size={16} />, onClick: () => setViewing(c)},
          {label: 'Edit', icon: <Pencil size={16} />, onClick: () => openForm(c)},
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
            placeholder="Search color name, code or hex"
          />
        }
      />

      {/* Add / Edit Dialog */}
      <FormProvider {...form}>
        <FormDialog
          open={!!editing}
          title={editing === 'new' ? 'Add Color' : 'Edit Color'}
          onClose={() => setEditing(null)}
          onSubmit={submit}
          saving={form.formState.isSubmitting}
          error={formError}
          saveLabel={editing === 'new' ? 'Save Color' : 'Save Changes'}
        >
          <GenericInputField
            name="name"
            label="Color Name"
            kind="text"
            required
            autoFocus
            placeholder="e.g. Navy Blue, Olive Green, Crimson Red"
          />

          <div className="space-y-1.5">
            <label
              htmlFor="hexCode"
              className="block text-body-sm font-medium text-espresso"
            >
              Color Code / Hex Value <span className="text-burgundy">*</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={
                  /^#[0-9a-fA-F]{6}$/.test(hexValue ?? '')
                    ? hexValue
                    : '#000000'
                }
                onChange={(e) =>
                  form.setValue('hexCode', e.target.value.toUpperCase())
                }
                className="h-10 w-12 cursor-pointer rounded border border-ivory-300 p-1"
                title="Choose color"
              />
              <div className="flex-1">
                <GenericInputField
                  name="hexCode"
                  placeholder="#000000"
                  kind="text"
                  maxLength={7}
                  required
                />
              </div>
            </div>
            <p className="text-technical-data text-outline">
              Select via color picker or enter 3-digit / 6-digit hex code.
            </p>
          </div>

          <GenericSwitch
            name="isActive"
            label="Active Status"
            description="Active colors can be selected when configuring product variants."
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
            {label: 'Color Name', value: viewing.name},
            {label: 'Color Code (System)', value: viewing.code},
            {
              label: 'Hex Value',
              value: (
                <div className="flex items-center gap-2">
                  <span
                    className="h-4 w-4 rounded-full border border-ivory-400"
                    style={{backgroundColor: viewing.hexCode}}
                  />
                  <span className="font-mono">{viewing.hexCode}</span>
                </div>
              ),
            },
            {
              label: 'Created At',
              value: new Date(viewing.createdAt).toLocaleDateString(),
            },
          ]}
        >
          <div className="flex items-center justify-center p-4">
            <div
              className="h-20 w-full rounded border border-ivory-300 shadow-inner"
              style={{backgroundColor: viewing.hexCode}}
            />
          </div>
        </ViewDetailsDialog>
      )}

      {/* Delete Confirmation */}
      <ConfirmDialog
        open={!!toDelete}
        title="Delete Color?"
        message={`Are you sure you want to delete color "${toDelete?.name}" (${toDelete?.hexCode})? This action cannot be undone.`}
        confirmLabel="Delete Color"
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

export default ColorMaster;

