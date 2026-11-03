import React from 'react';
import EventPeopleCheck from './AfterEvent/EventPeopleCheck';
import UtensilChecking from './AfterEvent/UtensilChecking';
import WastageReport from './AfterEvent/WastageReport';
import RawMaterialReturn from './AfterEvent/RawMaterialReturn';
import EventDisposals from './AfterEvent/EventDisposals';

const AfterEvent: React.FC = () => {
  return (
    <div className="">
      <h1 className="mb-4 bg-gray-2 p-4 text-xl font-bold dark:bg-meta-4">
        After Event
      </h1>

      <EventPeopleCheck />

      <div>
        <WastageReport />
      </div>

      <RawMaterialReturn />

      <UtensilChecking />
      {/* <EventDisposals /> */}
    </div>
  );
};

export default AfterEvent;
