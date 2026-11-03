import {useAuthContext} from '@/context/AuthContext';
import {useInvoice} from '@/context/InvoiceContext';
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
import {createQuotationSchema} from '@/lib/validations/qoutation';
import {Route} from '@/routes/_app/_event/events.$id';
import 'jspdf-autotable';
import React, {useEffect, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import {FaChevronDown} from 'react-icons/fa6';
import {z} from 'zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import ShowBill from './ShowBill';
import {SubEventBill} from './SubEventBill';

type FormValues = z.infer<typeof createQuotationSchema>;

type SubEvent = {
  SubEventName: string;
  Dish: string;
  Cost: number;
  People: number;
  Category: string;
  Menu: string;
};

type Charges = {
  id: string;
  name: string;
  amount: number;
  description: string;
};

const chargeColumns: Column<Charges>[] = [
  {header: 'Charge Name', accessor: 'name', sortable: true},
  {header: 'Amount', accessor: 'amount', sortable: true},
];

const Bill: React.FC = () => {
  const [openMoreChargeDropDown, setOpenMoreChargeDropdown] =
    useState<boolean>(true);
  const [charges, setCharges] = useState<Charges[]>([]);
  const [quotationAmount, setQuotationAmount] = useState<number>(0);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [pendingAmount, setPendingAmount] = useState<number>(0);
  const [totalAmount, setTotalAmount] = useState<number>(0);
  const [totalExtraCost, setTotalExtraCost] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const methods = useForm<Charges>({
    defaultValues: {description: 'No Description'},
  });

  const {user} = useAuthContext();
  const {id: EventId} = Route.useParams();
  const {data: quatation, refetch} = useGetQuatation(EventId);
  console.log(quatation);

  const {data: dishesResponse} = useGetDishes();
  const {data: caterorData} = useGetCaterorById(user?.caterorId ?? '');
  const {mutate: ExtraCost} = useCreateExtraCost();
  const {data: ExtracostData, isSuccess} = useGetExtraCost(EventId);
  const {mutateAsync: DeleteExtraCost} = useDeleteExtraCost();
  const {data: QuotationData, isSuccess: isQuotationSuccess} =
    useGetQuotation(EventId);
  const {mutateAsync: updateQuotation, isPending: isUpdating} =
    useUpdateQuotation();
  const {invoices} = useInvoice();

  const matchedInvoice = invoices.find(
    (invoice) => invoice.eventId === EventId,
  );

  useEffect(() => {
    if (QuotationData) {
      setQuotationAmount(QuotationData?.data?.event?.quotationAmount);
      setPaidAmount(QuotationData?.data?.event?.paidAmount);
    }
  }, [QuotationData, isQuotationSuccess, isSuccess, totalExtraCost]);

  useEffect(() => {
    const totalCalculatedAmount =
      QuotationData?.data?.event?.quotationAmount +
      totalExtraCost -
      discountAmount;
    setTotalAmount(totalCalculatedAmount);
  }, [
    QuotationData,
    isQuotationSuccess,
    isSuccess,
    totalExtraCost,
    discountAmount,
  ]);

  useEffect(() => {
    const totalCalculatedAmount =
      totalAmount - QuotationData?.data?.event?.paidAmount;
    setPendingAmount(totalCalculatedAmount);
  }, [
    QuotationData,
    isQuotationSuccess,
    isSuccess,
    totalExtraCost,
    totalAmount,
  ]);

  useEffect(() => {
    if (isSuccess && ExtracostData.data.length > 0) {
      setCharges(ExtracostData?.data);
    }
    const formattedExtracostTotal = ExtracostData?.data.reduce(
      (prev: number, current: {amount: number}) => prev + current.amount,
      0,
    );
    setTotalExtraCost(formattedExtracostTotal);
  }, [isSuccess, ExtracostData]);

  const checkDishName = (dishId: string) => {
    return (
      dishesResponse?.data?.dishes?.find(
        (dish: {id: string}) => dish.id === dishId,
      )?.name || 'Unknown Dish'
    );
  };

  const mappedQuatation =
    quatation?.event?.subEvents?.map(
      (item: {
        name: string;
        dishes: Array<{dishId: string}>;
        expectedCost: number;
        expectedPeople: number;
        actualPeople: number;
      }) => ({
        SubEventName: item.name,
        Category: 'N/A',
        Menu:
          item.dishes
            ?.map((dish: {dishId: string}) => checkDishName(dish.dishId))
            .join(', ') || 'N/A',
        Cost: item.expectedCost,
        People: item.expectedPeople,
        ActualPeople: item.actualPeople,
      }),
    ) || [];

  const {data: client} = useGetClientById(quatation?.event?.clientId);

  const handleDelete = (item: Charges & {id: string}) => {
    DeleteExtraCost(item.id);
  };

  const onSubmit = (data: FormValues) => {
    ExtraCost({
      EventId: EventId,
      name: data.name,
      amount: data.amount,
      description: data.description || 'No Description',
    });
  };

  return (
    <>
      <div className="dark:text-white">
        <div className="mb-6 flex items-center justify-between bg-gray-2 p-4 text-xl font-bold dark:bg-meta-4">
          <h1 className="font-semibold">Bill</h1>
        </div>
        <h2 className="font-bold">Client Details</h2>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <p>Invoice Number: {matchedInvoice?.invoiceNo}</p>
          <p>
            Client Name: {client?.user?.fullname || 'Client Name Unavailable'}
          </p>
          <p>
            Primary Phone: {client?.user?.phoneNumber || 'No Phone Provided'}
          </p>
          <p>
            Secondary Phone:{' '}
            {client?.user?.secondaryPhoneNumber || 'No Phone Provided'}
          </p>
          <p>Address: {client?.address || 'No Address Provided'}</p>
        </div>
      </div>

      <SubEventBill data={quatation} refetch={refetch} />

      <div className="mt-2 p-4 font-medium dark:text-white">
        <div
          className="flex justify-between bg-gray-2 p-4 text-xl font-bold dark:bg-meta-4"
          onClick={() => setOpenMoreChargeDropdown((prev) => !prev)}
        >
          <p>Add More Charge</p>
          <FaChevronDown />
        </div>
        {openMoreChargeDropDown && (
          <FormProvider {...methods}>
            <form
              onSubmit={methods.handleSubmit(onSubmit)}
              className="mt-3 space-y-4 p-8"
            >
              <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
                <div className="col-span-12 md:col-span-4">
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
                    placeholder="Enter charge Amount"
                  />
                </div>
              </div>
              <div className="mt-4">
                <GenericButton type="submit">{'Add More Charge'}</GenericButton>
              </div>
            </form>
          </FormProvider>
        )}
      </div>

      <div className="col-span-8 mt-2">
        <GenericTable
          data={charges}
          columns={chargeColumns}
          searchAble={false}
          action
          onDelete={handleDelete}
        />
      </div>

      <div className="mt-2 flex items-center justify-center p-4">
        <div className="mr-2 w-[50%]">
          <label className="mb-2.5 block text-black dark:text-white">
            Discount Amount
          </label>
          <input
            type="number"
            value={discountAmount}
            onChange={(e) => setDiscountAmount(parseFloat(e.target.value))}
            className="w-full rounded border-[1.7px] border-stroke bg-transparent px-2 py-1 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary dark:disabled:bg-black"
          />
        </div>
        <div className="ml-2 w-[50%]">
          <label className="mb-2.5 block text-black dark:text-white">
            Total ExtraCost
          </label>
          <input
            type="number"
            value={totalExtraCost}
            onChange={(e) => setTotalExtraCost(parseFloat(e.target.value))}
            className="w-full rounded border-[1.7px] border-stroke bg-transparent px-2 py-1 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary dark:disabled:bg-black"
            disabled
          />
        </div>
      </div>
      <div className="mt-4 flex justify-end">
        <GenericButton
          onClick={() => {
            updateQuotation({
              eventId: EventId,
              quotationAmount: quotationAmount,
              finalAmount: totalAmount,
              paidAmount: paidAmount,
              balance: pendingAmount,
            }).catch((error) => {
              // Error handling is already done in the mutation, so this is just to prevent unhandled promise rejection
              console.error(error);
            });
          }}
          disabled={isUpdating}
        >
          {isUpdating ? 'Saving...' : 'Save Quotation'}
        </GenericButton>
      </div>

      <div className="mt-4">
        {QuotationData && (
          <ShowBill
            image={
              caterorData?.data?.image || '/src/assets/images/logo/Menubook.png'
            }
            mappedQuatation={mappedQuatation}
            eventData={QuotationData?.data.event}
            totalAmount={totalAmount}
            discountAmount={discountAmount} // This prop updates ShowBill
            invoices={matchedInvoice?.invoiceNo || 'N/A'}
            totalExtraCost={totalExtraCost}
            refetch={refetch}
          />
        )}
      </div>
    </>
  );
};

export default Bill;
