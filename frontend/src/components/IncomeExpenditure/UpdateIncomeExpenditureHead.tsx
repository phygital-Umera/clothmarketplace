import React from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {incomeheadSchema} from '@/lib/validation/incomeSchema';

type FormValues = z.infer<typeof incomeheadSchema>;

interface props {
  id: string;
}

const UpdateIncomeExpenditureHead: React.FC<props> = (props) => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(incomeheadSchema),
  });

  const {reset} = methods;

  const onSubmit = (data: FormValues) => {
    data ? reset() : '';
    console.log(data);
  };

  console.log(props.id);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* Add Caterer Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Income/Expenditure Head
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="incomeExpenditure"
              label="Income/Expenditure"
              options={[
                {label: 'Option1', value: '1'},
                {label: 'Option2', value: '2'},
                {label: 'Option3', value: '3'},
              ]}
              defaultOption=""
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="head"
              label="Head"
              placeholder="Enter the Head"
            />
          </div>
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">Update</GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateIncomeExpenditureHead;
