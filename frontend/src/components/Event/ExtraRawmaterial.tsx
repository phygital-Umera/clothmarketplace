/* eslint-disable */
import React, {useEffect} from 'react';
import z from 'zod';
import {useForm, FormProvider, useWatch} from 'react-hook-form';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericSearchDropdown from '../Forms/SearchDropDown/GenericSearchDropdown';
import {
  useAddNewRawMaterialForSubevent,
  useAddRawMaterialForSubevent,
  useGetRawMaterialsCateror,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {useAuthContext} from '@/context/AuthContext';
import {Route} from '@/routes/_app/_event/events.$id';
import {RawMaterialNameInput} from '../Forms/Input/RawMaterialNameInput';
import {BiPlus} from 'react-icons/bi';

const rawMaterialValidationSchema = z.object({
  name: z.string().min(1, 'Raw material name is required').max(100),
  unit: z.enum(['BOTTLE', 'GRAM', 'KILOGRAM', 'LITRE', 'PIECE', 'METER']),
  rawMaterialCategory: z.string().min(1, 'Raw material category is required'),
  quantity: z.number().positive({message: 'Amount must be a positive number'}),
  rawMaterial: z.string().min(1, 'Raw material is required'),
});

type FormValues = z.infer<typeof rawMaterialValidationSchema>;

const ExtraRawmaterial = () => {
  const {user} = useAuthContext();
  const {id: eventId} = Route.useParams();

  const methods = useForm<FormValues>({
    defaultValues: {
      rawMaterial: '',
      name: '',
      rawMaterialCategory: '',
      unit: 'BOTTLE',
      amount: 0,
    },
  });

  const {mutateAsync: addRawMaterial} = useAddRawMaterialForSubevent();
  const {mutateAsync: addNewRawMaterial} = useAddNewRawMaterialForSubevent();

  const {data: rawMaterialsData} = useGetRawMaterialsCateror();

  const rawMaterials = rawMaterialsData?.data?.rawMaterials || [];

  const rawMaterialOptions = rawMaterials.map((item: any) => ({
    value: item.id,
    label: item.name,
  }));

  const selectedRawMaterialId = useWatch({
    control: methods.control,
    name: 'rawMaterial',
  });

  useEffect(() => {
    if (!selectedRawMaterialId) return;

    const selected = rawMaterials.find((rm) => rm.id === selectedRawMaterialId);
    if (selected) {
      methods.reset({
        rawMaterial: selected.id,
        name: selected.name || '',
        rawMaterialCategory: selected.category?.id || selected.categoryId || '',
        unit: selected.unit || '',
        amount: selected.amount || 0,
      });
    }
  }, [selectedRawMaterialId, rawMaterials]);

  const onSubmit = async (data: FormValues) => {
    try {
      // Try to find the raw material
      const existingRawMaterial = rawMaterials.find(
        (rm) => rm.name.toLowerCase() === data.name.trim().toLowerCase(),
      );
      let rawMaterialId = existingRawMaterial?.id;

      // If not found, create a new raw material
      if (!rawMaterialId) {
        const newRawMaterial = await addNewRawMaterial({
          subeventId: eventId || '',

          name: data.name.trim(),
          unit: data.unit,
          categoryId: data.rawMaterialCategory,
          amount: Number(data.amount) || 0,
          quantity: Number(data.quantity) || 0,
          rawMaterialId: existingRawMaterial?.data?.id,
        });
      }

      if (!rawMaterialId) {
        throw new Error('Raw material ID missing');
      }

      // Proceed to add the raw material to the subevent
      await addRawMaterial({
        subeventId: eventId || '',
        rawMaterialId,
        quantity: Number(data.quantity) || 0,
      });

      methods.reset({
        rawMaterial: '',
        name: '',
        rawMaterialCategory: '',
        unit: 'GRAM', // or any other valid value
        quantity: 0,
      });
    } catch (err) {
      console.error('Submission failed:', err);
    }
  };

  const categoryOptions = Array.from(
    new Map(
      rawMaterials.map((rm: any) => [
        rm.category?.id,
        {value: rm.category?.id || '', label: rm.category?.name || ''},
      ]),
    ).values(),
  );

  return (
    <>
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-8">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <h1 className="col-span-12 mb-4 bg-gray-2 p-4 text-lg font-semibold dark:bg-meta-4">
              Raw Material
            </h1>

            {/* Select Raw Material */}
            <div className="col-span-12 md:col-span-3">
              <RawMaterialNameInput rawMaterials={rawMaterials} />
            </div>

            {/* Auto-filled Category */}
            <div className="col-span-12 md:col-span-3">
              <GenericSearchDropdown
                name="rawMaterialCategory"
                label="Category"
                options={categoryOptions}
              />
            </div>

            {/* Auto-filled Unit */}
            <div className="col-span-12 md:col-span-3">
              <GenericSearchDropdown
                name="unit"
                label="Unit"
                options={[
                  {value: 'GRAM', label: 'GRAM'},
                  {value: 'KILOGRAM', label: 'KILOGRAM'},
                  {value: 'BOTTLE', label: 'BOTTLE'},
                  {value: 'LITRE', label: 'LITRE'},
                  {value: 'PIECE', label: 'PIECE'},
                  {value: 'METER', label: 'METER'},
                ]}
              />
            </div>

            {/* Auto-filled Amount */}
            <div className="col-span-12 md:col-span-3">
              <GenericInputField
                name="quantity"
                label="Quantity"
                placeholder="Enter Quantity"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4">
            <GenericButton type="submit">
              <BiPlus />
            </GenericButton>
          </div>
        </form>
      </FormProvider>
    </>
  );
};

export default ExtraRawmaterial;
