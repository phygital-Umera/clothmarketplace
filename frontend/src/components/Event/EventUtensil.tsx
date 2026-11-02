/* eslint-disable  */

import React, {useEffect, useState} from 'react';
import {MdExpandMore, MdExpandLess} from 'react-icons/md';
import {FormProvider, useFieldArray, useForm, useWatch} from 'react-hook-form';
import {z} from 'zod';
import {bulkAddUtensilToEventSchema} from '@/lib/validation/eventSchema';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {
  useBulkAddEventUtensils,
  useGetEventUtensils,
} from '@/lib/react-query/queriesAndMutations/cateror/eventUtensils';
import {Route} from '@/routes/_app/_event/events.$id';
import {
  useGetUtensilCategories,
  useGetUtensils,
} from '@/lib/react-query/queriesAndMutations/cateror/utensils';
import DisplayEventUtensils from './DisplayEventUtensils';
import {FiSave} from 'react-icons/fi';

interface Utensil {
  utensilId: string;
  taken: number;
  categoryId: string;
  categoryName?: string;
  utensilName?: string;
}

type FormValues = z.infer<typeof bulkAddUtensilToEventSchema>;

const EventUtensil: React.FunctionComponent = () => {
  const methods = useForm<FormValues>({
    defaultValues: {
      eventId: '',
      utensils: [],
    },
    shouldUnregister: false,
  });

  const {control, reset, setValue, handleSubmit} = methods;
  const {fields} = useFieldArray({
    name: 'utensils',
    control,
  });

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>(
    {},
  );
  const [utensilNames, setUtensilNames] = useState<Record<string, string>>({});
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  const languageId = localStorage.getItem('languageId');
  const {id: EventId} = Route.useParams();
  const {mutate: bulkAddEventUtensils, isPending} = useBulkAddEventUtensils();
  const {data: utensils} = useGetUtensils(languageId || '');
  const {data: utensilsData} = useGetUtensilCategories();
  const {data: eventUtensils} = useGetEventUtensils(EventId);

  // Initialize category names and utensil names
  useEffect(() => {
    if (utensilsData?.data) {
      const names: Record<string, string> = {};
      utensilsData.data.forEach((category: {id: string; name: string}) => {
        names[category.id] = category.name;
      });
      setCategoryNames(names);

      const initialExpandedState: Record<string, boolean> = {};
      utensilsData.data.forEach((category: {id: string}) => {
        initialExpandedState[category.id] = true; // Start with all categories expanded
      });
      setExpandedCategories(initialExpandedState);
    }
  }, [utensilsData]);

  // Initialize utensil names
  useEffect(() => {
    if (utensils?.data) {
      const names: Record<string, string> = {};
      utensils.data.forEach((utensil: {id: string; name: string}) => {
        names[utensil.id] = utensil.name;
      });
      setUtensilNames(names);
    }
  }, [utensils]);

  // Initialize form with all utensils and existing quantities
  useEffect(() => {
    if (utensils?.data && utensilsData?.data) {
      const initialUtensils: Utensil[] = utensils.data.map((utensil: any) => {
        // Find if this utensil already exists in event
        const existingUtensil = eventUtensils?.find(
          (eu) => eu.utensilId === utensil.id,
        );

        return {
          categoryId: utensil.categoryId,
          utensilId: utensil.id,
          taken: existingUtensil ? existingUtensil.taken : 0,
          categoryName: categoryNames[utensil.categoryId],
          utensilName: utensil.name,
        };
      });

      setValue('utensils', initialUtensils);
    }
  }, [utensils, utensilsData, categoryNames, setValue, eventUtensils]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const toggleAllCategories = () => {
    const newState = !isAllExpanded;
    setIsAllExpanded(newState);

    if (utensilsData?.data) {
      const updatedState: Record<string, boolean> = {};
      utensilsData.data.forEach((category: {id: string}) => {
        updatedState[category.id] = newState;
      });
      setExpandedCategories(updatedState);
    }
  };

  const onSubmit = (data: FormValues) => {
    const filteredUtensils = data.utensils
      .filter((utensil) => utensil.taken > 0)
      .map((utensil) => ({
        categoryId: utensil.categoryId,
        utensilId: utensil.utensilId,
        taken: Number(utensil.taken),
      }));

    if (filteredUtensils.length === 0) {
      return;
    }

    bulkAddEventUtensils(
      {
        eventId: EventId,
        utensils: filteredUtensils,
      },
      {
        onSuccess: () => {
          const updatedUtensils = methods
            .getValues('utensils')
            .map((utensil) => {
              const updated = filteredUtensils.find(
                (u) => u.utensilId === utensil.utensilId,
              );
              return updated ? {...utensil, taken: updated.taken} : utensil;
            });
          setValue('utensils', updatedUtensils);
        },
        onError: () => {},
      },
    );
  };

  // Group utensils by category
  const groupedUtensils = utensils?.data?.reduce(
    (acc: Record<string, any[]>, utensil: any) => {
      if (!acc[utensil.categoryId]) {
        acc[utensil.categoryId] = [];
      }
      acc[utensil.categoryId].push(utensil);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      <div className="rounded-md bg-transparent p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between bg-gray-2 p-4 dark:bg-meta-4">
          <h2 className="text-gray-800 text-2xl font-bold dark:text-white">
            Event Utensils
          </h2>
          <button
            onClick={toggleAllCategories}
            className="text-sm text-primary hover:underline"
          >
            {isAllExpanded ? 'Collapse All' : 'Expand All'}
          </button>
        </div>

        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-6">
              {groupedUtensils &&
                Object.entries(groupedUtensils).map(
                  ([categoryId, categoryUtensils]) => (
                    <div
                      key={categoryId}
                      className="overflow-hidden rounded-md border border-gray dark:border-strokedark"
                    >
                      <div
                        className="bg-gray-50 hover:bg-gray-100 dark:hover:bg-gray-700 flex cursor-pointer items-center justify-between bg-gray-2 p-4 transition-colors dark:bg-meta-4"
                        onClick={() => toggleCategory(categoryId)}
                      >
                        <h3 className="text-gray-800 text-lg font-semibold dark:text-white">
                          {categoryNames[categoryId] || 'Uncategorized'}
                        </h3>
                        {expandedCategories[categoryId] ? (
                          <MdExpandLess size={24} className="text-gray-500" />
                        ) : (
                          <MdExpandMore size={24} className="text-gray-500" />
                        )}
                      </div>

                      {expandedCategories[categoryId] && (
                        <div className="dark:bg-gray-900 bg-transparent p-4">
                          <div className="grid gap-4">
                            {categoryUtensils.map((utensil: any) => {
                              const fieldIndex = fields.findIndex(
                                (f) =>
                                  f.utensilId === utensil.id &&
                                  f.categoryId === categoryId,
                              );

                              return (
                                <div
                                  key={utensil.id}
                                  className="bg-gray-50 dark:bg-gray-800 flex items-center justify-between rounded p-3"
                                >
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {utensilNames[utensil.id] || utensil.name}
                                  </span>
                                  {fieldIndex !== -1 && (
                                    <div className="w-24">
                                      <GenericInputField
                                        name={`utensils.${fieldIndex}.taken`}
                                        type="number"
                                        min="0"
                                        defaultValue={
                                          methods.getValues(
                                            `utensils.${fieldIndex}.taken`,
                                          ) || 0
                                        }
                                        className="border-gray-300 dark:border-gray-600 dark:bg-gray-800 text-gray-800 w-full rounded border bg-white px-3 py-2 text-right dark:text-white"
                                      />
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ),
                )}
            </div>

            <div className="mt-6 flex justify-end">
              <GenericButton
                type="submit"
                disabled={isPending}
                className="hover:bg-primary-dark flex items-center gap-2 rounded-lg bg-primary px-6 py-3 text-white shadow-sm transition-colors"
              >
                <FiSave />
                {isPending ? 'Saving...' : 'Save Utensils'}
              </GenericButton>
            </div>
          </form>
        </FormProvider>
      </div>

      {/* <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
        <h2 className="text-gray-800 mb-4 text-xl font-bold dark:text-white">
          Current Utensils
        </h2>
        <DisplayEventUtensils />
      </div> */}
    </div>
  );
};

export default EventUtensil;
