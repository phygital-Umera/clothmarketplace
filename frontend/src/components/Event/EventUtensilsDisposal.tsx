import EventUtensilPage from '@/pages/EventUtensilPage';
import React, {useState} from 'react';
import EventDisposal from './EventDisposal';

const EventUtensilsDisposal = () => {
  const [activeComponent, setActiveComponent] = useState('EventUtensil');

  return (
    <div className="border-b border-[#eee] px-4 py-5 dark:border-strokedark">
      <div className="mb-4 flex flex-col sm:flex-row sm:justify-center sm:space-x-4">
        <button
          className={`flex-1 rounded px-4 py-2 text-sm sm:flex-none sm:text-base ${
            activeComponent === 'EventUtensil'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
          onClick={() => setActiveComponent('EventUtensil')}
        >
          Event Utensils
        </button>
        <button
          className={`flex-1 rounded px-4 py-2 text-sm sm:flex-none sm:text-base ${
            activeComponent === 'EventDisposal'
              ? 'bg-blue-500 text-white'
              : 'bg-gray-300 text-gray-700 hover:bg-gray-400'
          }`}
          onClick={() => setActiveComponent('EventDisposal')}
        >
          Event Disposal
        </button>
      </div>

      <div className="sm:p-6">
        {activeComponent === 'EventUtensil' && <EventUtensilPage />}
        {activeComponent === 'EventDisposal' && <EventDisposal />}
      </div>
    </div>
  );
};

export default EventUtensilsDisposal;
