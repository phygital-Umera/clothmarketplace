// import React, {useState} from 'react';
// import {FormProvider, useForm} from 'react-hook-form';
// import GenericMultiselectDropdown from '../Forms/SearchDropDown/GenericMultiselectDropdown';

// import {addRawMaterialToDishSchema} from '@/lib/validation/dishSchemas';
// import {z} from 'zod';
// import {zodResolver} from '@hookform/resolvers/zod';

// type RawMaterial = {
//   name: string;
//   pricePerUnit: number;
//   quantity: number; // Quantity required for a given number of people
// };

// type RawMaterialOption = {
//   label: string;
//   value: RawMaterial;
// };
// type FormValues = z.infer<typeof addRawMaterialToDishSchema>;
// const DishRawMaterialCat: React.FC = () => {
//   const methods = useForm<FormValues>({
//     resolver: zodResolver(addRawMaterialToDishSchema),
//   });
//   const {handleSubmit} = useForm();
//   const [selectedRawMaterials, setSelectedRawMaterials] = useState<
//     RawMaterial[]
//   >([]);
//   const [peopleCount, setPeopleCount] = useState<number>(0);
//   const [dishQuantity, setDishQuantity] = useState<number>(0);
//   const [dishPrice, setDishPrice] = useState<number>(0);
//   const [tableData, setTableData] = useState<any[]>([]);

//   // Mock raw material options
//   const rawMaterialOptions: RawMaterialOption[] = [
//     {label: 'Sugar', value: {name: 'Sugar', pricePerUnit: 2, quantity: 0}},
//     {label: 'Milk', value: {name: 'Milk', pricePerUnit: 3, quantity: 0}},
//     {label: 'Water', value: {name: 'Water', pricePerUnit: 1, quantity: 0}},
//     {
//       label: 'Tea Dust',
//       value: {name: 'Tea Dust', pricePerUnit: 1.5, quantity: 0},
//     },
//   ];

//   const handleRawMaterialSelect = (selectedOptions: string[]) => {
//     const selectedMaterials = rawMaterialOptions
//       .filter((option) => selectedOptions.includes(option.label))
//       .map((option) => option.value);
//     setSelectedRawMaterials(selectedMaterials);
//   };

//   const addToTable = () => {
//     if (peopleCount === 0 || dishQuantity === 0 || dishPrice === 0) {
//       alert('Please fill all manual inputs.');
//       return;
//     }

//     const rowData = selectedRawMaterials.map((material) => ({
//       rawMaterial: material.name,
//       quantityForPeople: material.quantity,
//       peopleCount,
//       dishQuantity,
//       price: dishPrice,
//     }));

//     setTableData((prevData) => [...prevData, ...rowData]);
//   };

//   return (
//     <FormProvider {...methods}>
//       <form
//         onSubmit={methods.handleSubmit(onSubmit)}
//         className="space-y-8 bg-white p-8 dark:bg-black"
//       >
//         {/* Part 1: Multi-Select Dropdown */}
//         <div>
//           <label>Select Raw Materials</label>
//           <GenericMultiselectDropdown
//             name="rawMaterials"
//             label="Raw Materials"
//             // options={rawMaterialOptions.map(({label}) => ({
//             //   value: label,
//             //   label,
//             // }))}
//             // defaultOption={selectedRawMaterials.map((mat) => mat.name)}
//             // onChange={(selectedOptions) =>
//             //   handleRawMaterialSelect(selectedOptions)
//             // }
//             options={[
//               {
//                 label: 'Sugar',
//                 value: 'Sugar',
//               },
//             ]}
//           />
//         </div>

//         {/* Part 2: Manual Inputs */}
//         <div className="grid grid-cols-1 gap-4">
//           <div>
//             <label>People Count</label>
//             <input
//               type="number"
//               value={peopleCount}
//               onChange={(e) => setPeopleCount(Number(e.target.value))}
//               placeholder="Enter number of people"
//               className="w-full rounded border p-2"
//             />
//           </div>
//           <div>
//             <label>Dish Quantity (in KG)</label>
//             <input
//               type="number"
//               value={dishQuantity}
//               onChange={(e) => setDishQuantity(Number(e.target.value))}
//               placeholder="Enter total dish quantity in KG"
//               className="w-full rounded border p-2"
//             />
//           </div>
//           <div>
//             <label>Price</label>
//             <input
//               type="number"
//               value={dishPrice}
//               onChange={(e) => setDishPrice(Number(e.target.value))}
//               placeholder="Enter total dish price"
//               className="w-full rounded border p-2"
//             />
//           </div>
//         </div>

//         {/* Dynamic Raw Material Inputs */}
//         <div>
//           <h2>Raw Material Quantities</h2>
//           {selectedRawMaterials.map((material, idx) => (
//             <div
//               key={idx}
//               className="flex items-center justify-between space-y-2"
//             >
//               <span>{material.name}</span>
//               <input
//                 type="number"
//                 placeholder={`Quantity for ${peopleCount} people`}
//                 value={material.quantity}
//                 onChange={(e) => {
//                   const updatedMaterials = [...selectedRawMaterials];
//                   updatedMaterials[idx].quantity = Number(e.target.value);
//                   setSelectedRawMaterials(updatedMaterials);
//                 }}
//                 className="rounded border p-2"
//               />
//               <span>kg</span>
//             </div>
//           ))}
//         </div>

//         {/* Add Button */}
//         <div>
//           <button
//             type="button"
//             onClick={addToTable}
//             className="rounded bg-blue-500 p-2 text-white"
//           >
//             Add to Table
//           </button>
//         </div>

//         {/* Data Table */}
//         <div className="mt-6">
//           <h3>Entered Data</h3>
//           <table className="w-full table-auto border-collapse">
//             <thead>
//               <tr>
//                 <th className="border p-2">Raw Material</th>
//                 <th className="border p-2">Quantity</th>
//                 <th className="border p-2">People Count</th>
//                 <th className="border p-2">Dish Quantity (kg)</th>
//                 <th className="border p-2">Price</th>
//               </tr>
//             </thead>
//             <tbody>
//               {tableData.map((row, idx) => (
//                 <tr key={idx}>
//                   <td className="border p-2">{row.rawMaterial}</td>
//                   <td className="border p-2">{row.quantityForPeople}</td>
//                   <td className="border p-2">{row.peopleCount}</td>
//                   <td className="border p-2">{row.dishQuantity} kg</td>
//                   <td className="border p-2">${row.price}</td>
//                 </tr>
//               ))}
//             </tbody>
//           </table>
//         </div>
//       </form>
//     </FormProvider>
//   );
// };

// export default DishRawMaterialCat;
