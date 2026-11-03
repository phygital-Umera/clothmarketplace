import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericInputField from '../Forms/Input/GenericInputField';
import {dishMasterSchema} from '@/lib/validation/dishSchemas';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {useMatch} from '@tanstack/react-router';
import {
  useGetDishByIdAdmin,
  useGetDishCategoriesAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import GenericDropdown from '../Forms/DropDown/GenericDropDown';
import {useDishMaster} from '@/context/DishMasterContext';

type FormValues = z.infer<typeof dishMasterSchema>;

interface Option {
  value: string;
  label: string;
}

interface Props {
  id: string;
}

const UpdateDish: React.FC<Props> = () => {
  const {selectedLanguageId} = useDishMaster();

  const methods = useForm<FormValues>({
    resolver: zodResolver(dishMasterSchema),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const {params} = useMatch('/_app/_edit/update/$name/$id' as any);
  const {id = ''} = params as {id: string};
  const {data: dishData} = useGetDishByIdAdmin(id);
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);

  const {data: dishCategories} = useGetDishCategoriesAdmin(selectedLanguageId);
  const {reset} = methods;

  // Populate Category Options
  useEffect(() => {
    if (dishCategories?.data?.data) {
      setCategoryOptions(
        dishCategories.data.data.map(
          (category: {id: string; name: string}) => ({
            label: category.name,
            value: category.id,
          }),
        ),
      );
    }
  }, [dishCategories]);

  // Populate form values when dishData is fetched
  useEffect(() => {
    if (dishData?.data) {
      // Reset the form with the fetched data
      reset({
        name: dishData?.data.name,
        description: dishData?.data.description,
        dishCategory: dishData?.data.categoryId, // Assuming the categoryId matches the option values
        priority: dishData?.data.priority,
      });
    }
  }, [dishData, reset]);

  const onSubmit = (data: FormValues) => {
    data ? reset() : '';
    console.log(data);
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Dish Master Admin
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="name"
              label="Dish Name"
              placeholder="Search or type a dish name"
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="priority"
              label="Priority"
              options={[
                {label: '1', value: 'P1'},
                {label: '2', value: 'P2'},
                {label: '3', value: 'P3'},
              ]}
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericDropdown
              name="dishCategory"
              label="Dish Category"
              options={categoryOptions}
              defaultOption="Select Category"
            />
          </div>

          <div className="col-span-12 md:col-span-full">
            <GenericTextArea
              rows={4}
              name="description"
              label="Dish Description"
              placeholder="Enter dish description"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">Update</GenericButton>
        </div>
        <p className="text-red-400">
          If you want to change the language, please delete the dish and add the
          dish again.
        </p>
      </form>
    </FormProvider>
  );
};

export default UpdateDish;
