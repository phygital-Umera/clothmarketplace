import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {updateIncomeSchema} from '@/lib/validation/incomeSchema';
import {
  useGetIncomeExpenseById,
  useUpdateIncomeExpense,
} from '@/lib/react-query/queriesAndMutations/cateror/income';
import {useRouter} from '@tanstack/react-router';
import {Route} from '@/routes/_app/_edit/update.$name.$id';
import {IncomeExpense} from '@/types';

type FormValues = z.infer<typeof updateIncomeSchema>;

interface props {
  id: string;
}

const UpdateInomeExpenditure: React.FC<props> = (props) => {
  const {id} = Route.useParams();
  const router = useRouter();
  const methods = useForm<FormValues>({
    resolver: zodResolver(updateIncomeSchema),
  });

  const {reset} = methods;
  const {mutateAsync: updateIncomeExpense, isPending} =
    useUpdateIncomeExpense();
  const {data: incomeExpenseResponse} = useGetIncomeExpenseById(id);
  console.log(incomeExpenseResponse);

  useEffect(() => {
    if (incomeExpenseResponse) {
      // Convert the date to DD-MM-YYYY format
      const formattedDate = new Date(incomeExpenseResponse?.date)
        .toLocaleDateString('en-GB', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
        })
        .split('/')
        .reverse()
        .join('-');

      reset({
        amount: incomeExpenseResponse?.amount,
        date: formattedDate, // Use the formatted date here
        particular: incomeExpenseResponse?.particular,
        status:
          incomeExpenseResponse?.status === IncomeExpense.Payable
            ? IncomeExpense.Expense
            : IncomeExpense.Income,
      });
    }
  }, [id, incomeExpenseResponse, reset]);

  const onSubmit = async (data: FormValues) => {
    await updateIncomeExpense({
      ...data,
      id: id,
      date: new Date(data.date).toISOString(),
      amount: Number(data.amount),
    });
    reset();
    router.history.back();
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Income/Expenditure
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
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Update'}
          </GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateInomeExpenditure;
