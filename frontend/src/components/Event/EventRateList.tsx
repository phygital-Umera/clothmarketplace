/* eslint-disable */
import {useCallback, useEffect, useState} from 'react';
import {
  useGetEventRawMaterial,
  useGetSubevent,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {Route} from '@/routes/_app/_event/events.$id';
import {BiChevronDown, BiChevronUp, BiSave} from 'react-icons/bi';
import {zodResolver} from '@hookform/resolvers/zod';
import {FormProvider, useForm, Controller} from 'react-hook-form';
import {z} from 'zod';
import {useAddRawMaterialRateList} from '@/lib/react-query/queriesAndMutations/cateror/rawmaterialprice';

// Define schema for form validation
const RateCalculatorSchema = z.object({
  subEvents: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      rawMaterial: z.number().min(0, 'Raw material must be positive'),
      labor: z.object({
        cooks: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
        helpers: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
        waiters: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
        femaleWaiters: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
        washers: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
        manpower: z.object({
          count: z.number().min(0, 'Count must be positive'),
          price: z.number().min(0, 'Price must be positive'),
        }),
      }),
      extraCost: z
        .array(
          z.object({
            name: z.string().min(1, 'Name is required'),
            amount: z.number().min(0, 'Price must be positive'),
          }),
        )
        .default([]), // Add default empty array
      perPlatePrice: z.number().min(0, 'Per plate price must be positive'),

      profit: z.number().min(0, 'Profit must be positive'),
    }),
  ),
});

type RateData = z.infer<typeof RateCalculatorSchema>;

const EventRateList = () => {
  const {id: EventId} = Route.useParams();
  const {data: subEvent} = useGetSubevent(EventId);
  const {data: queryData} = useGetEventRawMaterial(EventId);
  const {mutate: rawMaterialRate} = useAddRawMaterialRateList();
  const [savingSubeventId, setSavingSubeventId] = useState<string | null>(null);

  const methods = useForm<RateData>({
    resolver: zodResolver(RateCalculatorSchema),
    defaultValues: {
      subEvents: [],
    },
  });

  const {
    handleSubmit,
    watch,
    setValue,
    formState: {isSubmitting},
    control,
  } = methods;
  const formValues = watch();
  const [collapsedSubevents, setCollapsedSubevents] = useState<
    Record<string, boolean>
  >({});
  const [extraInputs, setExtraInputs] = useState<
    Record<string, {name: string; price: string}>
  >({});

  useEffect(() => {
    if (subEvent?.data?.subEvents) {
      const initialSubEvents = subEvent.data.subEvents.map(
        (subEvent: {id: any; name: any}) => ({
          id: subEvent.id,
          name: subEvent.name,
          rawMaterial: calculateTotalRawMaterial(subEvent.id) || 0, // Set initial raw material value
          labor: {
            cooks: {count: 0, price: 0},
            femaleWaiters: {count: 0, price: 0},
            helpers: {count: 0, price: 0},
            waiters: {count: 0, price: 0},
            washers: {count: 0, price: 0},
            manpower: {count: 0, price: 0},
          },
          extraCost: [], // Initialize as empty array
          perPlatePrice: 0,
          profit: 0,
        }),
      );

      setValue('subEvents', initialSubEvents);
      setCollapsedSubevents(
        subEvent.data.subEvents.reduce(
          (acc: {[x: string]: boolean}, subEvent: {id: string | number}) => {
            acc[subEvent.id] = false;
            return acc;
          },
          {} as Record<string, boolean>,
        ),
      );
      setExtraInputs(
        subEvent.data.subEvents.reduce(
          (acc, subEvent) => {
            acc[subEvent.id] = {name: '', price: ''};
            return acc;
          },
          {} as Record<string, {name: string; price: string}>,
        ),
      );
    }
  }, [subEvent, setValue]);

  useEffect(() => {
    if (queryData?.data?.rateLists && formValues.subEvents.length > 0) {
      const updatedSubEvents = formValues.subEvents.map((subEvent) => {
        // Find the matching rateList for this subevent
        const rateData = queryData.data.rateLists.find(
          (rate: any) => rate.subEventId === subEvent.id,
        );

        if (rateData) {
          // Update the subevent with data from the rateList
          return {
            ...subEvent,
            rawMaterial: rateData.rawMaterialCost || 0,
            labor: {
              cooks: {
                count: rateData.manpower?.cooks || 1,
                price: rateData.salary?.cooks || 0,
              },
              helpers: {
                count: rateData.manpower?.helpers || 1,
                price: rateData.salary?.helpers || 0,
              },
              waiters: {
                count: rateData.manpower?.maleWaiters || 1,
                price: rateData.salary?.maleWaiters || 0,
              },

              femaleWaiters: {
                count: rateData.manpower?.femaleWaiters || 1,
                price: rateData.salary?.femaleWaiters || 0,
              },
              washers: {
                count: rateData.manpower?.washers || 1,
                price: rateData.salary?.washers || 0,
              },
              manpower: {
                count: rateData.manpower?.manpower || 1,
                price: rateData.salary?.manpower || 0,
              },
            },
            extras: rateData.extras || [],
            profit: rateData.profit || 0,
            rawMaterialCost: subEvent.rawMaterial || 0, // Include raw material cost
          };
        }
        return subEvent;
      });

      setValue('subEvents', updatedSubEvents);
    }
  }, [queryData, formValues.subEvents.length, setValue]);

  const calculateLaborTotal = (
    subEventId: string,
    type: keyof RateData['subEvents'][0]['labor'],
  ) => {
    const subEvent = formValues.subEvents.find((se) => se.id === subEventId);
    if (!subEvent) return 0;

    const labor = subEvent.labor[type];
    return labor.count * labor.price;
  };
  const calculateSubtotal = useCallback(
    (subEventId: string) => {
      const subEvent = formValues.subEvents.find((se) => se.id === subEventId);
      if (!subEvent) return 0;

      const laborTotal = (
        Object.keys(subEvent.labor) as Array<
          keyof RateData['subEvents'][0]['labor']
        >
      ).reduce(
        (sum, key) =>
          sum +
          (subEvent.labor[key]?.count || 0) * (subEvent.labor[key]?.price || 0),
        0,
      );

      const extrasTotal =
        subEvent.extraCost?.reduce(
          (sum, extra) => sum + (extra.price || 0),
          0,
        ) || 0;

      return subEvent.rawMaterial + laborTotal + extrasTotal;
    },
    [formValues.subEvents],
  );

  // Uncomment and update the handleRemoveExtra function
  const handleRemoveExtra = (subEventId: string, index: number) => {
    const updatedSubEvents = formValues.subEvents.map((subEvent) => {
      if (subEvent.id === subEventId) {
        const newExtraCost = [...subEvent.extraCost];
        newExtraCost.splice(index, 1);
        return {
          ...subEvent,
          extraCost: newExtraCost,
        };
      }
      return subEvent;
    });

    setValue('subEvents', updatedSubEvents);
  };

  const calculateTotal = (subEventId: string) => {
    const subtotal = calculateSubtotal(subEventId);
    const subEvent = formValues.subEvents.find((se) => se.id === subEventId);
    if (!subEvent) return subtotal;

    const profit = (subtotal * subEvent.profit) / 100;
    return subtotal + profit;
  };

  useEffect(() => {
    if (formValues.subEvents.length > 0) {
      const shouldUpdate = formValues.subEvents.some((subEvent) => {
        const currentTotal = calculateTotal(subEvent.id);
        return subEvent.perPlatePrice !== currentTotal;
      });

      if (shouldUpdate) {
        const updatedSubEvents = formValues.subEvents.map((subEvent) => ({
          ...subEvent,
          perPlatePrice: calculateTotal(subEvent.id),
        }));
        setValue('subEvents', updatedSubEvents, {shouldValidate: true});
      }
    }
  }, [formValues.subEvents, calculateTotal, setValue]);

  const calculateTotalRawMaterial = (subEventId: string) => {
    if (!queryData?.data?.subEventWiseRawMaterials) return 0;

    // Find the subEvent in the subEventWiseRawMaterials
    const subEventData = queryData.data.subEventWiseRawMaterials[subEventId];

    // Return the totalPrice if it exists, otherwise 0
    return subEventData?.totalPrice || 0;
  };

  const handleAddExtra = (subEventId: string) => {
    const extraInput = extraInputs[subEventId];
    if (extraInput.name && extraInput.price) {
      const newExtra = {
        name: extraInput.name,
        price: Number(extraInput.price) || 0,
      };

      const updatedSubEvents = formValues.subEvents.map((subEvent) => {
        if (subEvent.id === subEventId) {
          return {
            ...subEvent,
            extraCost: [...subEvent.extraCost, newExtra], // Add to extraCost array
          };
        }
        return subEvent;
      });

      setValue('subEvents', updatedSubEvents);
      setExtraInputs((prev) => ({
        ...prev,
        [subEventId]: {name: '', price: ''},
      }));
    }
  };

  // Remove extra item from a subevent
  // const handleRemoveExtra = (subEventId: string, index: number) => {
  //   const updatedSubEvents = formValues.subEvents.map((subEvent) => {
  //     if (subEvent.id === subEventId) {
  //       const newExtras = [...subEvent.extras];
  //       newExtras.splice(index, 1);
  //       return {
  //         ...subEvent,
  //         extras: newExtras,
  //       };
  //     }
  //     return subEvent;
  //   });

  //   setValue('subEvents', updatedSubEvents);
  // };

  // Toggle collapse for a subevent
  const toggleCollapse = (subEventId: string) => {
    setCollapsedSubevents((prev) => ({
      ...prev,
      [subEventId]: !prev[subEventId],
    }));
  };

  // Format data for backend submission for a single subevent
  const formatSubeventDataForBackend = (subEvent: RateData['subEvents'][0]) => {
    return {
      subEventId: subEvent.id,
      manpower: {
        maleWaiters: subEvent.labor.waiters.count,
        femaleWaiters: subEvent.labor.femaleWaiters.count, // Fixed: was using waiters.count
        cooks: subEvent.labor.cooks.count,
        washers: subEvent.labor.washers.count,
        helpers: subEvent.labor.helpers.count,
        manpower: subEvent.labor.manpower.count,
      },
      salary: {
        maleWaiters: subEvent.labor.waiters.price,
        femaleWaiters: subEvent.labor.femaleWaiters.price,
        cooks: subEvent.labor.cooks.price,
        washers: subEvent.labor.washers.price,
        helpers: subEvent.labor.helpers.price,
        manpower: subEvent.labor.manpower.price,
      },
      profit: subEvent.profit || 0,
      perPlatePrice: subEvent.perPlatePrice || 0,
      extraCost: subEvent.extraCost.map((item) => ({
        name: item.name,
        amount: item.amount,
      })),
      rawMaterialCost: calculateTotalRawMaterial(subEvent.id),
    };
  };
  // Format data for backend submission for all subevents
  const formatDataForBackend = (data: RateData) => {
    return data.subEvents.map((subEvent) =>
      formatSubeventDataForBackend(subEvent),
    );
  };

  // Save a single subevent
  const saveSubevent = async (subEventId: string) => {
    try {
      setSavingSubeventId(subEventId);

      const subEvent = formValues.subEvents.find((se) => se.id === subEventId);
      if (!subEvent) return;

      const formattedData = formatSubeventDataForBackend(subEvent);
      console.log('Submitting single subevent data:', formattedData);

      // Call the mutation function with all necessary data
      rawMaterialRate({
        subEventId: subEventId,
        manpower: formattedData.manpower,
        salary: formattedData.salary,
        extraCost: formattedData.extraCost,
        profit: formattedData.profit,
        rawMaterialCost: formattedData.rawMaterialCost, // Include raw material
      });
    } catch (error) {
      console.error('Error saving subevent rate list:', error);
    } finally {
      setSavingSubeventId(null);
    }
  };

  // Form submission handler for all subevents
  const onSubmit = async (data: RateData) => {
    try {
      const formattedData = formatDataForBackend(data);
      console.log(
        'Submitting formatted data for all subevents:',
        formattedData,
      );

      // Call the mutation function with the formatted data
      rawMaterialRate({
        eventId: EventId,
        rateLists: formattedData,
      });

      // Show success message
      alert('All rate lists saved successfully!');
    } catch (error) {
      console.error('Error saving rate lists:', error);
      alert('Failed to save rate lists. Please try again.');
    }
  };

  return (
    <FormProvider {...methods}>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="dark:bg-gray-800 space-y-6 rounded-sm bg-transparent"
      >
        <div className="flex flex-col items-center justify-between sm:flex-row">
          <div className="flex w-full items-center bg-gray-2 p-4 dark:bg-meta-4 sm:mb-0">
            <h2 className="text-gray-800 text-2xl font-bold dark:text-white">
              {subEvent?.data?.name || 'Event'} - Rate List
            </h2>
          </div>
        </div>

        {formValues.subEvents.map((subEventForm) => (
          <>
            <div
              key={subEventForm.id}
              className="mb-6 overflow-hidden p-4 shadow-sm"
            >
              {/* Header */}
              <div
                className="border-gray-200 dark:border-gray-600 flex cursor-pointer items-center justify-between bg-gray-2 p-4 dark:bg-meta-4"
                onClick={() => toggleCollapse(subEventForm.id)}
              >
                <h3 className="text-gray-800 text-lg font-bold dark:text-white">
                  {subEventForm.name}
                </h3>

                <div className="flex items-center">
                  <span className="text-gray-800 mr-3 font-semibold dark:text-white">
                    Total: ₹{calculateTotal(subEventForm.id).toFixed(2)}
                  </span>
                  {collapsedSubevents[subEventForm.id] ? (
                    <BiChevronDown
                      className="text-gray-600 dark:text-gray-300"
                      size={24}
                    />
                  ) : (
                    <BiChevronUp
                      className="text-gray-600 dark:text-gray-300"
                      size={24}
                    />
                  )}
                </div>
              </div>

              {!collapsedSubevents[subEventForm.id] && (
                <div className="dark:bg-gray-800 space-y-4 bg-transparent p-5">
                  {/* Raw Material */}
                  {/* Raw Material */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <label className="text-gray-700 dark:text-gray-200 mr-2 font-medium">
                          Raw Material
                        </label>
                        <div className="flex items-center">
                          <span className="text-gray-600 dark:text-gray-300 mr-1">
                            ₹
                          </span>
                          <Controller
                            name={`subEvents.${formValues.subEvents.findIndex((se) => se.id === subEventForm.id)}.rawMaterial`}
                            control={control}
                            render={({field}) => (
                              <input
                                {...field}
                                type="number"
                                value={calculateTotalRawMaterial(
                                  subEventForm.id,
                                )}
                                onChange={(e) =>
                                  field.onChange(Number(e.target.value) || 0)
                                }
                                className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 w-32 rounded border bg-transparent px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                              />
                            )}
                          />
                        </div>
                      </div>
                      <div className="text-gray-600 dark:text-gray-300 text-sm">
                        Total Raw Material: ₹
                        {calculateTotalRawMaterial(subEventForm.id).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Labor */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-sm p-4 shadow-sm">
                    <h3 className="text-gray-700 dark:text-gray-200 mb-4 font-medium">
                      Labor
                    </h3>

                    <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
                      <div className="max-w-full overflow-x-auto">
                        <table className="w-full table-auto text-sm">
                          <thead>
                            <tr className="bg-gray-100 bg-gray-2 text-left dark:bg-meta-4">
                              <th className="border-gray-200 min-w-[150px] px-4 py-3 font-medium text-black dark:border-strokedark dark:text-white">
                                Person
                              </th>
                              <th className="border-gray-200 min-w-[300px] px-4 py-3 font-medium text-black dark:border-strokedark dark:text-white">
                                × Price
                              </th>
                              <th className="border-gray-200 min-w-[100px] px-4 py-3 font-medium text-black dark:border-strokedark dark:text-white">
                                = Total
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {(
                              Object.keys(subEventForm.labor) as Array<
                                keyof RateData['subEvents'][0]['labor']
                              >
                            ).map((type) => (
                              <tr
                                key={type}
                                className="border-b border-[#eee] dark:border-strokedark"
                              >
                                <td className="px-4 py-4 capitalize text-black dark:text-white">
                                  {type}
                                </td>
                                <td className="px-4 py-4">
                                  <div className="flex items-center space-x-2">
                                    <Controller
                                      name={`subEvents.${formValues.subEvents.findIndex((se) => se.id === subEventForm.id)}.labor.${type}.count`}
                                      control={control}
                                      render={({field}) => (
                                        <input
                                          {...field}
                                          type="number"
                                          onChange={(e) =>
                                            field.onChange(
                                              Number(e.target.value) || 0,
                                            )
                                          }
                                          className="w-14 rounded border border-stroke bg-transparent px-2 py-1 text-center dark:border-strokedark dark:bg-form-input dark:text-white"
                                        />
                                      )}
                                    />
                                    <span className="text-black dark:text-white">
                                      ×
                                    </span>
                                    <div className="flex items-center">
                                      <span className="text-gray-600 dark:text-gray-300 mr-1">
                                        ₹
                                      </span>
                                      <Controller
                                        name={`subEvents.${formValues.subEvents.findIndex((se) => se.id === subEventForm.id)}.labor.${type}.price`}
                                        control={control}
                                        render={({field}) => (
                                          <input
                                            {...field}
                                            type="number"
                                            onChange={(e) =>
                                              field.onChange(
                                                Number(e.target.value) || 0,
                                              )
                                            }
                                            className="w-20 rounded border border-stroke bg-transparent px-2 py-1 text-center dark:border-strokedark dark:bg-form-input dark:text-white"
                                          />
                                        )}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="px-4 py-4 text-black dark:text-white">
                                  ₹
                                  {calculateLaborTotal(
                                    subEventForm.id,
                                    type,
                                  ).toFixed(2)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm">
                    <h3 className="text-gray-700 dark:text-gray-200 mb-4 font-medium">
                      Extra Costs
                    </h3>

                    {/* List of existing extras */}
                    {subEventForm.extraCost?.length > 0 && (
                      <div className="mb-4 space-y-2">
                        {subEventForm.extraCost.map((extra, index) => (
                          <div
                            key={index}
                            className="bg-gray-100 dark:bg-gray-600 flex items-center justify-between rounded p-2"
                          >
                            <span className="text-gray-700 dark:text-gray-200">
                              {extra.name}
                            </span>
                            <div className="flex items-center">
                              <span className="text-gray-700 dark:text-gray-200 mr-4">
                                ₹{extra.price.toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  handleRemoveExtra(subEventForm.id, index)
                                }
                                className="text-red-500 hover:text-red-700"
                              >
                                ×
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add new extra form */}
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        placeholder="Extra name"
                        value={extraInputs[subEventForm.id]?.name || ''}
                        onChange={(e) =>
                          setExtraInputs((prev) => ({
                            ...prev,
                            [subEventForm.id]: {
                              ...prev[subEventForm.id],
                              name: e.target.value,
                            },
                          }))
                        }
                        className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 flex-1 rounded border bg-transparent px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <div className="flex items-center">
                        <span className="text-gray-600 dark:text-gray-300 mr-1">
                          ₹
                        </span>
                        <input
                          type="number"
                          placeholder="Amount"
                          value={extraInputs[subEventForm.id]?.price || ''}
                          onChange={(e) =>
                            setExtraInputs((prev) => ({
                              ...prev,
                              [subEventForm.id]: {
                                ...prev[subEventForm.id],
                                price: e.target.value,
                              },
                            }))
                          }
                          className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 w-24 rounded border bg-transparent px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleAddExtra(subEventForm.id)}
                        className="rounded bg-blue-500 px-4 py-2 text-white hover:bg-blue-600"
                      >
                        Add
                      </button>
                    </div>
                  </div>

                  {/* Profit */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <label className="text-gray-700 dark:text-gray-200 mr-2 font-medium">
                          Profit
                        </label>
                        <Controller
                          name={`subEvents.${formValues.subEvents.findIndex((se) => se.id === subEventForm.id)}.profit`}
                          control={control}
                          render={({field}) => (
                            <input
                              {...field}
                              type="number"
                              onChange={(e) =>
                                field.onChange(Number(e.target.value) || 0)
                              }
                              className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 w-20 rounded border bg-transparent px-2 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        />
                        <span className="text-gray-600 dark:text-gray-300 ml-2">
                          %
                        </span>
                      </div>
                      <span className="text-gray-700 dark:text-gray-200 font-medium">
                        ₹
                        {(
                          (calculateSubtotal(subEventForm.id) *
                            subEventForm.profit) /
                          100
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Subevent Total Amount */}
                  <div className="rounded-lg bg-blue-50 p-4 shadow-sm dark:bg-blue-900">
                    <div className="flex items-center justify-between">
                      <label className="text-lg font-bold text-blue-800 dark:text-blue-100">
                        Subevent Total
                      </label>
                      <div className="flex items-center">
                        <span className="text-xl font-bold text-blue-800 dark:text-blue-100">
                          ₹{calculateTotal(subEventForm.id).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="text-gray-700 dark:text-gray-200 font-medium">
                        Per Plate Price
                      </label>
                      <div className="flex items-center">
                        <span className="text-gray-600 dark:text-gray-300 mr-1">
                          ₹
                        </span>
                        <Controller
                          name={`subEvents.${formValues.subEvents.findIndex((se) => se.id === subEventForm.id)}.perPlatePrice`}
                          control={control}
                          render={({field}) => (
                            <input
                              {...field}
                              type="number"
                              value={calculateTotal(subEventForm.id).toFixed(2)}
                              onChange={(e) =>
                                field.onChange(Number(e.target.value) || 0)
                              }
                              className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 w-32 rounded border bg-transparent px-2 py-1 text-right font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                          )}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Save Individual Subevent Button */}
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => saveSubevent(subEventForm.id)}
                      disabled={savingSubeventId === subEventForm.id}
                      className="focus:outline-nonedisabled:opacity-50 flex items-center justify-center gap-2 rounded-md bg-primary px-4 py-2 font-medium text-white shadow-md transition-all duration-200 hover:bg-blue-700"
                    >
                      {savingSubeventId === subEventForm.id ? (
                        <>
                          <svg
                            className="h-4 w-4 animate-spin text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          <span>Saving...</span>
                        </>
                      ) : (
                        <>
                          <BiSave size={18} />
                          <span>Save Subevent</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <div className="my-6 h-4 bg-gray dark:bg-meta-4"></div>
          </>
        ))}
      </form>
    </FormProvider>
  );
};

export default EventRateList;
