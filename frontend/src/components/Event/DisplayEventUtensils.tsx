import GenericTable, {Column} from '@/components/Forms/Table/GenericTable';
import z from 'zod';
import {eventUtensilSchema} from '@/lib/validation/eventSchema';
import {
  useDeleteEventUtensils,
  useGetEventUtensils,
} from '@/lib/react-query/queriesAndMutations/cateror/eventUtensils';
import {Route} from '@/routes/_app/_event/events.$id';

type EventUtensil = z.infer<typeof eventUtensilSchema> & {
  category: string;
};

const columns: Column<EventUtensil>[] = [
  {header: 'Category', accessor: 'category', sortable: true},
  {header: 'Utensil', accessor: 'utensilId', sortable: true},
  {header: 'Outward', accessor: 'taken', sortable: true},
];

const DisplayEventUtensils: React.FunctionComponent = () => {
  const {id: EventId} = Route.useParams();
  const {data: utensils} = useGetEventUtensils(EventId);
  const {mutate} = useDeleteEventUtensils();

  const mappedUtensils = utensils?.map((utensil) => ({
    ...utensil,
    utensilId: utensil?.utensil.name,
    category: utensil?.utensil?.category?.name,
  }));

  const handleDelete = (item: EventUtensil) => {
    mutate(item?.id);
  };

  return (
    <GenericTable
      data={mappedUtensils || []}
      columns={columns}
      itemsPerPage={20}
      action
      onDelete={handleDelete}
    />
  );
};

export default DisplayEventUtensils;
