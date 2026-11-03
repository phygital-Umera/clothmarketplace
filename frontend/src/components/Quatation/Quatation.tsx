/* eslint-disable */
import React, {useCallback, useEffect, useMemo, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {FaChevronDown} from 'react-icons/fa6';
import {date, z} from 'zod';

// Components
import ShowQuotation from '@/components/Quatation/ShowQuatation';
import SubEventBill from '../Event/SubEventBill';
import GenericTable, {Column} from '../Forms/Table/GenericTable';

// Hooks and Queries
import {useAuthContext} from '@/context/AuthContext';
import {useGetClientById} from '@/lib/react-query/queriesAndMutations/cateror/client';
import {
  useGetCaterorById,
  useGetDishes,
} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {
  useCreateExtraCost,
  useDeleteExtraCost,
  useGetExtraCost,
  useGetQuotation,
  useUpdateQuotation,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {useGetQuatation} from '@/lib/react-query/queriesAndMutations/cateror/quatation';

// Schemas and Types
import {createQuotationSchema} from '@/lib/validations/qoutation';
import {Route} from '@/routes/_app/_event/events.$id';
import {time} from 'console';

type FormValues = z.infer<typeof createQuotationSchema>;

interface SubEvent {
  SubEventName: string;
  Dish: string;
  Cost: number;
  People: number;
  Category: string;
  Menu: string;
  total: number;
}

interface Charge {
  id?: string;
  name: string;
  amount: number;
  description: string;
}

const chargeColumns: Column<Charge>[] = [
  {header: 'Charge Name', accessor: 'name', sortable: true},
  {header: 'Amount', accessor: 'amount', sortable: true},
];

const subEventColumns: Column<SubEvent>[] = [
  {header: 'SubEvent Name', accessor: 'SubEventName', sortable: true},
  {header: 'Menu', accessor: 'Menu', sortable: true},
  {header: 'People', accessor: 'People', sortable: true},
  {header: 'Cost', accessor: 'Cost', sortable: true},
  {header: 'Total', accessor: 'total', sortable: true},
];

const PaymentInput: React.FC<{
  label: string;
  value: number;
  onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled?: boolean;
  className?: string;
}> = ({label, value, onChange, disabled = false, className = ''}) => (
  <div className={className}>
    <label className="mb-2.5 block">{label}</label>
    <input
      type="number"
      value={value}
      onChange={onChange}
      disabled={disabled}
      className="w-full rounded border border-stroke bg-transparent px-5 py-3 outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input"
    />
  </div>
);

const Quotation: React.FC = () => {
  const {user} = useAuthContext();

  const {id: eventId} = Route.useParams();
  const [isChargeDropdownOpen, setIsChargeDropdownOpen] = useState(true);
  const [paidAmount, setPaidAmount] = useState(0);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  const formMethods = useForm<Charge>({
    defaultValues: {name: '', amount: 0, description: 'No Description'},
  });

  // Data Fetching
  const {
    data: quotation,
    isLoading: isQuotationLoading,
    refetch,
  } = useGetQuatation(eventId);

  const {data: dishesResponse, isLoading: isDishesLoading} = useGetDishes();
  const {data: caterorData, isLoading: isCaterorLoading} = useGetCaterorById(
    user?.caterorId ?? '',
  );

  const {data: extraCostData, isLoading: isExtraCostLoading} =
    useGetExtraCost(eventId);
  const {data: quotationData, isLoading: isQuotationDataLoading} =
    useGetQuotation(eventId);
  const {data: client, isLoading: isClientLoading} = useGetClientById(
    quotation?.event?.clientId ?? '',
  );

  // Mutations
  const {mutate: createExtraCost, isPending: isExtraCostPending} =
    useCreateExtraCost();
  const {mutateAsync: deleteExtraCost} = useDeleteExtraCost();
  const {mutateAsync: updateQuotation, isPending: isUpdatePending} =
    useUpdateQuotation();

  // Set initial paid amount when data loads
  useEffect(() => {
    if (isInitialLoad && quotationData?.data?.event?.paidAmount !== undefined) {
      setPaidAmount(quotationData.data.event.paidAmount);
      setIsInitialLoad(false);
    }
  }, [quotationData?.data?.event?.paidAmount, isInitialLoad]);

  // Memoized dish name lookup function
  const checkDishName = useCallback(
    (dishId: string) => {
      if (!dishesResponse?.data?.dishes) return 'Unknown Dish';
      const dish = dishesResponse.data.dishes.find(
        (dish: {id: string}) => dish.id === dishId,
      );
      return dish?.name || 'Unknown Dish';
    },
    [dishesResponse?.data?.dishes],
  );

  // Transform quotation data
  const mappedQuotation = useMemo(() => {
    if (
      !quotation?.event?.subEvents ||
      !Array.isArray(quotation.event.subEvents)
    ) {
      return [];
    }

    return quotation.event.subEvents.map((item: any) => ({
      SubEventName: item?.name || 'N/A',
      Category: 'N/A',
      Menu: Array.isArray(item.dishes)
        ? item.dishes.map((dish: any) => checkDishName(dish.dishId)).join(', ')
        : 'N/A',
      Cost: item.expectedCost || 0,
      People: item.expectedPeople || 0,
      total: (item.expectedCost || 0) * (item.expectedPeople || 0),
      date: item.date || 'N/A',
      time: item.time || 'N/A',
      place: item.address || 'N/A',
    }));
  }, [quotation?.event?.subEvents, checkDishName]);

  // Memoize calculated values
  const quotationAmount = useMemo(() => {
    if (
      !quotation?.event?.subEvents ||
      !Array.isArray(quotation.event.subEvents)
    )
      return 0;
    return quotation.event.subEvents.reduce(
      (total: number, subEvent: {expectedCost: any; expectedPeople: any}) => {
        return (
          total + (subEvent.expectedCost || 0) * (subEvent.expectedPeople || 0)
        );
      },
      0,
    );
  }, [quotation?.event?.subEvents]);

  const totalExtraCost = useMemo(() => {
    if (!extraCostData?.data || !Array.isArray(extraCostData.data)) return 0;
    return extraCostData.data.reduce(
      (acc, curr) => acc + (curr.amount || 0),
      0,
    );
  }, [extraCostData?.data]);

  const totalAmount = useMemo(
    () => quotationAmount + totalExtraCost,
    [quotationAmount, totalExtraCost],
  );
  const pendingAmount = useMemo(
    () => totalAmount - paidAmount,
    [totalAmount, paidAmount],
  );

  const handleChargeDelete = useCallback(
    async (charge: Charge) => {
      if (charge.id) await deleteExtraCost(charge.id);
    },
    [deleteExtraCost],
  );

  const handleSubmitCharge = useCallback(
    (data: Charge) => {
      if (!data.name || !data.amount) return;

      createExtraCost({
        EventId: eventId,
        name: data.name,
        amount: Number(data.amount),
        description: data.description || 'No Description',
      });
      formMethods.reset();
    },
    [createExtraCost, eventId, formMethods],
  );

  const handleSaveQuotation = useCallback(() => {
    updateQuotation({
      eventId,
      finalAmount: totalAmount,
      paidAmount,
      quotationAmount,
    });
  }, [eventId, paidAmount, quotationAmount, totalAmount, updateQuotation]);

  const ClientDetails = () => (
    <div className="p-4 dark:border-form-strokedark dark:text-white">
      <h1 className="bg-gray-2 p-4 text-xl font-semibold dark:bg-meta-4">
        Quotation
      </h1>
      <h2 className="mt-4 font-bold">Client Details</h2>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <p>Client Name: {client?.user?.fullname || 'N/A'}</p>
        <p>Primary Phone: {client?.user?.phoneNumber || 'N/A'}</p>
        <p>Secondary Phone: {client?.user?.secondaryPhoneNumber || 'N/A'}</p>
        <p>Address: {client?.address || 'N/A'}</p>
      </div>
    </div>
  );

  if (
    isQuotationLoading ||
    isDishesLoading ||
    isCaterorLoading ||
    isClientLoading
  ) {
    return <div>Loading...</div>;
  }

  return (
    <div className="">
      {/* <header className="mb-6 flex flex-col items-center justify-between sm:flex-row">
        <h1 className="bg-gray-2 text-2xl font-semibold text-primary dark:bg-meta-4 sm:text-3xl">
          Quotation
        </h1>
      </header> */}

      <ClientDetails />
      <SubEventBill data={quotation} refetch={refetch} />

      {/* <section className="mt-2 bg-white p-4 font-medium dark:border-form-strokedark dark:bg-form-input dark:text-white">
        <button
          className="mb-3 flex w-full cursor-pointer items-center justify-between"
          onClick={() => setIsChargeDropdownOpen(!isChargeDropdownOpen)}
          aria-expanded={isChargeDropdownOpen}
          type="button"
        >
          <span>Additional Charges</span>
          <FaChevronDown
            className={`transition-transform ${isChargeDropdownOpen ? 'rotate-180' : ''}`}
          />
        </button>

        {isChargeDropdownOpen && (
          <FormProvider {...formMethods}>
            <form
              onSubmit={formMethods.handleSubmit(handleSubmitCharge)}
              className="space-y-8 bg-white p-4 dark:bg-black sm:p-10"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
                <div className="col-span-12 md:col-span-6">
                  <GenericInputField
                    name="name"
                    label="Charge Name"
                    placeholder="Enter Charge Name"
                  />
                </div>
                <div className="col-span-12 md:col-span-4">
                  <GenericInputField
                    name="amount"
                    label="Amount"
                    placeholder="Enter Charge Amount"
                    type="number"
                  />
                </div>
              </div>
              <div className="mt-4">
                <GenericButton type="submit">
                  {isExtraCostPending ? 'Save....' : 'Save Charges'}
                </GenericButton>
              </div>
            </form>
          </FormProvider>
        )}
      </section> */}

      {/* <div className="col-span-8 mb-2 mt-2">
        <GenericTable
          data={extraCostData?.data || []}
          columns={chargeColumns}
          action
          onDelete={handleChargeDelete}
        />
      </div> */}

      {/* <section className="bg-white dark:bg-black">
        <div className="w-full rounded-lg bg-white p-4 dark:bg-black sm:p-6">
          <div className="flex w-full flex-col gap-4 md:flex-row">
            <PaymentInput
              label="Quotation Cost"
              value={quotationAmount}
              disabled
              className="w-full md:w-1/3"
            />
            <PaymentInput
              label="Additional Amount"
              value={totalExtraCost}
              disabled
              className="w-full md:w-1/3"
            />
            <PaymentInput
              label="Total Amount"
              value={totalAmount}
              disabled
              className="w-full md:w-1/3"
            />
          </div>

          <div className="mt-4 flex w-full flex-col gap-4 md:flex-row">
            <PaymentInput
              label="Paid Amount"
              value={paidAmount}
              onChange={(e) => setPaidAmount(Number(e.target.value))}
              className="w-full md:w-1/2"
            />
            <PaymentInput
              label="Pending Amount"
              value={pendingAmount}
              disabled
              className="w-full md:w-1/2"
            />
          </div>

          <GenericButton
            onClick={handleSaveQuotation}
            className="hover:bg-primary-dark mt-5 w-full bg-primary p-3 text-white"
            disabled={isUpdatePending}
          >
            {isUpdatePending ? 'Saving...' : 'Save Quotation'}
          </GenericButton>
        </div>
      </section> */}

      <div className="mt-20">
        <h1 className="mb-4 bg-gray-2 p-4 text-4xl font-bold dark:bg-meta-4 dark:text-white">
          Quotation Details
        </h1>
        <ShowQuotation
          image={
            caterorData?.data?.image || '/src/assets/images/logo/Menubook.png'
          }
          totalAmount={totalAmount}
          pendingAmount={pendingAmount}
          paidAmount={paidAmount} // Add this
          mappedQuatation={mappedQuotation}
          eventData={quotationData?.data?.event}
          totalExtraCost={totalExtraCost}
          charges={extraCostData?.data || []}
        />
      </div>
    </div>
  );
};

export default Quotation;
