import React from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {Dishes} from '@/types';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import GenericResetButton from '../Forms/Buttons/GenericResetButton';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';

// type FormValues = z.infer<typeof Diseh>;

const Dish: React.FC = () => {
  const methods = useForm<Dishes>({
    // resolver: zodResolver(DishSchema),
  });

  const {reset} = methods;

  const onSubmit = (data: Dishes) => {
    data ? reset() : '';
    console.log(data);
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        {/* ePIN Registration Form */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">Dish</h1>

          <div className="col-span-12 md:col-span-4">
            <GenericInputField
              name="dishname"
              label="Dish Name"
              placeholder="Enter dish name"
            />
          </div>

          <div className="col-span-12 md:col-span-3">
            <GenericInputField
              name="quantity"
              label="Quantity"
              placeholder="Enter the quantity"
            />
          </div>

          <div className="col-span-10 md:col-span-3">
            <GenericSearchDropdown
              name="priority"
              label="Priority"
              options={[
                {label: '1', value: '1'},
                {label: '2', value: '2'},
                {label: '3', value: '3'},
              ]}
            />
          </div>

          {/* Adjusting the load button alignment */}
          <div className="col-span-2 flex items-end md:col-span-2">
            <button className="w-full rounded bg-primary p-3 text-white">
              Load
            </button>
          </div>

          <div className="col-span-12 md:col-span-4">
            <GenericInputField
              name="dishname"
              label="Raw Material Name"
              placeholder="Enter Raw Material Name"
            />
          </div>

          <div className="col-span-10 md:col-span-1">
            <GenericInputField
              name="quantity"
              label="Quantity"
              placeholder="Qty"
            />
          </div>

          <div className="col-span-10 md:col-span-2">
            <GenericSearchDropdown
              name="unit"
              label="Unit"
              options={[
                {label: 'Kg', value: '1'},
                {label: 'Ltr', value: '2'},
              ]}
            />
          </div>

          <div className="col-span-10 md:col-span-3">
            <GenericSearchDropdown
              name="process"
              label="Process"
              options={[
                {label: 'Option1', value: '1'},
                {label: 'Option2', value: '2'},
                {label: 'Option3', value: '3'},
              ]}
            />
          </div>

          {/* Adjusting the load button alignment */}
          <div className="col-span-2 flex items-end md:col-span-2">
            <button className="w-full rounded bg-primary p-3 text-white">
              Add
            </button>
          </div>
        </div>

        <div className="col-span-12 md:col-span-full">
          <GenericTextArea
            rows={4}
            name="description"
            label="Dish Description"
            placeholder="Enter dish description"
          />
        </div>

        {/* Form Buttons */}
        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">Save</GenericButton>
          {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
        </div>
      </form>
    </FormProvider>
  );
};

export default Dish;
