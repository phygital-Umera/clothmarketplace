/* eslint-disable */
import React from 'react';
import {useGetSubevent} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {Route} from '@/routes/_app/_event/events.$id';
import SubEventRawMaterialList from './SubEventRawMaterialList';

const RawMaterialList: React.FunctionComponent = () => {
  const {id: EventId} = Route.useParams();
  const {data: subEvent} = useGetSubevent(EventId);

  const subEventResponse =
    subEvent?.data.subEvents?.sort((a: any, b: any) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      const timeA = new Date(a.time).getTime();
      const timeB = new Date(b.time).getTime();

      if (dateA !== dateB) {
        return dateA - dateB; // Sort by date first
      }
      return timeA - timeB; // If dates are same, sort by time
    }) || [];

  return (
    <div>
      {subEventResponse.map((subEvent: any, index: number) => (
        <SubEventRawMaterialList key={index} subEvent={subEvent} />
      ))}
    </div>
  );
};

export default RawMaterialList;
