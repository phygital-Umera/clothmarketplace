import NumberSettingsForm, {NumberField} from '@/components/Settings/NumberSettingsForm';
import {PageHeader} from '@/components/ui';
import {StoreRules} from '@/lib/api/companySettings';
import {
  useStoreRules,
  useUpdateStoreRules,
} from '@/lib/react-query/queriesAndMutations/companySettings';

const FIELDS: NumberField<StoreRules>[] = [
  {key: 'deliveryFee', label: 'Delivery fee', hint: 'Standard delivery below the free-delivery amount', prefix: '₹'},
  {key: 'freeDeliveryAbove', label: 'Free delivery above', hint: 'Bag value from which standard delivery is free', prefix: '₹'},
  {key: 'expressFee', label: 'Express fee', hint: 'Express delivery, any bag value', prefix: '₹'},
  {key: 'deliveryDaysStd', label: 'Standard delivery', hint: 'Shown as "usually" (no courier data yet)', suffix: 'days'},
  {key: 'deliveryDaysExpress', label: 'Express delivery', hint: 'Shown as "usually"', suffix: 'days'},
  {key: 'limitedBadgeAt', label: '"Only a few left" at', hint: 'Badge when stock is this or less', suffix: 'pcs'},
  {key: 'newProductDays', label: '"New" for', hint: 'Badge and the New filter', suffix: 'days'},
];

/** Super admin: store-wide settings every shop's online orders use (P4-08b) */
const StoreSettingsPage = () => {
  const {data, isPending, error} = useStoreRules();
  const save = useUpdateStoreRules();
  return (
    <>
      <PageHeader compact breadcrumbs={[{label: 'Store Settings'}]} title="Store settings" />
      <section className="panel p-4 md:p-5">
        <p className="mb-4 text-body-sm text-on-surface-variant">
          These apply to the whole online store, for every company. A bag from several shops pays
          one delivery fee.
        </p>
        <NumberSettingsForm<StoreRules>
          fields={FIELDS}
          data={data}
          isPending={isPending}
          error={error}
          saving={save.isPending}
          onSave={(values, done) => save.mutate(values, done)}
        />
      </section>
    </>
  );
};

export default StoreSettingsPage;
