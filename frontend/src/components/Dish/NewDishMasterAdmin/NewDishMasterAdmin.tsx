import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';

import {dishMasterSchema} from '@/lib/validation/dishSchemas';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  useGetDishByIdAdmin,
  useGetDishCategoriesAdmin,
  useGetDishesAdmin,
  useGetRawMaterialAdmin,
  useAddDishAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';

// import toast from 'react-hot-toast';
import GenericSearchDropdown from '@/components/Forms/SearchDropDown/GenericSearchDropdown';
import GenericTextArea from '@/components/Forms/TextArea/GenericTextArea';
import GenericButton from '@/components/Forms/Buttons/GenericButton';
import SearchInputWithSuggestions from '@/components/Forms/Input/GenericInputFieldList';
import NewAddRawMaterialAdmin from './NewAddRawMaterialAdmin';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {languageId} from '@/lib/contants';

interface Dish {
  name: string;
}

interface Option {
  value: string;
  label: string;
}
type FormValues = z.infer<typeof dishMasterSchema>;

const NewDishMasterAdmin: React.FC = () => {
  const methods = useForm<FormValues>({
    resolver: zodResolver(dishMasterSchema),
  });

  const selectedLanguageId = methods.watch('language');

  const [dishes, setDishes] = useState<Dish[]>([]);
  const [dishId, setdishId] = useState<string>('');

  const [languageOptions, setLanguageOptions] = useState<Option[]>([]);
  const [catagoryOptions, setcatagoryOptions] = useState<Option[]>([]);

  const {data: languages} = useGetLanguages();
  const {data: dishCategories, refetch: refetchCategories} =
    useGetDishCategoriesAdmin(selectedLanguageId);
  const {data: dishSuggestions, refetch: refetchDishes} =
    useGetDishesAdmin(selectedLanguageId);
  const {data: Dishdata, refetch: DishdataRefetch} =
    useGetDishByIdAdmin(dishId);

  const {
    mutate: addDish,
    isSuccess: addDishSuccess,
    data: addDishData,
  } = useAddDishAdmin();

  useEffect(() => {
    refetchCategories();
    refetchDishes();
  }, [selectedLanguageId]);

  // Populate Category Options
  useEffect(() => {
    if (dishCategories?.data?.data) {
      setcatagoryOptions(
        dishCategories.data.data.map(
          (category: {id: string; name: string}) => ({
            label: category.name,
            value: category.id,
          }),
        ),
      );
    }
  }, [dishCategories]);

  useEffect(() => {
    if (dishSuggestions?.data?.data) {
      setDishes(dishSuggestions.data.data);
    }
  }, [dishSuggestions, selectedLanguageId]);

  useEffect(() => {
    if (languages) {
      const options = languages.map((language: {id: string; name: string}) => ({
        label: language.name,
        value: language.id,
      }));
      setLanguageOptions(options);
    }
  }, [languages]);

  const onDishSearch = (dishId: string) => {
    setdishId(dishId);
  };

  const onSubmit = (data: FormValues) => {
    addDish({
      name: data.name,
      priority: data.priority,
      categoryId: data.dishCategory,
      description: data.description,
      languageId: selectedLanguageId,
    });
  };

  useEffect(() => {
    if (addDishSuccess) {
      setdishId(addDishData?.data?.id);
      console.log(addDishData?.data?.id);
      methods.reset();
    }
  }, [addDishSuccess, methods, addDishData]);

  useEffect(() => {
    if (dishId && Dishdata?.data) {
      const dish = Dishdata.data;

      methods.reset({
        description: dish?.description,
        dishCategory: dish?.categoryId,
        priority: dish?.priority,
      });
    }
  }, [dishId, Dishdata, methods, selectedLanguageId]);

  return (
    <>
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className="space-y-8 bg-white p-8 dark:bg-black"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <h1 className="col-span-12 mb-4 text-lg font-semibold">
              New Dish Master Admin
            </h1>

            <div className="col-span-12 md:col-span-6">
              <GenericSearchDropdown
                name="language"
                label="Language"
                options={languageOptions}
              />
            </div>

            <div className="col-span-12 md:col-span-6">
              <SearchInputWithSuggestions
                name="name"
                label="Dish Name"
                placeholder="Search or type a dish name"
                suggestions={dishes}
                onDishSearch={onDishSearch}
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
              <GenericSearchDropdown
                name="dishCategory"
                label="Dish Category"
                options={catagoryOptions}
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
          {/* Form Buttons */}
          <div className="flex justify-end space-x-4">
            <GenericButton type="submit">Save</GenericButton>
          </div>
        </form>
        {/* <DisplayDishCat /> */}
        <NewAddRawMaterialAdmin
          dishId={dishId}
          languageId={selectedLanguageId}
        />
      </FormProvider>
    </>
  );
};

export default NewDishMasterAdmin;
