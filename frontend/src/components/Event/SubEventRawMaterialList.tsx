/* eslint-disable */
import React, {useEffect, useCallback, useRef, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {BiChevronDown, BiChevronUp, BiQr} from 'react-icons/bi';
import GenericButton from '../Forms/Buttons/GenericButton';
import {useGetAllMaharaj} from '@/lib/react-query/queriesAndMutations/cateror/maharaj';
import {
  rawMaterialWithQuantityAndPriceSchema,
  SubEventRawMaterialListValidation,
} from '@/lib/validation/eventSchema';
import {z} from 'zod';
import {
  useAddSubEventDishRawMaterial,
  useSubEventPrediction,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {useNavigate} from '@tanstack/react-router';
import {
  useGetDishCategories,
  useGetDishes,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {useSubEventContext, SubEventProvider} from '@/context/SubEventContext';
import DishPopup from './RawMaterialComponents/DishPopup';
import DishTable from './RawMaterialComponents/DishTable';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import toast from 'react-hot-toast';
import {useAuthContext} from '@/context/AuthContext';

type FormValues = z.infer<typeof SubEventRawMaterialListValidation>;
type RawMaterialListTypes = z.infer<
  typeof rawMaterialWithQuantityAndPriceSchema
>;

interface SubEventRawMaterialListProps {
  subEvent: any;
}

const SubEventRawMaterialListInner: React.FC<SubEventRawMaterialListProps> = ({
  subEvent,
}) => {
  const {
    setOnDishClick,
    setIsCollapsed,
    isCollapsed,
    setSelectedDishDetails,
    dishUpdates,
    preparationPeople,
    setPreparationPeople,
  } = useSubEventContext();

  const methods = useForm<FormValues>();
  const {handleSubmit, register, setValue, getValues, watch} = methods;
  const {user} = useAuthContext();
  const tableRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  const subEventDishes = subEvent?.dishes || [];
  const {data: maharajs} = useGetAllMaharaj();
  const {mutateAsync: addDishRawMaterial, isPending: isAddPending} =
    useAddSubEventDishRawMaterial();
  const {
    mutate: subEventPrediction,
    data: predictionData,
    isPending,
  } = useSubEventPrediction();
  const {data: DishCategories} = useGetDishCategories();

  const {data: CaterorDish} = useGetDishes();

  console.log('====================================');
  console.log('subEvent', CaterorDish);
  console.log('====================================');

  // Watch preparationPeople and update context.
  const preparationPeopleValue = watch('preparationPeople');
  useEffect(() => {
    setPreparationPeople(Number(preparationPeopleValue));
  }, [preparationPeopleValue, setPreparationPeople]);

  // Handle prediction
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
            toast.success('Prediction successful!');
          },
          onError: (error) => {
            console.error('Prediction Error:', error);
          },
        },
      );
    }
  };

  // Initialize prediction
  useEffect(() => {
    if (subEvent?.id) {
      subEventPrediction(
        {
          subEventId: subEvent.id,
          preparationPeople: Number(watch('preparationPeople')),
        },
        {
          onSuccess: (data) => {
            console.log('Initial Prediction Response:', data);
          },
          onError: (error) => {
            console.error('Initial Prediction Error:', error);
          },
        },
      );
    }
  }, []);

  const maharajOptions =
    maharajs?.map((maharaj: {id: string; user: {fullname: string}}) => ({
      label: maharaj.user.fullname,
      value: maharaj.id,
    })) || [];

  // Memoize onDishClick
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

  // Set onDishClick in context
  useEffect(() => {
    setOnDishClick(() => onDishClick);
  }, [setOnDishClick, onDishClick]);

  const onSubmit = async (data: FormValues) => {
    const transformedDishes = data.dishes.map((item, index) => {
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

    await addDishRawMaterial({
      dishes: transformedDishes,
      subEventId: subEvent?.id,
      preparationPeople: Number(data.preparationPeople),
    });
  };

  // Initialize form values
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

  // Update form values with prediction data
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

  // Update form values with manual changes
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

  // const navigate = useNavigate();
  // const handleNavigation = (id: string) => {
  //   navigate({
  //     to: `/qrgenerator/${id}`,
  //   });
  // };

  const handleDownloadPDF = () => {
    if (!tableRef.current) return;

    setIsVisible(false);

    setTimeout(() => {
      if (!tableRef.current) return;

      const reportContainer = document.createElement('div');
      reportContainer.style.width = '800px';
      reportContainer.style.padding = '20px';
      reportContainer.style.background = 'white';
      reportContainer.style.fontFamily = 'Arial, sans-serif';
      reportContainer.style.borderRadius = '10px';
      reportContainer.style.boxShadow = '0 0 10px rgba(0,0,0,0.1)';

      // Format date and time
      const formattedDate = new Date(subEvent?.date).toLocaleDateString(
        'en-GB',
        {
          day: 'numeric',
          month: 'short',
          year: 'numeric',
        },
      );

      const formattedTime = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(new Date(subEvent?.time));

      // Header with event info and cateror info
      const header = document.createElement('div');
      header.style.textAlign = 'center';
      header.style.marginBottom = '20px';
      header.style.borderBottom = '1px solid #eee';
      header.style.paddingBottom = '15px';
      header.innerHTML = `
      <h2 style="margin-bottom: 10px; font-size: 22px; color: #333; font-weight: bold;">
        Sub Event Raw Material Report
      </h2>
      
      <div style="margin-bottom: 2px;">
        <p style="margin: 4px 0; font-size: 14px; color: #333;">
          <strong>Event:</strong> ${subEvent?.name || 'N/A'} | 
          <strong>Date:</strong> ${formattedDate} | 
          <strong>Time:</strong> ${formattedTime}
        </p>
      </div>
      
      <div style="margin-bottom: 5px; ; padding: 8px; border-radius: 4px;">
        <p style="margin: 2px 0; font-size: 13px; color: #333;">
          <strong>Cateror:</strong> ${user?.fullname || 'N/A'} | 
          <strong>Phone:</strong> ${user?.phoneNumber || 'N/A'} | 
          <strong>Address:</strong> ${user?.address || 'N/A'}
        </p>
      </div>
      
     
    `;
      reportContainer.appendChild(header);

      // Table (rest of your existing table code remains the same)
      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '14px';
      table.style.border = '1px solid #ddd';
      table.style.borderRadius = '8px';
      table.style.overflow = 'hidden';

      // Table Header
      const headerRow = table.insertRow();
      ['Dish', 'Category', 'Quantity', 'Unit', 'Maharaj'].forEach((text) => {
        const th = document.createElement('th');
        th.innerText = text;
        th.style.border = '1px solid gray';
        th.style.padding = '8px';
        th.style.backgroundColor = '#318CE7';
        th.style.color = 'white';
        th.style.textAlign = 'center';
        th.style.fontWeight = 'bold';
        headerRow.appendChild(th);
      });

      // Table Rows
      const dishes = getValues('dishes');
      dishes.forEach((dish: any, index: number) => {
        const row = table.insertRow();
        row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f5f5f5';

        const dishDetails = subEventDishes.find(
          (d: any) => d.dishId === dish.dishId,
        );
        const maharaj = maharajOptions.find(
          (m: any) => m.value === dish.maharajId,
        );

        [
          dishDetails?.dish?.name || 'N/A',
          dishDetails?.dish?.category?.name || 'N/A',
          dish.kg || 0,
          dishDetails?.unit || 'KG',
          maharaj?.label || 'N/A',
        ].forEach((text) => {
          const cell = row.insertCell();
          cell.innerText = text;
          cell.style.border = '1px solid #ddd';
          cell.style.padding = '8px';
          cell.style.textAlign = 'center';
        });
      });

      reportContainer.appendChild(table);

      // Notes Section
      const notesSection = document.createElement('div');
      notesSection.style.marginTop = '10px';
      notesSection.style.marginBottom = '20px';

      const notesTitle = document.createElement('h3');
      notesTitle.innerText = 'Notes:';
      notesTitle.style.fontSize = '16px';
      notesTitle.style.marginBottom = '10px';
      notesTitle.style.color = '#333';
      notesSection.appendChild(notesTitle);

      const notesBox = document.createElement('div');
      notesBox.style.border = '1px solid #ddd';
      notesBox.style.borderRadius = '8px';
      notesBox.style.padding = '15px';
      notesBox.style.minHeight = '100px';
      notesBox.style.backgroundColor = '#f9f9f9';
      notesBox.innerHTML = `<div style="display: flex; flex-direction: column; gap: 80px;"></div>`;
      notesSection.appendChild(notesBox);
      reportContainer.appendChild(notesSection);

      const footer = document.createElement('div');
      footer.style.marginTop = '20px';
      footer.style.fontSize = '10px';
      footer.style.textAlign = 'center';
      footer.style.color = '#666';
      footer.innerHTML = `<p>&copy; All Rights Reserved by PhygitalTech. Contact: 95116 40351.</p>`;
      reportContainer.appendChild(footer);

      document.body.appendChild(reportContainer);

      const options = {
        scale: 10,
        logging: false,
        useCORS: true,
        allowTaint: true,
        letterRendering: true,
        quality: 1,
        windowWidth: reportContainer.scrollWidth,
        windowHeight: reportContainer.scrollHeight,
      };

      html2canvas(reportContainer, options)
        .then((canvas) => {
          const doc = new jsPDF('p', 'mm', 'a4');
          const imgData = canvas.toDataURL('image/jpeg', 5.0);
          const imgWidth = 210;
          const imgHeight = (canvas.height * imgWidth) / canvas.width;
          const pageHeight = doc.internal.pageSize.height;
          let offsetY = 0;

          while (offsetY < imgHeight) {
            if (offsetY > 0) {
              doc.addPage();
            }
            doc.addImage(imgData, 'JPEG', 0, -offsetY, imgWidth, imgHeight);
            offsetY += pageHeight;
          }

          doc.save('SubEventRawMaterialReport.pdf');
        })
        .finally(() => {
          document.body.removeChild(reportContainer);
          setIsVisible(true);
        });
    }, 100);
  };

  return (
    <div className="rounded-sm border-stroke bg-white px-4 py-6 dark:border-strokedark dark:bg-boxdark sm:px-6 lg:px-8">
      <div
        className="flex flex-col justify-between rounded-t-lg bg-gray-2 px-4 py-3 text-left text-graydark dark:bg-meta-4 dark:text-white sm:flex-row"
        onClick={() => setIsCollapsed(!isCollapsed)}
      >
        <div className="flex w-full flex-row items-center justify-between">
          <div>
            <h2 className="mb-1 text-lg font-bold sm:text-xl">
              {subEvent?.name}
            </h2>
            <div className="flex flex-col gap-1 text-sm sm:flex-row sm:gap-4 sm:text-base">
              <div className="flex items-center">
                <span>
                  {new Date(subEvent?.date).toLocaleDateString('en-GB', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                  })}
                </span>
              </div>
              <div className="flex items-center">
                <span>
                  {new Intl.DateTimeFormat('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                    hour12: true,
                  }).format(new Date(subEvent?.time))}
                </span>
              </div>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadPDF();
            }}
            className="ml-auto flex items-end gap-1 rounded bg-blue-100 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-200 sm:text-base"
          >
            <span>📄</span>
            <span>Download PDF</span>
          </button>
          <div className="flex items-center">
            {isCollapsed ? (
              <BiChevronUp size={30} className="text-white" />
            ) : (
              <BiChevronDown size={30} className="text-white" />
            )}
          </div>
        </div>
      </div>

      {!isCollapsed && (
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            {/* Content remains the same */}
            <div className="mt-4 flex items-center justify-between"></div>
            <div className="mb-6 flex flex-col items-end gap-4 sm:flex-row sm:items-center sm:justify-end">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-sm sm:text-base">People</label>
                <input
                  className="w-full rounded border-[1.7px] border-stroke bg-transparent px-2 py-1 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary sm:w-auto sm:px-2 sm:py-1"
                  value={subEvent.expectedPeople}
                  {...register('people')}
                  disabled
                />
              </div>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <label className="text-sm sm:text-base">Preparation</label>
                <input
                  {...register('preparationPeople', {valueAsNumber: true})}
                  defaultValue={
                    subEventDishes[0]?.preparation
                      ? subEventDishes[0]?.preparation
                      : subEvent?.expectedPeople
                  }
                  onChange={(e) =>
                    setValue('preparationPeople', Number(e.target.value))
                  }
                  className="w-full rounded border-[1.7px] border-stroke bg-transparent px-2 py-1 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary sm:w-auto sm:px-2 sm:py-1"
                />
              </div>
              <GenericButton
                type="button"
                disabled={isPending}
                onClick={handlePredictPreparation}
                className="w-full sm:w-auto"
              >
                {isPending ? 'Predicting...' : 'Predict'}
              </GenericButton>
            </div>
            <div ref={tableRef} className="overflow-x-auto">
              <DishTable
                subEventDishes={subEventDishes}
                register={register}
                getValues={getValues}
                DishCategories={DishCategories}
                CaterorDish={CaterorDish}
                maharajOptions={maharajOptions}
              />
            </div>
            <div className="mt-4 flex justify-end pb-5">
              <GenericButton disabled={isAddPending} type="submit">
                {isAddPending ? 'Submitting...' : 'Submit'}
              </GenericButton>
            </div>
          </form>
        </FormProvider>
      )}
      <DishPopup />
    </div>
  );
};

const SubEventRawMaterialList: React.FC<SubEventRawMaterialListProps> = ({
  subEvent,
}) => {
  return (
    <SubEventProvider>
      <SubEventRawMaterialListInner subEvent={subEvent} />
    </SubEventProvider>
  );
};

export default SubEventRawMaterialList;
