import React, {useEffect} from 'react';
import {
  FormProvider,
  useForm,
  SubmitHandler,
  useFieldArray,
} from 'react-hook-form';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {
  useAddRawMaterialToDishCateror,
  useGetDishById,
  useGetRawMaterialsCateror,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {useGetProcesses} from '@/lib/react-query/queriesAndMutations/cateror/process';
// import toast from 'react-hot-toast';
// import {usePredictRawMaterials} from '@/lib/react-query/queriesAndMutations/cateror/dish';
type FormValues = {
  people: number;
  kg: number;
  price: number;
  rawMaterials: {
    rawMaterial: string;
    quantity: number;
    process: string;
  }[];
};

const AddRawMaterialToDishCateror: React.FC<{
  id: string;
}> = ({id}) => {
  const methods = useForm<FormValues>({
    defaultValues: {
      rawMaterials: [{rawMaterial: '', quantity: 0, process: ''}],
    },
  });
  const {handleSubmit, control, setValue} = methods;

  // useFieldArray for dynamic fields
  const {fields, append} = useFieldArray({
    control,
    name: 'rawMaterials',
  });
  const {data: dishData} = useGetDishById(id);
  // const {mutate: predictRawMaterial} = usePredictRawMaterials();

  const {data: processesData} = useGetProcesses();

  const processOptions = processesData?.data.processes?.map(
    (process: {id: string; name: string}) => ({
      value: process.id,
      label: process.name,
    }),
  );

  const {data: rawMaterials} = useGetRawMaterialsCateror();

  const rawmaterialOptions = rawMaterials?.data.rawMaterials?.map(
    (material: {id: string; name: string}) => ({
      value: material.id,
      label: material.name,
    }),
  );

  const {
    mutateAsync: addRawMaterial,
    isSuccess,
    isPending,
    isError,
  } = useAddRawMaterialToDishCateror();

  // const {
  //   '0': kg,
  //   '1': people,
  //   '2': price,
  // } = useWatch({
  //   control,
  //   name: ['kg', 'people', 'price'],
  // });

  // useEffect(() => {
  //   if (kg && people && price) {
  //     predictRawMaterial(
  //       {
  //         dishId: id,
  //         people,
  //         kg,
  //         price,
  //       },
  //       {
  //         onSuccess: (data) => {
  //           if (data?.rawMaterials?.length !== 0) {
  //             const formattedMaterials = data.rawMaterials.map(
  //               (item: {
  //                 rawMaterialId: string;
  //                 quantity: string;
  //                 processId: string;
  //               }) => ({
  //                 rawMaterials: item.rawMaterialId,
  //                 quantity: item.quantity,
  //                 process: item.processId,
  //               }),
  //             );

  //             reset({
  //               kg: data.kg,
  //               people: data.people,
  //               price: data.price,
  //               rawMaterials: formattedMaterials,
  //             });
  //           }
  //         },
  //       },
  //     );
  //   }
  // }, [id, kg, people, price, reset, predictRawMaterial]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    // Transform raw materials data
    const transformedRawMaterials = data.rawMaterials.map((material) => ({
      rawMaterialId: material.rawMaterial, // Assuming rawMaterial stores ID
      processId: material.process, // Assuming process stores ID
      quantity: material.quantity,
    }));

    // Prepare final payload
    const payload = {
      dishId: id, // Dish ID passed as a prop
      people: data.people,
      price: data.price,
      kg: data.kg,
      rawMaterials: transformedRawMaterials,
    };

    try {
      await addRawMaterial(payload);
      console.log('Data submitted successfully:', payload);
      // Reset people, kg, price fields but keep raw materials
      setValue('people', 0);
      setValue('kg', 0);
      setValue('price', 0);

      // Reset only the 'quantity' field in each raw material object
      setValue(
        'rawMaterials',
        data.rawMaterials.map((item) => ({
          ...item,
          quantity: 0, // Reset quantity only
        })),
      );
    } catch (error) {
      console.error('Error submitting data:', error);
    }
  };

  const addMoreFields = () => {
    append({rawMaterial: '', quantity: 0, process: ''});
  };

  useEffect(() => {
    if (isSuccess) {
      // toast.success('Raw Material added successfully');
    }

    if (isError) {
      // toast.error('Failed to add raw material');
    }
  }, [isSuccess, isError]);

  return (
    <>
      <label
        htmlFor="dishName"
        className="text-gray-700 mb-2 block text-lg font-medium"
      >
        {dishData?.data.name || 'Dish Name'}
      </label>
      <FormProvider {...methods}>
        <form onSubmit={handleSubmit(onSubmit)}>
          <div className="grid grid-cols-1 gap-4 rounded bg-white p-4 shadow-md dark:bg-black md:grid-cols-2 lg:grid-cols-3">
            {/* People Input */}
            <div>
              <GenericInputField label="People" name="people" type="number" />
            </div>
            {/* KG Input */}
            <div>
              <GenericInputField
                label="KG"
                name="kg"
                type="number"
                validation={{valueAsNumber: true}}
              />
            </div>
            {/* Price Input */}
            <div>
              <GenericInputField
                label="Price"
                name="price"
                type="number"
                validation={{valueAsNumber: true}}
              />
            </div>
          </div>
          {/* Dynamic Raw Material Sets */}
          {fields.map((field, index) => (
            <div
              key={field.id} // Use a unique key for better rendering
              className="grid grid-cols-1 gap-4 rounded bg-white p-4 shadow-md dark:bg-black md:grid-cols-2 lg:grid-cols-3"
            >
              {/* Raw Material Dropdown */}
              <div>
                <GenericSearchDropdown
                  name={`rawMaterials[${index}].rawMaterial`}
                  label="Raw Material"
                  options={rawmaterialOptions || []}
                />
              </div>
              {/* Quantity Input */}
              <div>
                <GenericInputField
                  label="Quantity"
                  name={`rawMaterials[${index}].quantity`}
                  type="number"
                  validation={{valueAsNumber: true}}
                />
              </div>
              {/* Process Dropdown */}
              <div>
                <GenericSearchDropdown
                  name={`rawMaterials[${index}].process`}
                  label="Process"
                  options={processOptions || []}
                />
              </div>
            </div>
          ))}
          <div className="flex justify-end px-6 py-10 dark:bg-black">
            {/* Add More Button */}
            <button
              type="button"
              onClick={addMoreFields}
              className="`hover:bg-primary-dark mx-1 rounded bg-primary px-8 py-2 text-white transition duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50"
            >
              Add More
            </button>
            {/* Submit Button */}
            <GenericButton type="submit">
              {isPending ? 'Saving...' : 'Save'}
            </GenericButton>
          </div>
        </form>
      </FormProvider>
    </>
  );
};

export default AddRawMaterialToDishCateror;
