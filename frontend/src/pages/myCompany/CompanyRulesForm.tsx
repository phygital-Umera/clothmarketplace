import NumberSettingsForm, {NumberField} from '@/components/Settings/NumberSettingsForm';
import {CompanyRules} from '@/lib/api/companySettings';
import {
  useCompanyRules,
  useUpdateCompanyRules,
} from '@/lib/react-query/queriesAndMutations/companySettings';

const FIELDS: NumberField<CompanyRules>[] = [
  {
    key: 'refundApprovalLimit',
    label: 'Refund approval limit',
    hint: 'Card / UPI refunds above this wait for the branch admin (cash refunds always do)',
    prefix: '₹',
  },
  {
    key: 'discountApprovalPct',
    label: 'High discount',
    hint: 'Bills with a bigger discount are flagged on the branch sales page',
    suffix: '%',
    step: '0.5',
  },
  {
    key: 'lowStockDefault',
    label: 'Low-stock level',
    hint: 'For new items and the "Low stock" filter; each item can have its own',
    suffix: 'pcs',
  },
  {
    key: 'defaultCreditDays',
    label: 'Default credit days',
    hint: 'For a new credit customer when none are given',
    suffix: 'days',
  },
  {
    key: 'minMarginPct',
    label: 'Minimum margin',
    hint: 'Products below it are flagged on the branch price list',
    suffix: '%',
    step: '0.5',
  },
];

/** Company Profile → Settings: rules the owner sets for every shop (P4-08) */
const CompanyRulesForm = () => {
  const {data, isPending, error} = useCompanyRules('company-admin');
  const save = useUpdateCompanyRules();
  return (
    <NumberSettingsForm<CompanyRules>
      fields={FIELDS}
      data={data}
      isPending={isPending}
      error={error}
      saving={save.isPending}
      onSave={(values, done) => save.mutate(values, done)}
    />
  );
};

export default CompanyRulesForm;
