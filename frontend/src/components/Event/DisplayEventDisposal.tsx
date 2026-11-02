import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import z from 'zod';
import {eventUtensilSchema} from '@/lib/validation/eventSchema';
import {
  useDeleteEventUtensils,
  useGetEventUtensils,
} from '@/lib/react-query/queriesAndMutations/cateror/eventUtensils';
import {Route} from '@/routes/_app/_event/events.$id';
import {
  useDeleteEventDisposal,
  useGetEventDisposal,
} from '@/lib/react-query/queriesAndMutations/cateror/eventDisposal';

type EventUtensil = z.infer<typeof eventUtensilSchema> & {
  category: string;
};

const columns: Column<EventUtensil>[] = [
  {header: 'Category', accessor: 'category', sortable: true},
  {header: 'Utensil', accessor: 'utensilId', sortable: true},
  {header: 'Outward', accessor: 'taken', sortable: true},
];

const DisplayEventDisposal: React.FunctionComponent = () => {
  const {id: EventId} = Route.useParams();
  const {data: eventDisposals} = useGetEventDisposal(EventId);
  console.log(eventDisposals);
  // const {data: utensils} = useGetEventUtensils(EventId);
  // console.log(utensils);

  const {mutate} = useDeleteEventDisposal();

  const mappedDisposals = eventDisposals?.map((disposal) => ({
    ...disposal,
    utensilId: disposal?.name, // Assuming 'name' is the utensil name
    category: disposal?.category?.name,
  }));

  // const handleDelete = (item: EventUtensil) => {
  //   mutate(item?.id);
  // };

  return (
    <GenericTable
      data={mappedDisposals || []}
      columns={columns}
      itemsPerPage={20}
      // action
      // onDelete={handleDelete}
    />
  );
};

export default DisplayEventDisposal;
