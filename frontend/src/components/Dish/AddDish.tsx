// import React from 'react';
// import z from 'zod';
// import {zodResolver} from '@hookform/resolvers/zod';
// import {useForm, FormProvider} from 'react-hook-form';
// import GenericInputField from '../Forms/Input/GenericInputField';
// import GenericResetButton from '../Forms/Buttons/GenericResetButton';
// import GenericButton from '../Forms/Buttons/GenericButton';
// import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
// import {dishValidationSchema} from '@/lib/validation/dishSchemas';
// import {useAddDishAdmin} from '@/lib/react-query/queriesAndMutations/admin/dish';
// import {useAddDish} from '@/lib/react-query/queriesAndMutations/cateror/dish';
// import {useAuthContext} from '@/context/AuthContext';
// import {role} from '@/types/auth';

// type FormValues = z.infer<typeof dishValidationSchema>;

// const AddDish: React.FC = () => {
//   const {user} = useAuthContext();
//   const {mutateAsync: addDish} = (
//     user?.role === role.ADMIN ? useAddDishAdmin : useAddDish
//   )();

//   const methods = useForm<FormValues>({
//     resolver: zodResolver(dishValidationSchema),
//     defaultValues: {
//       DishName: '',
//       CategoryID: '',
//     },
//   });

//   const onSubmit = async (data: FormValues) => {
//     try {
//       await addDish({
//         categoryId: data.CategoryID,
//         name: data.DishName,
//         description: '',
//         languageId: '',
//         priority: '',
//       });
//     } catch (error) {
//       console.log(error);
//     }
//   };

//   return (
//     <FormProvider {...methods}>
//       <form
//         onSubmit={methods.handleSubmit(onSubmit)}
//         className="space-y-8 bg-white p-8 dark:bg-black"
//       >
//         <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
//           <h1 className="col-span-12 mb-4 text-lg font-semibold">Dish</h1>

//           <div className="col-span-12 md:col-span-6">
//             <GenericInputField
//               name="DishName"
//               label="Dish Name"
//               placeholder="Enter dish name"
//             />
//           </div>

//           <div className="col-span-12 md:col-span-6">
//             <GenericSearchDropdown
//               name="CategoryID"
//               label="Dish Category"
//               options={[
//                 {label: 'Option1', value: '1'},
//                 {label: 'Option2', value: '2'},
//                 {label: 'Option3', value: '3'},
//               ]}
//               defaultOption=""
//             />
//           </div>
//         </div>

//         {/* Form Buttons */}
//         <div className="flex justify-end space-x-4">
//           <GenericButton type="submit">Save</GenericButton>
//           <GenericResetButton type="reset">Reset</GenericResetButton>
//         </div>
//       </form>
//     </FormProvider>
//   );
// };

// export default AddDish;
// import React from 'react';

// const AddDish = () => {
//   return <div>AddDish</div>;
// };

// export default AddDish;

import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import GenericTextArea from '../Forms/TextArea/GenericTextArea';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericDropdown from '../Forms/DropDown/GenericDropDown';
import {useDishMaster} from '@/context/DishMasterContext';
import {dishMasterSchema} from '@/lib/validation/dishSchemas';
import {
  useAddDishAdmin,
  useGetDishByIdAdmin,
  useGetDishCategoriesAdmin,
  useGetDishesAdmin,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useGetLanguages} from '@/lib/react-query/queriesAndMutations/admin/languages';
import {z} from 'zod';
import SearchInputWithSuggestions from '../Forms/Input/GenericInputFieldList';

type FormValues = z.infer<typeof dishMasterSchema>;

interface DishMasterProps {
  onDishAdded: () => void;
}

const DishMaster: React.FC<DishMasterProps> = ({onDishAdded}) => {
  const {setDishId} = useDishMaster();
  const methods = useForm<FormValues>({
    resolver: zodResolver(dishMasterSchema),
  });
  const {reset, watch} = methods;

  const selectedLanguageId = watch('language');
  const [categoryOptions, setCategoryOptions] = useState<
    {label: string; value: string}[]
  >([]);
  const [languageOptions, setLanguageOptions] = useState<
    {label: string; value: string}[]
  >([]);

  const [DishbyId, setDishbyId] = useState<string>('');
  const {data: selectedDish} = useGetDishByIdAdmin(DishbyId);
  const {data: categoriesData, refetch: refetchCategories} =
    useGetDishCategoriesAdmin(selectedLanguageId);

  const {data: dishesData, refetch: refetchDishes} =
    useGetDishesAdmin(selectedLanguageId);

  const {mutate: addDish} = useAddDishAdmin();
  const {data: languages} = useGetLanguages();

  useEffect(() => {
    if (languages) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options = languages.map((language: any) => ({
        label: language.name,
        value: language.id,
      }));
      setLanguageOptions(options);
    }
  }, [languages]);

  useEffect(() => {
    if (selectedLanguageId) {
      refetchCategories();
      refetchDishes();
    }
  }, [selectedLanguageId, refetchCategories, refetchDishes]);

  useEffect(() => {
    if (categoriesData?.data?.data) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const options = categoriesData.data.data.map((category: any) => ({
        label: category.name,
        value: category.id,
      }));
      setCategoryOptions(options);
    }
  }, [categoriesData]);

  const onSubmit = (data: FormValues) => {
    addDish(
      {
        name: data.name,
        categoryId: data.dishCategory,
        languageId: data.language,
        priority: data.priority,
        description: data.description,
      },
      {
        onSuccess: (response) => {
          setDishId(response.data.id);
          reset();
          onDishAdded();
        },
        onError: (error) => {
          console.error('Error adding dish:', error);
        },
      },
    );
  };
  useEffect(() => {
    if (selectedDish) {
      reset({
        name: selectedDish?.data.name,
        description: selectedDish?.data.description,
        priority: selectedDish?.data.priority,
        dishCategory: selectedDish?.data.categoryId,
        // language: selectedDish,
      });
    }
  }, [selectedDish, reset]);
  const onDishSearch = (dishId: string) => {
    console.log(selectedDish, 'selectedDish');
    setDishbyId(dishId); // Set the dishId
  };
  // const handleLoad = () => {
  //   // setDishId(selectedDishId);
  //   onDishAdded();
  // };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={methods.handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
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
              name="dishName"
              label="Dish Name"
              suggestions={dishesData?.data?.data || []}
              onDishSearch={onDishSearch}
            />
          </div>

          <div className="col-span-12 md:col-span-6">
            <GenericSearchDropdown
              name="priority"
              label="Priority"
              options={[
                {label: '1st Priority', value: 'P1'},
                {label: '2nd Priority', value: 'P2'},
                {label: '3rd Priority', value: 'P3'},
              ]}
            />
          </div>
          <div className="col-span-12 md:col-span-6">
            <GenericDropdown
              name="dishCategory"
              label="Dish Category"
              options={categoryOptions}
              defaultOption="Select Category"
              // control={methods.control}
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

          <div className="col-span-12 mt-10 md:col-span-3">
            <GenericButton type="submit">Save</GenericButton>
            {/* <GenericButton onClick={handleLoad}>Load</GenericButton> */}
          </div>
        </div>
      </form>
    </FormProvider>
  );
};

export default DishMaster;
