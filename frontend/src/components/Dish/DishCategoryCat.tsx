import React, {useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import {useAddDishCategory} from '@/lib/react-query/queriesAndMutations/cateror/dish';
// import toast from 'react-hot-toast';

// Define form values type
type FormValues = {
  name: string;
};

const DishCategoryCat: React.FC = () => {
  const methods = useForm<FormValues>({
    defaultValues: {
      name: '',
    },
  });

  const {reset} = methods; // Destructure reset from methods to clear form
  const {mutateAsync: addDishCategory, isSuccess: addDishSuccess} =
    useAddDishCategory();

  const onSubmit = async (data: FormValues) => {
    try {
      await addDishCategory({
        name: data.name,
        languageId: '',
      });
      // Reset form after successful submission
      reset({
        name: '',
      });
    } catch (error) {
      console.log('Error adding dish category:', error);
    }
  };

  useEffect(() => {
    if (addDishSuccess) {
      methods.reset(); // Reset form after successful submission
    }
  }, [addDishSuccess, methods]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Dish Category
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="name"
              label="Dish Category Name"
              placeholder="Enter dish category name"
            />
          </div>

          <div className="col-span-2 flex items-end md:col-span-2">
            <button className="w-20 rounded bg-primary px-2 py-1 text-white">
              Add
            </button>
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default DishCategoryCat;
