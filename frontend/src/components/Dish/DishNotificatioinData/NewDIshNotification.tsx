/* eslint-disable */
import GenericButton from '@/components/Forms/Buttons/GenericButton';
import SearchInputWithSuggestions from '@/components/Forms/Input/GenericInputFieldList';
import GenericSearchDropdown from '@/components/Forms/SearchDropDown/GenericSearchDropdown';
import GenericTextArea from '@/components/Forms/TextArea/GenericTextArea';
import {dishMasterSchemaCat} from '@/lib/validation/dishSchemas';
import {zodResolver} from '@hookform/resolvers/zod';
import React, {useEffect, useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import NewRawMaterial from '../NewDishMaster/NewRawMaterial';
import {useGetNotificationById} from '@/lib/react-query/queriesAndMutations/notification';
import {useGetDishById} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {useMatch} from '@tanstack/react-router';

interface Dish {
  name: string;
}

interface Option {
  value: string;
  label: string;
}
type FormValues = z.infer<typeof dishMasterSchemaCat>;

const NewDIshNotification: React.FC = () => {
  const {params} = useMatch('/_app/_addNotificationDish/notifidata/$id' as any);
  const {id = ''} = params as {id: string};

  const [dishId, setDishId] = useState<string>('');
  const [catagoryOptions, setcatagoryOptions] = useState<Option[]>([]);
  const [dishes, setDishes] = useState<Dish[]>([]);

  const dishEdit = sessionStorage.getItem('dishEdit');
  const methods = useForm<FormValues>({
    resolver: zodResolver(dishMasterSchemaCat),
    defaultValues: {},
  });
  const {data: Dishdata, refetch: DishdataRefetch} = useGetNotificationById(id);
  console.log('Dishdata ::::::::', Dishdata);

  const onDishSearch = (dishId: string) => {
    setDishId(dishId);
  };

  useEffect(() => {
    if (Dishdata) {
      methods.reset({
        name: Dishdata.name,
        priority: Dishdata.priority,
        description: Dishdata.description,
        dishCategory: Dishdata.categoryId,
      });
    }
  }, [id]);

  const onSubmit = (data: FormValues) => {
    // console.log('data', data);
  };

  return (
    <>
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          className="space-y-8 bg-white p-8 dark:bg-black"
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <h1 className="col-span-12 mb-4 text-lg font-semibold">
              Notification Dish for Cateror
            </h1>

            <div className="col-span-12 md:col-span-4">
              <SearchInputWithSuggestions
                name="name"
                label="Dish Name"
                placeholder="Search or type a dish name"
                suggestions={dishes}
                onDishSearch={onDishSearch}
                defaultValue={dishEdit ? dishEdit : ''}
              />
            </div>

            <div className="col-span-10 md:col-span-4">
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

            <div className="col-span-12 md:col-span-4">
              <GenericSearchDropdown
                name="dishCategory"
                label="Dish Category"
                options={catagoryOptions}
                defaultOption=""
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
        {/* <NewRawMaterial dishId={dishId} /> */}
      </FormProvider>
    </>
  );
};

export default NewDIshNotification;
