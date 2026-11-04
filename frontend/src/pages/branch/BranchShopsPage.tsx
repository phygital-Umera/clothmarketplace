import {
  GenericDropdown,
  GenericInputField,
  GenericPasswordField,
} from '@/components/Forms';
import {PageHeader, StatusBadge} from '@/components/ui';
import {FormError} from '@/components/ui/FormLayout';
import useCurrentUser from '@/hooks/useCurrentUser';
import {
  useSaveShop,
  useShops,
  useShopStats,
} from '@/lib/react-query/queriesAndMutations/org';
import {applyServerErrors, field} from '@/lib/validation/fieldRules';
import {Shop} from '@/types/org';
import {getErrorMessage} from '@/utils/axios';
import {zodResolver} from '@hookform/resolvers/zod';
import {Link} from '@tanstack/react-router';
import {Store} from 'lucide-react';
import {useEffect, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {z} from 'zod';

const SHOP_TYPES = [
  "Men's wear",
  "Women's wear",
  'Kids wear',
  'Ethnic wear',
  'Footwear',
  'Accessories',
  'Mixed / Family',
].map((t) => ({value: t, label: t}));

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;
const time = (label: string) =>
  z
    .string()
    .refine((v) => !v || TIME.test(v), `Enter a valid ${label}`)
    .optional();

/**
 * Every shop gets its own login (shop admin): name, phone and password are
 * required when adding; on edit a blank password keeps the current one.
 */
const schema = (needsPassword: boolean) =>
  z
    .object({
      name: field({label: 'Shop Name', kind: 'text'}),
      shopType: field({label: 'Shop Type', kind: 'text', max: 60}),
      address: field({
        label: 'Floor / Section',
        kind: 'text',
        max: 500,
        required: false,
      }),
      phone: field({label: 'Contact Phone', kind: 'phone', required: false}),
      openingTime: time('Opening Time'),
      closingTime: time('Closing Time'),
      adminName: field({label: 'Manager Name', kind: 'name'}),
      adminPhone: field({label: 'Login Phone Number', kind: 'phone'}),
      adminEmail: field({label: 'Login Email', kind: 'email', required: false}),
      adminPassword: field({
        label: 'Login Password',
        kind: 'password',
        required: false,
      }),
    })
    .superRefine((v, ctx) => {
      if (needsPassword && !v.adminPassword) {
        ctx.addIssue({
          code: 'custom',
          path: ['adminPassword'],
          message: 'Set a password so the shop can sign in',
        });
      }
      if (v.openingTime && v.closingTime && v.closingTime <= v.openingTime) {
        ctx.addIssue({
          code: 'custom',
          path: ['closingTime'],
          message: 'Closing Time must be after Opening Time',
        });
      }
    });

type Values = z.infer<ReturnType<typeof schema>>;
const FIELDS = [
  'name',
  'shopType',
  'address',
  'phone',
  'openingTime',
  'closingTime',
  'adminName',
  'adminPhone',
  'adminEmail',
  'adminPassword',
];

const EMPTY: Values = {
  name: '',
  shopType: '',
  address: '',
  phone: '',
  openingTime: '',
  closingTime: '',
  adminName: '',
  adminPhone: '',
  adminEmail: '',
  adminPassword: '',
};

const valuesOf = (s: Shop): Values => ({
  name: s.name,
  shopType: s.shopType ?? '',
  address: s.address ?? '',
  phone: s.phone ?? '',
  openingTime: s.openingTime ?? '',
  closingTime: s.closingTime ?? '',
  adminName: s.shopAdmin?.fullname ?? '',
  adminPhone: s.shopAdmin?.phoneNumber ?? '',
  adminEmail: s.shopAdmin?.email ?? '',
  adminPassword: '',
});

const inr = (n: number) =>
  `₹${n.toLocaleString('en-IN', {maximumFractionDigits: 0})}`;

/** Right-hand panel: add a shop with its login, or edit one */
const ShopPanel = ({
  shop,
  branchName,
  nextCode,
  onDone,
}: {
  shop: Shop | null;
  branchName: string;
  nextCode?: string | null;
  onDone: () => void;
}) => {
  const save = useSaveShop('branch-admin');
  const [formError, setFormError] = useState('');
  const needsPassword = !shop?.shopAdmin;
  const form = useForm<Values>({
    resolver: zodResolver(schema(needsPassword)),
    defaultValues: shop ? valuesOf(shop) : EMPTY,
    mode: 'onTouched',
  });
  const {
    handleSubmit,
    reset,
    setError,
    formState: {isSubmitting},
  } = form;

  useEffect(() => {
    reset(shop ? valuesOf(shop) : EMPTY);
    setFormError('');
  }, [shop, reset]);

  const submit = handleSubmit(async (values) => {
    setFormError('');
    try {
      await save.mutateAsync({
        ...(shop ? {id: shop.id} : {status: 'ACTIVE'}),
        ...values,
        adminEmail: values.adminEmail || undefined,
        adminPassword: values.adminPassword || undefined,
      });
      if (!shop) reset(EMPTY);
      onDone();
    } catch (error) {
      if (!applyServerErrors(error, setError, FIELDS)) {
        setFormError(getErrorMessage(error, 'Could not save the shop'));
      }
    }
  });

  return (
    <FormProvider {...form}>
      <form onSubmit={submit} noValidate className="panel space-y-4 p-5">
        <div className="flex items-start justify-between gap-2">
          <h2 className="font-serif text-headline-sm text-espresso">
            {shop ? `Edit ${shop.name}` : 'Add shop'}
          </h2>
          {shop && (
            <button type="button" className="btn-text" onClick={onDone}>
              + New shop
            </button>
          )}
        </div>
        <FormError message={formError} />

        <label className="block">
          <span className="field-label">Branch</span>
          <input className="field-input" value={branchName} disabled readOnly />
        </label>
        <GenericInputField
          name="name"
          label="Shop Name"
          kind="text"
          required
          placeholder="e.g. Ethnic Wear"
        />
        <label className="block">
          <span className="field-label">Shop Code</span>
          <input
            className="field-input"
            value={shop ? shop.code : (nextCode ?? 'Assigned on save')}
            disabled
            readOnly
          />
          <span className="field-hint">
            {shop ? 'Shop codes do not change.' : 'Given automatically.'}
          </span>
        </label>
        <GenericDropdown
          name="shopType"
          label="Shop Type"
          required
          options={SHOP_TYPES}
          placeholder="Select type"
        />
        <GenericInputField
          name="address"
          label="Floor / Section"
          kind="text"
          maxLength={500}
          placeholder="e.g. Ground floor"
        />
        <GenericInputField
          name="phone"
          label="Contact Phone"
          kind="phone"
          prefix="+91"
        />
        <div className="grid grid-cols-2 gap-3">
          <GenericInputField name="openingTime" label="Opens" type="time" />
          <GenericInputField name="closingTime" label="Closes" type="time" />
        </div>

        <div className="space-y-4 border-t border-ivory-300 pt-4">
          <div>
            <h3 className="text-label-caps uppercase text-burgundy">
              Shop login
            </h3>
            <p className="mt-1 text-body-sm text-on-surface-variant">
              The shop manager signs in with this phone number and password.
            </p>
          </div>
          <GenericInputField
            name="adminName"
            label="Manager Name"
            kind="name"
            required
            placeholder="e.g. Rahul Mane"
          />
          <GenericInputField
            name="adminPhone"
            label="Login Phone Number"
            kind="phone"
            prefix="+91"
            required
          />
          <GenericInputField name="adminEmail" label="Email" kind="email" />
          <GenericPasswordField
            name="adminPassword"
            label="Password"
            required={needsPassword}
            hint={
              needsPassword
                ? 'Share it with the manager; they can change it after signing in.'
                : 'Leave blank to keep the current password.'
            }
          />
        </div>

        <button
          type="submit"
          className="btn-primary w-full"
          disabled={isSubmitting}
        >
          {isSubmitting
            ? 'Saving…'
            : shop
              ? 'Save changes'
              : 'Add shop & create login'}
        </button>
      </form>
    </FormProvider>
  );
};

const Stat = ({label, value}: {label: string; value: string}) => (
  <div className="min-w-0">
    <p className="text-label-caps uppercase text-outline">{label}</p>
    <p className="truncate text-body-sm font-medium text-espresso">{value}</p>
  </div>
);

/** Branch admin: shops of the branch as cards, with the add / edit form beside */
export default function BranchShopsPage() {
  const {data: me} = useCurrentUser();
  const {data, isPending, isError, error} = useShops('branch-admin', {
    page: 1,
    limit: 100,
    sortBy: 'createdAt',
    sortDir: 'asc',
  });
  const {data: stats} = useShopStats();
  const [editing, setEditing] = useState<Shop | null>(null);
  const branchName = me?.branch?.name ?? 'This branch';
  const shops = data?.items ?? [];

  return (
    <>
      <PageHeader
        breadcrumbs={[{label: 'Setup'}, {label: 'Shops'}]}
        title="Shops"
        subtitle={`Shops inside ${branchName}. You can add shops; activating or closing a shop needs Company Admin.`}
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-4">
          {isError && (
            <p role="alert" className="text-body-sm text-error">
              {getErrorMessage(error, 'Shops could not be loaded')}
            </p>
          )}
          {isPending && (
            <p className="text-body-sm text-outline">Loading shops…</p>
          )}
          {!isPending && !shops.length && !isError && (
            <div className="panel flex flex-col items-center gap-2 p-8 text-center">
              <Store size={22} strokeWidth={1.5} className="text-outline" />
              <p className="text-body-md text-espresso">No shops yet</p>
              <p className="text-body-sm text-on-surface-variant">
                Add the first shop with the form.
              </p>
            </div>
          )}

          {shops.map((s) => {
            const st = stats?.shops[s.id];
            return (
              <article
                key={s.id}
                className={`panel p-5 ${editing?.id === s.id ? 'border-burgundy' : ''}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-body-lg font-medium text-espresso">
                      {s.name}
                    </h2>
                    <p className="text-body-sm text-on-surface-variant">
                      {[s.code, s.shopType, s.address]
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={s.status} />
                    <Link to="/branch-admin/employees" className="btn-ghost">
                      Staff
                    </Link>
                    <button
                      type="button"
                      className="btn-ghost"
                      onClick={() => setEditing(s)}
                    >
                      Edit
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-2 gap-3 border-t border-ivory-300 pt-4 sm:grid-cols-5">
                  <Stat
                    label="Manager"
                    value={s.shopAdmin?.fullname ?? 'No login yet'}
                  />
                  <Stat label="Staff" value={String(s.employeeCount)} />
                  <Stat
                    label="Stock"
                    value={
                      st
                        ? `${st.stockUnits.toLocaleString('en-IN')} units`
                        : '0 units'
                    }
                  />
                  <Stat
                    label="Sales (MTD)"
                    value={st ? inr(st.salesMtd) : '₹0'}
                  />
                  <Stat
                    label="Next bill no."
                    value={st?.nextBillNumber ?? 'SB-0001'}
                  />
                </div>
                {!s.shopAdmin && (
                  <p className="mt-3 text-body-sm text-error">
                    This shop cannot sign in yet.{' '}
                    <button
                      type="button"
                      className="underline"
                      onClick={() => setEditing(s)}
                    >
                      Create its login
                    </button>
                  </p>
                )}
              </article>
            );
          })}
        </div>

        <aside className="lg:sticky lg:top-4">
          <ShopPanel
            shop={editing}
            branchName={branchName}
            nextCode={stats?.nextShopCode}
            onDone={() => setEditing(null)}
          />
        </aside>
      </div>
    </>
  );
}
