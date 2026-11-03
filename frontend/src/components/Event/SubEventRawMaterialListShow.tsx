/*  eslint-disable @typescript-eslint/no-explicit-any */

import {useSubEventContext, SubEventProvider} from '@/context/SubEventContext';
import {
  useGetDishCategories,
  useGetDishes,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {
  useAddSubEventDishRawMaterial,
  useSubEventPrediction,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {useGetAllMaharaj} from '@/lib/react-query/queriesAndMutations/cateror/maharaj';
import {
  SubEventRawMaterialListValidation,
  rawMaterialWithQuantityAndPriceSchema,
} from '@/lib/validation/eventSchema';
import {useNavigate} from '@tanstack/react-router';
import React, {useCallback, useEffect} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {BiChevronUp, BiChevronDown, BiQr} from 'react-icons/bi';
import {z} from 'zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import DishPopup from './RawMaterialComponents/DishPopup';
import DishTable from './RawMaterialComponents/DishTable';
import DishPopupShow from './RawMaterialComponents/DishPopupShow';

type FormValues = z.infer<typeof SubEventRawMaterialListValidation>;
type RawMaterialListTypes = z.infer<
  typeof rawMaterialWithQuantityAndPriceSchema
>;

interface SubEventRawMaterialListProps {
  subEvent: any;
}

const SubEventRawMaterialListInnershow: React.FC<
  SubEventRawMaterialListProps
> = ({subEvent}) => {
  const {
    setOnDishClick,
    // Do not override handleSaveDishDetails here—use the default from context.
    setIsCollapsed,
    isCollapsed,
    setSelectedDishDetails,
    dishUpdates,
    preparationPeople,
    setPreparationPeople,
  } = useSubEventContext();

  const methods = useForm<FormValues>();
  const {handleSubmit, register, setValue, getValues, watch} = methods;

  const subEventDishes = subEvent?.dishes || [];
  const {data: maharajs} = useGetAllMaharaj();
  const {mutateAsync: addDishRawMaterial} = useAddSubEventDishRawMaterial();
  const {mutate: subEventPrediction, data: predictionData} =
    useSubEventPrediction();
  const {data: DishCategories} = useGetDishCategories();
  const {data: CaterorDish} = useGetDishes();

  // Watch preparationPeople and update context.
  const preparationPeopleValue = watch('preparationPeople');
  useEffect(() => {
    setPreparationPeople(Number(preparationPeopleValue));
  }, [preparationPeopleValue, setPreparationPeople]);

  // Instead of auto-predicting when preparationPeople changes, use a Predict button.
  const handlePredictPreparation = () => {
    if (preparationPeopleValue) {
      subEventPrediction(
        {
          subEventId: subEvent?.id,
          preparationPeople: Number(preparationPeopleValue),
        },
        {
          onSuccess: (data) => {
            console.log('Prediction Response:', data);
          },
          onError: (error) => {
            console.error('Prediction Error:', error);
          },
        },
      );
    }
  };

  const maharajOptions =
    maharajs?.map((maharaj: {id: string; user: {fullname: string}}) => ({
      label: maharaj.user.fullname,
      value: maharaj.id,
    })) || [];

  // Memoize onDishClick so that its reference remains stable.
  const onDishClick = useCallback(
    (dishId: string) => {
      if (predictionData?.data?.dishes) {
        const matchedDish = predictionData.data.dishes.find(
          (d: any) => d.dishId === dishId,
        );
        if (matchedDish) {
          setSelectedDishDetails(matchedDish);
        } else {
          console.log('No matching dish found in prediction data.');
        }
      }
    },
    [predictionData, setSelectedDishDetails],
  );

  // Set onDishClick in context.
  useEffect(() => {
    setOnDishClick(() => onDishClick);
  }, [setOnDishClick, onDishClick]);

  const onSubmit = async (data: FormValues) => {
    const transformedDishes = data.dishes.map((item, index) => {
      // Use manual update if available.
      const dishUpdate = dishUpdates[item.dishId];
      if (dishUpdate) {
        return {
          ...item,
          maharajId: item.maharajId ? item.maharajId : 'Default',
          kg: Number(dishUpdate.kg),
          rawMaterials: dishUpdate.rawMaterials.map((rawMaterial: any) => ({
            ...rawMaterial,
            quantity: Number(rawMaterial.quantity),
          })),
          price: Number(item?.price),
          people: Number(item?.people),
        };
      } else {
        // Otherwise, use prediction data (if available).
        const predictedDish = predictionData?.data?.dishes?.find(
          (d: any) => d.dishId === item.dishId,
        );
        return {
          ...item,
          maharajId: item.maharajId ? item.maharajId : 'Default',
          kg: Number(item.kg),
          rawMaterials: predictedDish?.rawMaterials
            ? predictedDish.rawMaterials.map((rawMaterial: any) => ({
                ...rawMaterial,
                quantity: Number(rawMaterial.quantity),
              }))
            : [],
          price: Number(item?.price),
          people: Number(predictedDish?.people || item.people),
        };
      }
    });

    // Uncomment the API call when you are ready to submit.
    await addDishRawMaterial({
      dishes: transformedDishes,
      subEventId: subEvent?.id,
      preparationPeople: Number(data.preparationPeople),
    });
  };

  // Initialize the form values.
  useEffect(() => {
    const transformData = subEvent?.dishes?.map(
      (dish: {dishId: string; preparation: number}) => ({
        dishId: dish.dishId,
        kg: 0,
        people: dish.preparation,
        price: 100,
      }),
    );
    setValue('dishes', transformData);
  }, [setValue, subEvent?.dishes]);

  useEffect(() => {
    if (predictionData?.data?.dishes) {
      subEventDishes.forEach((dish: any, index: number) => {
        const matchedDish = predictionData.data.dishes.find(
          (d: any) => d.dishId === dish.dishId,
        );
        if (matchedDish) {
          setValue(`dishes.${index}.kg`, matchedDish.kg);
        }
      });
    }
  }, [predictionData, setValue, subEventDishes, dishUpdates]);

  // NEW EFFECT: When dishUpdates (manual changes) change, update the form values.
  useEffect(() => {
    const currentDishes = getValues('dishes');
    if (currentDishes && currentDishes.length > 0) {
      currentDishes.forEach((dish: any, index: number) => {
        if (dishUpdates[dish.dishId]) {
          setValue(`dishes.${index}.kg`, dishUpdates[dish.dishId].kg);
        }
      });
    }
  }, [dishUpdates, getValues, setValue]);

  const navigate = useNavigate();
  const handleNavigation = (id: string) => {
    navigate({
      to: `/qrgenerator/${id}`,
    });
  };

  return (
    <div className="mt-2.5 rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div
        className="flex flex-row justify-between"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <h2 className="mb-4 cursor-pointer text-lg font-bold">
          {subEvent?.name}
        </h2>
        <h2 className="text-xl">
          {isCollapsed ? (
            <BiChevronUp size={30} />
          ) : (
            <BiChevronDown size={30} />
          )}
        </h2>
      </div>
      {!isCollapsed && (
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-row justify-between">
              <div>
                <h1>
                  {new Date(subEvent?.date).toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </h1>
                <h1>
                  {new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  }).format(new Date(subEvent?.time))}
                </h1>
              </div>
              <BiQr size={25} onClick={() => handleNavigation(subEvent?.id)} />
            </div>
            <div className="mb-6 flex flex-row items-center justify-end">
              <label className="mr-3">People</label>
              <input
                className="w-auto rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                value={subEvent.expectedPeople}
                {...register('people')}
                disabled
              />
              <span className="mr-3" />
              <label className="mr-3">Preparation</label>
              <input
                {...register('preparationPeople')}
                value={
                  preparationPeopleValue !== undefined
                    ? preparationPeopleValue
                    : subEvent?.expectedPeople || 0
                }
                className="w-auto rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
              />
              {/* Predict button for preparation */}
              <GenericButton type="button" onClick={handlePredictPreparation}>
                Predict
              </GenericButton>
            </div>
            <DishTable
              subEventDishes={subEventDishes}
              register={register}
              getValues={getValues}
              DishCategories={DishCategories}
              CaterorDish={CaterorDish}
              maharajOptions={maharajOptions}
            />
            <div className="mt-2.5 flex justify-end pb-5">
              <GenericButton type="submit">Save</GenericButton>
            </div>
          </form>
        </FormProvider>
      )}
      <DishPopupShow />
    </div>
  );
};

const SubEventRawMaterialListShow: React.FC<SubEventRawMaterialListProps> = ({
  subEvent,
}) => {
  return (
    <SubEventProvider>
      <SubEventRawMaterialListInnershow subEvent={subEvent} />
    </SubEventProvider>
  );
};

export default SubEventRawMaterialListShow;
