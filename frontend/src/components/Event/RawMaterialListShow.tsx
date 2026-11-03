/*  eslint-disable @typescript-eslint/no-explicit-any */

import {useGetSubevent} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {Route} from '@/routes/_app/_event/events.$id';
import React from 'react';
import SubEventRawMaterialListShow from './SubEventRawMaterialListShow';

const RawMaterialListShow: React.FunctionComponent = () => {
  const {id: EventId} = Route.useParams();
  const {data: subEvent} = useGetSubevent(EventId);
  const subEventResponse = subEvent?.data.subEvents || [];

  return (
    <div>
      {subEventResponse.map((subEvent: any, index: number) => (
        <SubEventRawMaterialListShow key={index} subEvent={subEvent} />
      ))}
    </div>
  );
};

export default RawMaterialListShow;
