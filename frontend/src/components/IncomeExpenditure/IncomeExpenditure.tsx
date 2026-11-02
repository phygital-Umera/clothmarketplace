import React from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {incomeSchema} from '@/lib/validation/incomeSchema';
import {useAddIncomeExpense} from '@/lib/react-query/queriesAndMutations/cateror/income';
import {useAuthContext} from '@/context/AuthContext';
import {Route} from '@/routes/_app/_event/events.$id';
import {FiSave} from 'react-icons/fi';

type FormValues = z.infer<typeof incomeSchema>;

const IncomeExpenditure: React.FC = () => {
  const {user} = useAuthContext();
  const {id: EventId} = Route.useParams();
  const methods = useForm<FormValues>({
    resolver: zodResolver(incomeSchema),
  });

  const {reset} = methods;
  const {mutateAsync: addIncomeExpense, isPending} = useAddIncomeExpense();

  const onSubmit = async (data: FormValues) => {
    if (EventId) {
      await addIncomeExpense({
        ...data,
        eventId: EventId,
        date: new Date(data.date).toISOString(),
        id: user?.caterorId as string,
        amount: Number(data.amount),
      });
      reset();
    }
  };
  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 bg-gray-2 p-4 text-lg font-semibold dark:bg-meta-4">
            Income/Expenditure
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="status"
              label="Income/Expenditure"
              options={[
                {label: 'Income', value: 'INCOME'},
                {label: 'Expense', value: 'EXPENDITURE'},
                {label: 'Recievable', value: 'RECEIVABLE'},
                {label: 'Payable', value: 'PAYABLE'},
              ]}
              defaultOption=""
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="particular"
              label="Particular"
              placeholder="Enter the Particular"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="amount"
              label="Amount"
              placeholder="Enter the Amount"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              type="date"
              name="date"
              label="Date"
              placeholder="Enter the Date"
              defaultValue={new Date().toISOString().split('T')[0]}
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex items-center justify-end space-x-2">
          <GenericButton
            type="submit"
            disabled={isPending}
            className="flex items-center"
          >
            {isPending ? (
              <FiSave className="mr-2 animate-spin" />
            ) : (
              <FiSave className="mr-2" />
            )}
            {isPending ? 'Saving...' : 'Save'}
          </GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default IncomeExpenditure;
