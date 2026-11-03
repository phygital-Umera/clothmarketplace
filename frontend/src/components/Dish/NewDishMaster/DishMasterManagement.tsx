import React, {useState} from 'react';
import MultipleDishAdd from './MultipleDishAdd';
import NewDishMaster from './NewDishMaster';
// import SingleDishAdd from './SingleDishAdd'; // Uncomment when you create this

const DishMasterManagement = () => {
  const [activeTab, setActiveTab] = useState<'single' | 'multiple'>('single');

  return (
    <div className="rounded bg-white p-4 shadow dark:bg-black">
      <div className="mb-4 flex border-b border-stroke dark:border-strokedark">
        <button
          className={`px-6 py-2 font-medium transition-colors ${
            activeTab === 'single'
              ? 'border-b-2 border-primary text-primary dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('single')}
        >
          Single Dish
        </button>
        <button
          className={`px-6 py-2 font-medium transition-colors ${
            activeTab === 'multiple'
              ? 'border-b-2 border-primary text-primary dark:text-white'
              : 'text-gray-500 dark:text-gray-400'
          }`}
          onClick={() => setActiveTab('multiple')}
        >
          Multiple Dish
        </button>
      </div>

      <div className="mt-4">
        {activeTab === 'single' ? (
          <div>
            {/* Replace below with your actual SingleDishAdd component */}
            <NewDishMaster />
          </div>
        ) : (
          <MultipleDishAdd />
        )}
      </div>
    </div>
  );
};

export default DishMasterManagement;
