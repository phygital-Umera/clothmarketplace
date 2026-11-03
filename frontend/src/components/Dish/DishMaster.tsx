import React, {useEffect, useMemo, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericDropdown from '../Forms/DropDown/GenericDropDown';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  useAddDishAdmin,
  useGetDishCategoriesAdmin,
  useGetDishesAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {dishMasterSchema} from '@/lib/validation/dishSchemas';
import SearchInputWithSuggestions from '../Forms/Input/GenericInputFieldList';
// import toast from 'react-hot-toast';
import DisplayDishMaster from './DisplayDishMaster';
import {useDishMaster} from '@/context/DishMasterContext';
import AddRawToDish from './AddRawToDish';

interface Option {
  value: string;
  label: string;
}
interface Suggestion {
  id?: string; // id is optional
  name?: string; // name is optional
  description?: string;
  categoryId?: string;
  languageId?: string;
  caterorId?: string;
  priority?: string;
}
type FormValues = z.infer<typeof dishMasterSchema>;

const DishMasterAdmin: React.FC = () => {
  const {selectedLanguageId, setSelectedLanguageId} = useDishMaster();

  const methods = useForm<FormValues>({
    resolver: zodResolver(dishMasterSchema),
  });

  const {watch, reset} = methods;

  const [dishes, setDishes] = useState<Suggestion[]>([]);
  const [dishId, setDishId] = useState<string>('');
  const [categoryOptions, setCategoryOptions] = useState<Option[]>([]);
  const [languageOptions, setLanguageOptions] = useState<Option[]>([]);
  const [page, setPage] = useState<number>(1);

  const {data: languages} = useGetLanguages();
  const {data: dishCategories, refetch: refetchCategories} =
    useGetDishCategoriesAdmin(selectedLanguageId);
  const {data: dishSuggestions, refetch: refetchDishes} =
    useGetDishesAdmin(selectedLanguageId);
  const {mutate: addDish, data: CreatedDishData} = useAddDishAdmin();
  console.log(CreatedDishData);

  const lang = watch('language');

  const memoizedSelectedLanguageId = useMemo(() => lang, [lang]);
  useEffect(() => {
    if (CreatedDishData) {
      // toast.success('Dish added successfully');
      setDishId(CreatedDishData.data.id);
      methods.reset();
      setPage(2);
    }
  }, [CreatedDishData, methods]);

  useEffect(() => {
    if (memoizedSelectedLanguageId) {
      setSelectedLanguageId(memoizedSelectedLanguageId);
    }
  }, [memoizedSelectedLanguageId, setSelectedLanguageId]);

  // Populate Language Options
  useEffect(() => {
    if (languages) {
      const options = languages.map((language: {id: string; name: string}) => ({
        label: language.name,
        value: language.id,
      }));
      setLanguageOptions(options);
    }
  }, [languages]);

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

  // Populate Dish Suggestions
  useEffect(() => {
    if (dishSuggestions?.data?.data) {
      setDishes(dishSuggestions?.data?.data);
    }
  }, [dishSuggestions]);

  // Fetch Categories and Dishes when Language changes
  useEffect(() => {
    if (selectedLanguageId) {
      refetchCategories();
      refetchDishes();
    }
  }, [selectedLanguageId, refetchCategories, refetchDishes]);

  // Submit Handler
  const onSubmit = (data: FormValues) => {
    console.log(data);
    addDish(
      {
        name: data.name,
        priority: data.priority,
        categoryId: data.dishCategory,
        description: data.description,
        languageId: selectedLanguageId,
      },
      {
        onSuccess: () => {
          reset();
          setPage(2); // Navigate to another page if needed
        },
        onError: (error) => {
          console.error(`Failed to add dish: ${error.message}`);
        },
      },
    );
  };

  return (
    <>
      {page === 1 ? (
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
                <GenericDropdown
                  name="language"
                  label="Language"
                  options={languageOptions}
                  defaultOption="Select Language"
                />
              </div>

              <div className="col-span-12 md:col-span-6">
                <SearchInputWithSuggestions
                  name="name"
                  label="Dish Name"
                  placeholder="Search or type a dish name"
                  suggestions={dishes}
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
              <GenericButton type="submit">Save</GenericButton>
              {/* <GenericResetButton type="reset">Reset</GenericResetButton> */}
            </div>
          </form>
          <DisplayDishMaster />
        </FormProvider>
      ) : (
        <AddRawToDish id={dishId} />
      )}
    </>
  );
};

export default DishMasterAdmin;
