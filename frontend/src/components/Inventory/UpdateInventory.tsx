/* eslint-disable  */
import React, {useEffect} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {z} from 'zod';

import {zodResolver} from '@hookform/resolvers/zod';
import {useNavigate, useMatch} from '@tanstack/react-router';
import {
  useGetInventoryDataById,
  useUpdateInventory,
} from '@/lib/react-query/queriesAndMutations/cateror/inventorydata';

// Define schema for validation
const inventorySchema = z.object({
  quantity: z.string().min(0, 'Quantity must be a positive number'),
});

// Infer form values from schema
type FormValues = z.infer<typeof inventorySchema>;

const UpdateInventory: React.FC = () => {
  const navigate = useNavigate();
  const {params} = useMatch('/_app/_inventory/updateinventory/$id' as any);
  const {id} = params as {id: string};

  // Initialize form with validation schema
  const methods = useForm<FormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      quantity: 0, // Set initial value
    },
  });

  const {reset, setValue, handleSubmit} = methods;

  // Fetch inventory data
  const {data: inventoryData, isSuccess} = useGetInventoryDataById(id);
  console.log(inventoryData);

  // Update state when data is fetched
  useEffect(() => {
    if (isSuccess && inventoryData && inventoryData.data.data) {
      setValue('quantity', Number(inventoryData.data.data.quantity).toFixed(2));
    }
  }, [isSuccess, inventoryData, setValue]);

  // Use mutation to update inventory
  const {
    mutate: updateInventory,
    isPending,
    isSuccess: isUpdateSuccess,
    isError,
    error,
  } = useUpdateInventory();

  // Handle form submission
  const onSubmit = (data: FormValues) => {
    // console.log('Submited Data:', data);
    const updatedQuantity = {
      quantity: parseFloat(Number(data.quantity).toFixed(2)),
      id,
    };
    updateInventory({
      id,
      data: updatedQuantity,
    });
    console.log('Submited dataaaaa:', id, updatedQuantity);
  };

  // Handle success/error responses
  useEffect(() => {
    if (isUpdateSuccess) {
      reset();
      console.log('Inventory updated successfully');
      navigate({to: '/inventory'});
    } else if (isError) {
      console.error(error);
    }
  }, [isUpdateSuccess, isError, error, reset, navigate]);

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-8 bg-white p-8 dark:bg-black"
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
          <h1 className="col-span-12 mb-4 text-lg font-semibold">
            Update Inventory
          </h1>

          <div className="col-span-12 md:col-span-6">
            <GenericInputField
              name="quantity"
              label="Quantity"
              type="string"
              placeholder="Enter Quantity"
            />
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <GenericButton type="submit">
            {isPending ? 'Updating...' : 'Update'}
          </GenericButton>
        </div>
      </form>
    </FormProvider>
  );
};

export default UpdateInventory;
