/* eslint-disable  */
import {MdDelete, MdExpandMore, MdExpandLess} from 'react-icons/md';
import {FormProvider, useFieldArray, useForm} from 'react-hook-form';
import {z} from 'zod';
import {bulkAddDisposalToEventSchema} from '@/lib/validation/eventSchema';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericButton from '../Forms/Buttons/GenericButton';
import {
  useGetDisposalCategories,
  useGetDisposals,
} from '@/lib/react-query/queriesAndMutations/cateror/disposal';
import {Route} from '@/routes/_app/_event/events.$id';
import {useBulkAddEventDisposal} from '@/lib/react-query/queriesAndMutations/cateror/eventDisposal';
import DisplayEventDisposal from './DisplayEventDisposal';
import {useState, useEffect} from 'react';
import {FiSave} from 'react-icons/fi';

interface Disposal {
  disposalId: string;
  taken: number;
  categoryId: string;
  categoryName?: string;
  disposalName?: string;
}

type FormValues = z.infer<typeof bulkAddDisposalToEventSchema>;

const EventDisposal: React.FC = () => {
  const {id: EventId} = Route.useParams();
  const methods = useForm<FormValues>({
    defaultValues: {
      eventId: EventId,
      disposals: [],
    },
    shouldUnregister: false,
  });

  const {control, reset, setValue, handleSubmit} = methods;
  const {fields} = useFieldArray({
    name: 'disposals',
    control,
  });

  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({});
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>(
    {},
  );
  const [disposalNames, setDisposalNames] = useState<Record<string, string>>(
    {},
  );
  const [isAllExpanded, setIsAllExpanded] = useState(false);

  const {mutate: bulkAddEventDisposal, isPending} = useBulkAddEventDisposal();
  const {data: disposalsData} = useGetDisposals(EventId);
  const {data: disposalCategoriesData} = useGetDisposalCategories();

  // Initialize category names
  useEffect(() => {
    if (disposalCategoriesData?.data.data) {
      const names: Record<string, string> = {};
      disposalCategoriesData.data.data.forEach(
        (category: {id: string; name: string}) => {
          names[category.id] = category.name;
        },
      );
      setCategoryNames(names);

      // Initialize expanded state (all expanded by default)
      const initialExpandedState: Record<string, boolean> = {};
      disposalCategoriesData.data.data.forEach((category: {id: string}) => {
        initialExpandedState[category.id] = true;
      });
      setExpandedCategories(initialExpandedState);
    }
  }, [disposalCategoriesData]);

  // Initialize disposal names
  useEffect(() => {
    if (disposalsData?.data) {
      const names: Record<string, string> = {};
      disposalsData.data.forEach((disposal: {id: string; name: string}) => {
        names[disposal.id] = disposal.name;
      });
      setDisposalNames(names);
    }
  }, [disposalsData]);

  // Initialize form with all disposals
  // Initialize form with all disposals
  useEffect(() => {
    if (disposalsData?.data && disposalCategoriesData?.data.data) {
      const initialDisposals: Disposal[] = disposalsData.data.map(
        (disposal: any) => {
          const savedDisposal = disposal.taken ?? 0; // fallback to 0 if not set
          return {
            categoryId: disposal.categoryId,
            disposalId: disposal.id,
            taken: savedDisposal,
            categoryName: categoryNames[disposal.categoryId],
            disposalName: disposal.name,
          };
        },
      );

      setValue('disposals', initialDisposals);
      console.log('initialDisposals', initialDisposals);
    }
  }, [disposalsData, disposalCategoriesData, categoryNames, setValue]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [categoryId]: !prev[categoryId],
    }));
  };

  const toggleAllCategories = () => {
    const newState = !isAllExpanded;
    setIsAllExpanded(newState);

    if (disposalCategoriesData?.data.data) {
      const updatedState: Record<string, boolean> = {};
      disposalCategoriesData.data.data.forEach((category: {id: string}) => {
        updatedState[category.id] = newState;
      });
      setExpandedCategories(updatedState);
    }
  };

  const onSubmit = (data: FormValues) => {
    const filteredDisposals = data.disposals
      .filter((disposal) => disposal.taken > 0)
      .map((disposal) => ({
        categoryId: disposal.categoryId,
        disposalId: disposal.disposalId,
        taken: Number(disposal.taken),
      }));

    if (filteredDisposals.length === 0) {
      return;
    }

    bulkAddEventDisposal(
      {
        eventId: EventId,
        disposals: filteredDisposals,
      },
      {
        onSuccess: () => {
          reset({eventId: EventId, disposals: []});
        },
        onError: () => {},
      },
    );
  };

  // Group disposals by category
  const groupedDisposals = disposalsData?.data?.reduce(
    (acc: Record<string, any[]>, disposal: any) => {
      if (!acc[disposal.categoryId]) {
        acc[disposal.categoryId] = [];
      }
      acc[disposal.categoryId].push(disposal);
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6 rounded-md">
      <div className="dark:border-strokedar border-stroke p-6 shadow-sm">
        <div className="mb-2 flex items-center justify-between bg-gray-2 p-4 dark:bg-meta-4">
          <h2 className="text-gray-800 text-2xl font-bold dark:text-white">
            Event Disposals
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
              {groupedDisposals &&
                Object.entries(groupedDisposals).map(
                  ([categoryId, categoryDisposals]) => (
                    <div
                      key={categoryId}
                      className="overflow-hidden rounded-lg border border-gray dark:border-strokedark"
                    >
                      <div
                        className="hover:bg-gray-100 dark:hover:bg-gray-700 flex cursor-pointer items-center justify-between bg-gray-2 p-4 transition-colors dark:bg-meta-4"
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
                        <div className="dark:bg-gray-900 p-4">
                          <div className="grid gap-4">
                            {categoryDisposals.map((disposal: any) => {
                              const fieldIndex = fields.findIndex(
                                (f) =>
                                  f.disposalId === disposal.id &&
                                  f.categoryId === categoryId,
                              );

                              return (
                                <div
                                  key={disposal.id}
                                  className="bg-gray-50 dark:bg-gray-800 flex items-center justify-between rounded p-3"
                                >
                                  <span className="text-gray-700 dark:text-gray-300 font-medium">
                                    {disposalNames[disposal.id] ||
                                      disposal.name}
                                  </span>
                                  {fieldIndex !== -1 && (
                                    <div className="w-24">
                                      <GenericInputField
                                        name={`disposals.${fieldIndex}.taken`}
                                        type="number"
                                        min="0"
                                        defaultValue={methods.getValues(
                                          `disposals.${fieldIndex}.taken`,
                                        )}
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
                {isPending ? 'Saving...' : 'Save Disposals'}
              </GenericButton>
            </div>
          </form>
        </FormProvider>
      </div>

      {/* <div className="rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
        <h2 className="text-gray-800 mb-4 text-xl font-bold dark:text-white">
          Current Disposals
        </h2>
        <DisplayEventDisposal />
      </div> */}
    </div>
  );
};

export default EventDisposal;
