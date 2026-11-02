import React, {useEffect} from 'react';
import {useForm, FormProvider, useFieldArray, useWatch} from 'react-hook-form';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import GenericInputField from '../Forms/Input/GenericInputField'; // Added for new inputs
import {addRawMaterialToDishSchema} from '@/lib/validation/dishSchemas';
import {zodResolver} from '@hookform/resolvers/zod';
import {z} from 'zod';
import {
  useGetDishByIdAdmin,
  // useGetDishByIdAdmin,
  useGetRawMaterialAdmin,
  usePredictRawMaterials,
} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useGetProcesses} from '@/lib/react-query/queriesAndMutations/admin/process';
import {useAddRawMaterialsToDish} from '@/lib/react-query/queriesAndMutations/admin/dish';
import {useDishMaster} from '@/context/DishMasterContext';
// import toast from 'react-hot-toast'; // For notifications

type FormValues = z.infer<typeof addRawMaterialToDishSchema>;

const AddRawToDish: React.FC<{id: string}> = ({id}) => {
  const {selectedLanguageId} = useDishMaster();
  const methods = useForm<FormValues>({
    resolver: zodResolver(addRawMaterialToDishSchema),
    defaultValues: {
      people: 0,
      kg: 0,
      price: 0,
      rawMaterialsWithQuantityAndPrice: [
        {rawMaterials: '', quantity: '', process: ''},
      ],
    },
  });

  const {reset, control, handleSubmit} = methods;
  const {data: rawMaterials} = useGetRawMaterialAdmin(selectedLanguageId);
  const {data: dishData} = useGetDishByIdAdmin(id);
  const {mutate: predictRawMaterial} = usePredictRawMaterials();
  console.log(dishData, 'dishData');
  const {data: processesData} = useGetProcesses();
  const {mutateAsync: addRawMaterialsToDish} = useAddRawMaterialsToDish();

  const {fields, append} = useFieldArray({
    control,
    name: 'rawMaterialsWithQuantityAndPrice',
  });

  useEffect(() => {
    if (fields.length === 0) {
      append({rawMaterials: '', quantity: '', process: ''});
    }
  }, [append, fields.length]);

  const {
    '0': kg,
    '1': people,
    '2': price,
  } = useWatch({
    control,
    name: ['kg', 'people', 'price'],
  });

  useEffect(() => {
    if (kg && people && price) {
      predictRawMaterial(
        {
          dishId: id,
          people,
          kg,
          price,
        },
        {
          onSuccess: (data) => {
            if (data?.rawMaterials?.length !== 0) {
              const formattedMaterials = data.rawMaterials.map(
                (item: {
                  rawMaterialId: string;
                  quantity: string;
                  processId: string;
                }) => ({
                  rawMaterials: item.rawMaterialId,
                  quantity: item.quantity,
                  process: item.processId,
                }),
              );

              reset({
                kg: data.kg,
                people: data.people,
                price: data.price,
                rawMaterialsWithQuantityAndPrice: formattedMaterials,
              });
            }
          },
        },
      );
    }
  }, [id, kg, people, price, reset, predictRawMaterial]);

  const onSubmit = async (data: FormValues) => {
    console.log('Complete form data:', data);
    const transformedRawMaterials = data.rawMaterialsWithQuantityAndPrice.map(
      (material) => ({
        rawMaterialId: material.rawMaterials,
        processId: material.process,
        quantity: Number(material.quantity),
      }),
    );

    const payload = {
      dishId: id, // Dish ID passed as a prop
      people: data.people,
      price: data.price,
      kg: data.kg,
      rawMaterialsWithQuantityAndPrice: transformedRawMaterials,
    };

    try {
      await addRawMaterialsToDish(payload);
      reset();
    } catch (error) {
      console.error('Error during submission:', error);
    }
  };

  return (
    <>
      <label
        htmlFor="dishName"
        className="text-gray-700 mb-2 block text-lg font-medium"
      >
        {dishData?.data.name || 'Dish Name'}
      </label>
      <FormProvider {...methods}>
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-8 bg-white p-8 dark:bg-black"
        >
          {/* Inputs for People, KG, Price */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
            <div>
              <GenericInputField
                label="People"
                name="people"
                type="number"
                validation={{valueAsNumber: true}}
              />
            </div>
            <div>
              <GenericInputField
                label="KG"
                name="kg"
                validation={{valueAsNumber: true}}
              />
            </div>
            <div>
              <GenericInputField
                label="Price"
                name="price"
                validation={{valueAsNumber: true}}
              />
            </div>
          </div>

          {/* Dynamic Fields */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            {fields.map((field, index) => (
              <React.Fragment key={field.id}>
                <div className="col-span-12 md:col-span-4">
                  <GenericSearchDropdown
                    name={`rawMaterialsWithQuantityAndPrice.${index}.rawMaterials`}
                    label="Raw Materials"
                    options={
                      rawMaterials
                        ? rawMaterials?.data.map(
                            (material: {id: string; name: string}) => ({
                              label: material.name,
                              value: material.id,
                            }),
                          )
                        : []
                    }
                  />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <GenericInputField
                    label="Quantity"
                    name={`rawMaterialsWithQuantityAndPrice.${index}.quantity`}
                  />
                </div>

                <div className="col-span-12 md:col-span-4">
                  <GenericSearchDropdown
                    name={`rawMaterialsWithQuantityAndPrice.${index}.process`}
                    label="Process"
                    options={
                      processesData?.processes
                        ? processesData.processes.map(
                            (process: {id: string; name: string}) => ({
                              label: process.name,
                              value: process.id,
                            }),
                          )
                        : []
                    }
                  />
                </div>
              </React.Fragment>
            ))}
          </div>

          {/* Add More Button */}
          <div className="mt-4">
            <GenericButton
              type="button"
              onClick={() =>
                append({rawMaterials: '', quantity: '', process: ''})
              }
            >
              Add More
            </GenericButton>
          </div>

          {/* Submit Button */}
          <div className="col-span-12 mt-10 md:col-span-4">
            <GenericButton type="submit">Save</GenericButton>
          </div>
        </form>
      </FormProvider>
    </>
  );
};

export default AddRawToDish;
