import {
  Column,
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
  useBrands,
  useSaveBrand,
} from '@/lib/react-query/queriesAndMutations/catalog';
import {applyServerErrors, field} from '@/lib/validation/fieldRules';
import {Brand} from '@/types/catalog';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {Award, CircleCheck, CirclePause, Pencil, Plus} from 'lucide-react';
import {useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';

const schema = z.object({
  name: field({label: 'Brand Name', kind: 'text', max: 60}),
  website: field({label: 'Website', kind: 'url', required: false}),
  description: field({
    label: 'Description',
    kind: 'text',
    max: 500,
    required: false,
  }),
  isActive: z.boolean(),
});
type Values = z.infer<typeof schema>;
const EMPTY: Values = {name: '', website: '', description: '', isActive: true};

const STATUS_TABS = [
  {label: 'All', value: undefined},
  {label: 'Active', value: 'true'},
  {label: 'Inactive', value: 'false'},
];

/**
 * Super admin: global brands. Company admin: global brands (read-only) plus
 * the company's own brands.
 */
const BrandList = ({panel}: {panel: 'super-admin' | 'company-admin'}) => {
  const list = useListState();
  const {data, isPending, isError, error, refetch, isFetching} = useBrands(
    panel,
    {
      ...list.params,
      active: list.filters.status,
      status: undefined,
    },
  );
  const save = useSaveBrand(panel);
  const [editing, setEditing] = useState<Brand | 'new' | null>(null);
  const [formError, setFormError] = useState('');
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: EMPTY,
  });
  // The company admin cannot change global brands
  const editable = (b: Brand) => panel === 'super-admin' || !b.isGlobal;

  const open = (b: Brand | 'new') => {
    if (b !== 'new' && !editable(b)) return;
    setFormError('');
    form.reset(
      b === 'new'
        ? EMPTY
        : {
            name: b.name,
            website: b.website ?? '',
            description: b.description ?? '',
            isActive: b.isActive,
          },
    );
    setEditing(b);
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
        setFormError(getErrorMessage(err, 'Could not save the brand'));
      }
    }
  });

  const columns: Column<Brand>[] = [
    {
      header: 'Brand',
      key: 'name',
      sortable: true,
      render: (b) => (
        <>
          <p className="text-body-md font-medium text-espresso">{b.name}</p>
          <p className="text-technical-data uppercase text-outline">{b.code}</p>
        </>
      ),
    },
    ...(panel === 'company-admin'
      ? [
          {
            header: 'Type',
            render: (b: Brand) => (b.isGlobal ? 'Platform' : 'Own'),
          } as Column<Brand>,
        ]
      : []),
    {header: 'Products', key: 'productCount', align: 'right'},
    {header: 'Website', key: 'website', hideBelow: 'lg'},
    {
      header: 'Status',
      key: 'isActive',
      render: (b) => (
        <StatusBadge status={b.isActive ? 'ACTIVE' : 'INACTIVE'} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        compact
        breadcrumbs={[{label: 'Catalog'}]}
        title="Brands"
        actions={
          <button
            type="button"
            onClick={() => open('new')}
            className="btn-primary"
          >
            <Plus size={14} /> Add Brand
          </button>
        }
      />
      <GenericTable
        caption="Brands"
        columns={columns}
        data={data?.items}
        loading={isPending}
        fetching={isFetching}
        error={isError ? error : undefined}
        errorMessage={getErrorMessage(error, 'Something went wrong.')}
        onRetry={() => refetch()}
        emptyIcon={<Award size={22} strokeWidth={1.5} />}
        emptyTitle={list.hasFilters ? 'No matching brands' : 'No brands yet'}
        onRowClick={open}
        rowActions={(b) =>
          editable(b)
            ? [
                {label: 'Edit', icon: <Pencil size={16} />, onClick: open},
                {
                  label: b.isActive ? 'Deactivate' : 'Activate',
                  icon: b.isActive ? (
                    <CirclePause size={16} />
                  ) : (
                    <CircleCheck size={16} />
                  ),
                  onClick: () => save.mutate({id: b.id, isActive: !b.isActive}),
                },
              ]
            : []
        }
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
          title={editing === 'new' ? 'Add Brand' : 'Edit Brand'}
          onClose={() => setEditing(null)}
          onSubmit={submit}
          saving={form.formState.isSubmitting}
          error={formError}
        >
          <GenericInputField
            name="name"
            label="Brand Name"
            kind="text"
            required
            autoFocus
          />
          <GenericInputField
            name="website"
            label="Website"
            kind="url"
            placeholder="https://brand.in"
          />
          <GenericTextArea
            name="description"
            label="Description"
            rows={2}
            maxLength={500}
          />
          <GenericSwitch
            name="isActive"
            label="Active"
            description="Inactive brands cannot be used for new products."
          />
        </FormDialog>
      </FormProvider>
    </>
  );
};

export default BrandList;
