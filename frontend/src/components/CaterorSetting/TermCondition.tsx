import {zodResolver} from '@hookform/resolvers/zod';
import React, {useState, useEffect} from 'react'; // Added useEffect
import {useForm, FormProvider} from 'react-hook-form';
import {z} from 'zod';
import GenericButton from '../Forms/Buttons/GenericButton';
import GenericInputField from '../Forms/Input/GenericInputField';
import {useAuthContext} from '@/context/AuthContext';
import {
  useAddTermAndCondition,
  useDeleteTerms,
  useGetTerms,
} from '@/lib/react-query/queriesAndMutations/cateror/termcondition';
import GenericTable, {Column} from '../Forms/Table/GenericTable';
import {useNavigate} from '@tanstack/react-router';

type TermAndCondition = {
  id: string;
  caterorId: string;
  terms: string;
};

const termandconditionSchema = z.object({
  terms: z.string().min(1, 'Term & Condition is required'),
  caterorId: z.string().min(1, 'Cateror ID is required'),
});

type FormValues = z.infer<typeof termandconditionSchema>;

const columns: Column<TermAndCondition>[] = [
  {header: 'Terms', accessor: 'terms', sortable: true},
];

const TermCondition = () => {
  const navigate = useNavigate();
  const [termData, setTermData] = useState<TermAndCondition[]>([]); // Renamed from setUtensilsData to setTermData

  const {user} = useAuthContext();
  const id = user?.caterorId ?? '';

  const {mutate: addTermAndCondition} = useAddTermAndCondition();
  const {mutate: deleteTerm} = useDeleteTerms(); // Renamed from deleteUtensil to deleteTerm
  const {data: termsResponse} = useGetTerms(id);

  // Update termData when termsResponse changes
  useEffect(() => {
    if (termsResponse?.data) {
      setTermData(termsResponse.data);
    }
  }, [termsResponse]);

  const methods = useForm<FormValues>({
    resolver: zodResolver(termandconditionSchema),
    defaultValues: {
      terms: '',
      caterorId: id,
    },
  });

  const onSubmit = (data: FormValues) => {
    addTermAndCondition(
      {
        terms: data.terms,
        caterorId: id ?? '',
      },
      {
        onSuccess: () => {
          methods.reset();
          // The table will automatically update because the useGetTerms query will refetch
          // and trigger our useEffect above
        },
      },
    );
  };

  const handleDelete = (item: TermAndCondition) => {
    deleteTerm(item.id, {
      onSuccess: () => {
        // Update local state immediately for a responsive UI
        setTermData((prevData) =>
          prevData.filter((term) => term.id !== item.id),
        );
      },
      onError: (err) => {
        console.error('Error deleting term:', err);
      },
    });
  };

  return (
    <div className="bg-white p-8 dark:bg-black">
      <FormProvider {...methods}>
        <form onSubmit={methods.handleSubmit(onSubmit)} className="space-y-6">
          <h1 className="text-2xl font-semibold">Term & Condition</h1>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-12 md:gap-6">
            <div className="col-span-12 md:col-span-6">
              <GenericInputField
                name="terms"
                label="Term & Condition"
                placeholder="Enter the Term & Condition"
              />
            </div>
          </div>

          <div className="flex justify-end space-x-4 pt-4">
            <GenericButton type="submit">Save</GenericButton>
          </div>
        </form>
      </FormProvider>

      <div className="mt-8">
        <h2 className="mb-4 text-xl font-semibold">
          Current Terms & Conditions
        </h2>
        <GenericTable
          data={termData}
          columns={columns}
          itemsPerPage={5}
          action
          onDelete={handleDelete}
        />
      </div>
    </div>
  );
};

export default TermCondition;
