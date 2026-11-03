import React, {useEffect, useState} from 'react';
import SubEvent from './SubEvent';
import Bill from './Bill';
import AfterEvent from './AfterEvent';
import RawMaterialList from './RawMaterialList';
import Quotation from '../Quatation/Quatation';
import IncomeExpenditure from '../IncomeExpenditure/IncomeExpenditure';
import DisplayIncomeExpense from '../IncomeExpenditure/DisplayIncomeExpense';
import {IncomeExpense} from '@/types';
import EventUtensilsDisposal from './EventUtensilsDisposal';
import EventRateList from './EventRateList';
import DisplayAllDishProcess from './DisplayAllDishProcess';
import RawMaterialOrder from './RawMaterialOrder';

const EventManagement: React.FC = () => {
  const [activeStep, setActiveStep] = useState(
    parseInt(window.sessionStorage.getItem('activeStep') || '0', 10),
  );

  useEffect(() => {
    window.sessionStorage.setItem('activeStep', activeStep.toString());
  }, [activeStep]);

  // Steps Array
  const steps = [
    'Sub Event',
    'Event Rate List',
    'Quotation',
    'Raw Material Calculator',
    'Raw Material Order',
    'Dish Process',
    'Event Utensils',
    'After Event',
    'Bill',
    'Event Income Expense',
  ];

  // Step click handler
  const handleStepClick = (index: number) => {
    setActiveStep(index);
  };

  // Render content based on active step
  const renderStepContent = () => {
    switch (activeStep) {
      case 0:
        return <SubEvent />;
      case 1:
        return <EventRateList />;
      case 2:
        return <Quotation />;
      case 3:
        return <RawMaterialList />;
      case 4:
        return <RawMaterialOrder />;
      case 5:
        return <DisplayAllDishProcess />;
      case 6:
        return <EventUtensilsDisposal />;
      case 7:
        return <AfterEvent />;
      case 8:
        return <Bill />;
      case 9:
        return (
          <div>
            <IncomeExpenditure />
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <DisplayIncomeExpense status={IncomeExpense.Income} />
              <DisplayIncomeExpense status={IncomeExpense.Recivable} />
              <DisplayIncomeExpense status={IncomeExpense.Expense} />
              <DisplayIncomeExpense status={IncomeExpense.Payable} />
            </div>
          </div>
        );
      default:
        return <div>Step not found</div>;
    }
  };

  return (
    <div className="mx-auto w-full px-4">
      {/* Redesigned Stepper - Text only with horizontal scrolling on mobile */}
      <div className="scrollbar-hide overflow-x-auto">
        <div className="flex w-full min-w-max flex-wrap sm:flex-nowrap">
          {steps.map((step, index) => (
            <button
              key={index}
              onClick={() => handleStepClick(index)}
              className={`whitespace-nowrap border-b-2 px-3 py-3 text-sm transition-all duration-300 hover:bg-blue-50 hover:text-blue-700 sm:text-base ${
                activeStep === index
                  ? 'border-blue-600 bg-blue-100 font-medium text-blue-600 dark:border-blue-500 dark:bg-blue-900/30 dark:text-blue-400'
                  : 'text-gray-500 hover:border-gray-300 dark:text-gray-400 border-transparent'
              } ${index === 0 ? 'rounded-tl-lg' : ''} ${
                index === steps.length - 1 ? 'rounded-tr-lg' : ''
              }`}
            >
              {step}
            </button>
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="mb-6 overflow-auto rounded-lg bg-white p-4 shadow-sm dark:bg-boxdark">
        {renderStepContent()}
      </div>
    </div>
  );
};

export default EventManagement;
