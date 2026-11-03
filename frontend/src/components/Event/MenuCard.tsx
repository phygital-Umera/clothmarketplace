import React from 'react';
import {Route} from '@/routes/_app/menucard.$id';
import {useGetSubeventById} from '@/lib/react-query/queriesAndMutations/cateror/event';

const MenuCard: React.FunctionComponent = () => {
  const {id} = Route.useParams();
  const {data: subEvent} = useGetSubeventById(id);
  console.log(subEvent?.data);

  return <div>MenuCardsss</div>;
};

export default MenuCard;
