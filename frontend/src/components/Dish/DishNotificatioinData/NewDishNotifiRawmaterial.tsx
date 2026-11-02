import React from 'react';
import {FaEdit} from 'react-icons/fa';
import {TbTrash} from 'react-icons/tb';
import SearchableDropdown from '../CustomDropdown/SearchableDropdown';
import {useGetNotificationById} from '@/lib/react-query/queriesAndMutations/notification';

type FormValues = {
  description: string;
};
const NewDishNotifiRawmaterial = ({dishId}: {dishId: string}) => {
  const {data: Dishdata, refetch: DishdataRefetch} =
    useGetNotificationById(dishId);
  console.log('Dis:', dishId);

  const handleSubmit = (data: FormValues) => {
    console.log('data', data);
  };
  return (
    <></>
    // dishId && (
    //   <div className="my-4 bg-white p-6 dark:bg-black">
    //     <h1 className="mb-6 text-2xl font-semibold">
    //       {/* {dishData?.data?.na
    //       me || 'Dish Name'} */}
    //     </h1>

    //     {/* Cards Section */}
    //     <div
    //       // ref={scrollRef}
    //       className="flex justify-start gap-4 overflow-x-auto scroll-smooth"
    //     >
    //       {/* First Card (For Adding/Editing) */}
    //       <div className="w-60 shrink-0 rounded-lg border-2 border-blue-200 p-4 shadow-sm dark:border-primary">
    //         <input
    //           placeholder="People"
    //           className="mb-2 w-48 rounded border-[1.7px] border-blue-200 bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-primary dark:bg-form-input dark:text-white dark:focus:border-primary"
    //           value={cardData.people || ''}
    //           onChange={(e) =>
    //             setCardData((prev) => ({...prev, people: e.target.value}))
    //           }
    //         />
    //         <input
    //           placeholder="Kg"
    //           className="mb-2 w-48 rounded border-[1.7px] border-blue-200 bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-primary dark:bg-form-input dark:text-white dark:focus:border-primary"
    //           value={cardData.kg || ''}
    //           onChange={(e) =>
    //             setCardData((prev) => ({...prev, kg: e.target.value}))
    //           }
    //         />
    //         <input
    //           placeholder="Price"
    //           className="mb-2 w-48 rounded border-[1.7px] border-blue-200 bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-primary dark:bg-form-input dark:text-white dark:focus:border-primary"
    //           value={cardData.price || ''}
    //           onChange={(e) =>
    //             setCardData((prev) => ({...prev, price: e.target.value}))
    //           }
    //         />
    //       </div>

    //       {/* Existing Cards (Readonly) */}
    //       {dishrecords?.map((card) => (
    //         <div
    //           key={card.id}
    //           className="w-48 shrink-0 rounded-lg border p-4 shadow-sm"
    //         >
    //           <input
    //             type="number"
    //             value={card.people}
    //             className="mb-2 w-32 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
    //             readOnly
    //           />
    //           <input
    //             type="number"
    //             value={card.dishKg}
    //             className="mb-2 w-32 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
    //             readOnly
    //           />
    //           <input
    //             type="number"
    //             value={card.dishPrice}
    //             className="mb-2 w-32 rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
    //             readOnly
    //           />
    //           <button
    //             className="bg-gray-200 w-full rounded-md p-2"
    //             onClick={() => handleEdit(card)}
    //           >
    //             ✏️
    //           </button>
    //         </div>
    //       ))}
    //     </div>

    //     {/* Raw Material Rows */}
    //     <div className="mt-6 flex flex-col gap-4">
    //       <h1 className="text-xl">Raw Materials</h1>
    //       <div className="w-full overflow-x-auto">
    //         <div className="w-max min-w-full">
    //           {rawMaterials?.map((row) => (
    //             <div key={row.id} className="flex min-w-[600px] gap-4">
    //               {/* Raw Material Dropdown */}
    //               <SearchableDropdown
    //                 options={rawmaterialOptions || []}
    //                 value={row.rawMaterial}
    //                 onChange={(value) =>
    //                   setRawMaterials((prev) =>
    //                     prev.map((item) =>
    //                       item.id === row.id
    //                         ? {...item, rawMaterial: value}
    //                         : item,
    //                     ),
    //                   )
    //                 }
    //                 placeholder="Select Raw Material"
    //               />

    //               {/* Quantity Input */}
    //               <div className="relative w-full">
    //                 <input
    //                   type="number"
    //                   placeholder="Quantity"
    //                   className="mb-2 w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
    //                   value={parseFloat(parseFloat(row.quantity).toFixed(2))}
    //                   onChange={(e) =>
    //                     setRawMaterials((prev) =>
    //                       prev?.map((item) =>
    //                         item.id === row.id
    //                           ? {...item, quantity: e.target.value}
    //                           : item,
    //                       ),
    //                     )
    //                   }
    //                 />
    //                 {row.unit && (
    //                   <span className="text-gray-500 pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
    //                     {row.unit}
    //                   </span>
    //                 )}
    //               </div>

    //               {/* Process Dropdown */}
    //               <SearchableDropdown
    //                 options={processOptions || []}
    //                 value={row.process}
    //                 onChange={(value) =>
    //                   setRawMaterials((prev) =>
    //                     prev.map((item) =>
    //                       item.id === row.id ? {...item, process: value} : item,
    //                     ),
    //                   )
    //                 }
    //                 placeholder="Select Process"
    //               />

    //               {/* Add Row Button */}
    //               <button onClick={handleAddRow}>
    //                 <div className="flex items-center justify-between rounded bg-primary px-4 py-2 text-lg text-white">
    //                   <FaEdit />
    //                   Add
    //                 </div>
    //               </button>

    //               {/* Delete Row Button */}
    //               <button
    //                 onClick={() => handleDeleteRow(row.id)}
    //                 disabled={rawMaterials.length === 1} // Prevents deleting the last row
    //               >
    //                 <div className="flex items-center justify-between rounded bg-primary px-4 py-2 text-lg text-white">
    //                   <TbTrash />
    //                   Delete
    //                 </div>
    //               </button>
    //             </div>
    //           ))}
    //         </div>
    //       </div>

    //       <div className="mt-8 text-center">
    //         <button
    //           className="rounded bg-primary px-8 py-3 text-white"
    //           onClick={handleSubmit}
    //         >
    //           {isupdateMode ? 'Update' : 'Submit'}
    //         </button>
    //       </div>
    //     </div>
    //   </div>
    // )
  );
};

export default NewDishNotifiRawmaterial;
