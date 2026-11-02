import React, {useState} from 'react';
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import {zodResolver} from '@hookform/resolvers/zod';
import {vendorSchema} from '@/lib/validation/vendorSchema';
import {
  useGetRawMaterialVendor,
  usePostRawMaterialFromVendor,
} from '@/lib/react-query/queriesAndMutations/cateror/external';
import {Route} from '@/routes/_vendorRegister/externalvendor.$name.$id.$eventid';
import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import GenericButton from '@/components/Forms/Buttons/GenericButton';
import GenericInputField from '@/components/Forms/Input/GenericInputField';
import GenericTextArea from '@/components/Forms/TextArea/GenericTextArea';
import DarkModeToggle from './ExVendor/DarkModeToggle';

type FormValues = z.infer<typeof vendorSchema>;
type RawMaterial = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
};

const ExternalVendor: React.FC = () => {
  const paramsData = Route.useParams();
  const {data: rawMaterials} = useGetRawMaterialVendor(paramsData.eventid);
  console.log('External Vendor Data', rawMaterials);

  const {mutate: postRawMaterial} = usePostRawMaterialFromVendor();

  const methods = useForm<FormValues>({
    resolver: zodResolver(vendorSchema),
    defaultValues: {
      fullname: '',
      phoneNumber: '',
      address: '',
    },
  });

  const [prices, setPrices] = useState<{[key: string]: number}>({});

  const handlePriceChange = (id: string, value: number) => {
    setPrices((prev) => ({...prev, [id]: value}));
  };

  const onSubmit = async (data: FormValues) => {
    const formattedData = {
      name: data.fullname,
      phone: data.phoneNumber,
      address: data.address,
      eventId: paramsData.eventid,
      rawMaterials:
        rawMaterials?.vendorData.map((item: RawMaterial) => ({
          rawMaterialId: item.id,
          quantity: item.quantity,
          unit: item.unit,
          price: prices[item.id] ?? (item.price || 0),
        })) ?? [],
    };
    postRawMaterial(formattedData);
    methods.reset();
  };

  const columns: Column<RawMaterial>[] = [
    {header: 'Name', accessor: 'name', sortable: true},
    {header: 'Quantity', accessor: 'quantity', sortable: true},
    {header: 'Unit', accessor: 'unit'},
    {
      header: 'Price',
      accessor: 'price',
      render: (item) => (
        <input
          className="w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
          type="number"
          placeholder="Enter the Price"
          value={prices[item.id] ?? ''}
          onChange={(e) => handlePriceChange(item.id, Number(e.target.value))}
        />
      ),
    },
  ];

  return (
    <div className="relative mx-auto px-4 pt-10 dark:bg-black md:px-6 lg:px-12">
      <DarkModeToggle />
      <FormProvider {...methods}>
        <form className="space-y-8 bg-white p-8 pt-10 dark:bg-black">
          <h1 className="text-lg font-semibold dark:text-white">
            Vendor Details
          </h1>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <GenericInputField
              name="fullname"
              label="Full Name"
              placeholder="Enter your Full Name"
            />
            <GenericInputField
              name="phoneNumber"
              label="Phone Number"
              placeholder="Enter the Phone Number"
            />
          </div>
          <div className="grid grid-cols-1 gap-8">
            <GenericTextArea
              name="address"
              label="Residential Address"
              placeholder="Enter the Residential Address"
            />
          </div>
        </form>
      </FormProvider>
      <div className="mt-10">
        <GenericTable
          data={rawMaterials?.vendorData ?? []}
          columns={columns}
          itemsPerPage={10000}
          title="Raw Materials Rates"
        />
      </div>
      <div className="mt-6 flex justify-end space-x-4 pb-10">
        <GenericButton type="submit" onClick={methods.handleSubmit(onSubmit)}>
          Save
        </GenericButton>
      </div>
    </div>
  );
};

export default ExternalVendor;
