// /* eslint-disable */
// import React, {useEffect, useState} from 'react';
// import {FaAngleDown, FaAngleRight} from 'react-icons/fa';
// import {useGetAllRawMaterialFromSubEvent} from '@/lib/react-query/queriesAndMutations/cateror/event';
// import {Route} from '@/routes/_app/_event/events.$id';
// import {getAllRawmaterialsFromEvent} from '@/lib/api/cateror/event';
// import jsPDF from 'jspdf';
// import 'jspdf-autotable';
// // import hindiFont from '@/assets/fonts/Devnagari/NotoSansDevanagari-Regular.ttf';

// // Define the type for a raw material item.
// interface RawMaterial {
//   quantity: number;
//   maharaj: string;
//   name: string;
//   unit: string;
//   subEvent: string;
//   category: string;
// }

// // Define the overall structure of the fetched data.
// interface FormattedData {
//   unformatedRawMaterials: RawMaterial[];
//   maharajList: string[];
//   subEventNameList: string[];
//   formatedRawMaterials: RawMaterial[];
//   subEventMaharajwiseRawMaterials: {
//     [subEvent: string]: RawMaterial[];
//   };
//   maharajSubEventwiseRawMaterials: {
//     [maharaj: string]: RawMaterial[];
//   };
// }

// const TotalRawMaterial: React.FC = () => {
//   const {id: EventId} = Route.useParams();
//   // (Optional) using a react-query hook.
//   const {data: queryData} = useGetAllRawMaterialFromSubEvent(EventId);

//   // Store the fetched data.
//   const [rawMaterial, setRawMaterial] = useState<FormattedData | null>(null);

//   useEffect(() => {
//     getAllRawmaterialsFromEvent(EventId).then((res) => {
//       setRawMaterial(res.data);
//     });
//   }, [EventId]);

//   console.log(rawMaterial);

//   // Filter state: each boolean controls whether grouping is applied.
//   // When none are active, we simply display all data under one group.
//   const [filters, setFilters] = useState({
//     subEvent: false,
//     maharaj: false,
//     category: true,
//   });

//   // Expanded state for group rows.
//   // We use an object mapping each unique key path to a boolean.
//   // When a key is not set, it will be considered expanded by default.
//   const [expanded, setExpanded] = useState<{[key: string]: boolean}>({});

//   // Toggle the expand/collapse state of a given group.
//   const toggleExpand = (keyPath: string) => {
//     setExpanded((prev) => ({...prev, [keyPath]: !prev[keyPath]}));
//   };

//   // Group the raw materials based on the active filters.
//   // NOTE: We use formatedRawMaterials so that the grouping is done on the detailed (nested) entries.
//   const getGroupedData = () => {
//     if (!rawMaterial) return null;
//     // Use detailed entries for proper nested grouping.
//     const baseData = rawMaterial.formatedRawMaterials;
//     let groupedData: any = {};

//     // 1. Group by subEvent if filter is active; otherwise, put everything in one group.
//     if (filters.subEvent) {
//       baseData.forEach((item) => {
//         if (!groupedData[item.subEvent]) groupedData[item.subEvent] = [];
//         groupedData[item.subEvent].push(item);
//       });
//     } else {
//       groupedData['All Raw Materials'] = baseData;
//     }

//     // 2. Group each sub-group by maharaj if filter is active.
//     if (filters.maharaj) {
//       Object.keys(groupedData).forEach((groupKey) => {
//         const groupArr = groupedData[groupKey];
//         const maharajGroup: any = {};
//         groupArr.forEach((item: RawMaterial) => {
//           if (!maharajGroup[item.maharaj]) maharajGroup[item.maharaj] = [];
//           maharajGroup[item.maharaj].push(item);
//         });
//         groupedData[groupKey] = maharajGroup;
//       });
//     }

//     // 3. Group further by category if filter is active.
//     if (filters.category) {
//       // This recursive function groups any array it finds by category.
//       const groupByCategory = (dataToGroup: any): any => {
//         if (Array.isArray(dataToGroup)) {
//           const catGroup: any = {};
//           dataToGroup.forEach((item: RawMaterial) => {
//             if (!catGroup[item.category]) catGroup[item.category] = [];
//             catGroup[item.category].push(item);
//           });
//           return catGroup;
//         } else {
//           // For objects (already grouped by previous filters), apply recursively.
//           const result: any = {};
//           Object.keys(dataToGroup).forEach((key) => {
//             result[key] = groupByCategory(dataToGroup[key]);
//           });
//           return result;
//         }
//       };
//       groupedData = groupByCategory(groupedData);
//     }

//     return groupedData;
//   };

//   const groupedData = getGroupedData();

//   // Recursive rendering function.
//   // When data is an array, we render actual raw material rows.
//   // Otherwise, we render a group header row with expandable functionality.
//   const renderRows = (data: any, keyPath: string = ''): JSX.Element[] => {
//     if (Array.isArray(data)) {
//       // Leaf rows: render each raw material.
//       return (data.map((item, index) => (
//         <tr key={`${keyPath}-${index}`} className="bg-white dark:bg-boxdark">
//           <td className="border-b border-[#eee] px-4 py-2">{item.name}</td>
//           <td className="border-b border-[#eee] px-4 py-2">
//             {Number(item.quantity).toFixed(item.quantity % 1 === 0 ? 0 : 1)}
//           </td>
//           <td className="border-b border-[#eee] px-4 py-2">{item.unit}</td>
//         </tr>
//       )));
//     } else {
//       // Data is an object containing groups.
//       const rows: JSX.Element[] = [];
//       Object.keys(data).forEach((groupKey) => {
//         const currentPath = keyPath ? `${keyPath}-${groupKey}` : groupKey;
//         // If not explicitly collapsed/expanded, treat group as expanded by default.
//         const isExpanded =
//           currentPath in expanded ? expanded[currentPath] : true;

//         // Render the group header row.
//         rows.push(
//           <tr
//             key={currentPath}
//             className="bg-gray-100 dark:bg-gray-800 cursor-pointer"
//             onClick={() => toggleExpand(currentPath)}
//           >
//             <td className="flex items-center px-4 py-4 font-bold" colSpan={6}>
//               <span className="mr-2">
//                 {isExpanded ? <FaAngleDown /> : <FaAngleRight />}
//               </span>
//               <span>{groupKey}</span>
//             </td>
//           </tr>,
//         );
//         // If the group is expanded, recursively render its children.
//         if (isExpanded) {
//           rows.push(...renderRows(data[groupKey], currentPath));
//         }
//       });
//       return rows;
//     }
//   };

//   const [selectedRows, setSelectedRows] = useState<string[]>([]); // Track selected rows by unique names

//   useEffect(() => {
//     getAllRawmaterialsFromEvent(EventId).then((res) => {
//       setRawMaterial(res.data);
//     });
//   }, [EventId]);

//   // const handleRowSelection = (name: string) => {
//   //   setSelectedRows((prevSelected) =>
//   //     prevSelected.includes(name)
//   //       ? prevSelected.filter((item) => item !== name)
//   //       : [...prevSelected, name]
//   //   );
//   // };

//   // const generatePDF = () => {
//   //   const doc = new jsPDF();
//   //   const columns = ["Name", "Quantity","Unit"];
//   //   const rows = rawMaterial
//   //     ? rawMaterial.formatedRawMaterials
//   //         .map((item) => [item.name, item.quantity, item.unit])
//   //     : [];

//   //   doc.text("Selected Raw Materials", 14, 10);
//   //   doc.autoTable({
//   //     head: [columns],
//   //     body: rows,
//   //     startY: 20,
//   //   });
//   //   doc.save("selectedRawMaterial.pdf");
//   // };
//   const generatePDF = () => {
//     if (!groupedData) return; // Exit if no data is available

//     const doc = new jsPDF();

//     // const hindiFont = "base64-encoded-font-data"; // Add the base64 encoded font data here
//     doc.addFileToVFS('NotoSansDevanagari.ttf', hindiFont);
//     doc.addFont('NotoSansDevanagari.ttf', 'NotoSansDevanagari', 'normal');
//     doc.setFont('NotoSansDevanagari');
//     doc.text('Filtered Raw Materials', 14, 10);

//     const addTableToPDF = (data: any, parentKey: string = '') => {
//       if (Array.isArray(data)) {
//         // Leaf data: add rows to the PDF
//         const rows = data.map((item: RawMaterial) => [
//           item.name,
//           item.quantity,
//           item.unit,
//         ]);

//         doc.autoTable({
//           head: [['नाम', 'मात्रा', 'इकाई']],
//           body: rows,
//           startY: doc.lastAutoTable ? doc.lastAutoTable.finalY + 15 : 30,
//         });
//       } else {
//         // Grouped data: add group headers and recurse
//         Object.keys(data).forEach((key) => {
//           const groupTitle = parentKey ? `${parentKey} > ${key}` : key;
//           doc.text(
//             groupTitle,
//             14,
//             doc.lastAutoTable ? doc.lastAutoTable.finalY + 10 : 20,
//           );
//           addTableToPDF(data[key], groupTitle);
//         });
//       }
//     };

//     addTableToPDF(groupedData);
//     doc.save('filteredRawMaterials.pdf');
//   };

//   return (
//     <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
//       <h2 className="mb-4 text-xl font-bold">Total Raw Material</h2>

//       {/* Filters */}
//       <div className="mb-4 flex flex-wrap justify-end gap-4">
//         {(['subEvent', 'maharaj', 'category'] as const).map((filter) => (
//           <label key={filter} className="flex items-center gap-2">
//             <input
//               type="checkbox"
//               checked={filters[filter]}
//               onChange={() => {
//                 setFilters((prev) => ({...prev, [filter]: !prev[filter]}));
//                 // Reset expanded state when filters change.
//                 setExpanded({});
//               }}
//               className="h-5 w-5 accent-primary"
//             />
//             <span className="text-sm font-medium capitalize">
//               {filter} Wise
//             </span>
//           </label>
//         ))}
//       </div>

//       {/*pdf download button*/}
//       <div className="mt-4 flex justify-end gap-4">
//         <button
//           className="flex justify-center rounded bg-primary px-6 py-2 font-medium text-gray hover:bg-opacity-90"
//           onClick={generatePDF}
//           // disabled={selectedRows.length === 0} // Disable button if no rows selected
//         >
//           Download PDF
//         </button>
//       </div>

//       {/* Table Container */}
//       <div className="max-w-full overflow-x-auto">
//         <table className="min-w-full table-auto">
//           <thead>
//             <tr className="bg-gray-2 text-left dark:bg-meta-4">
//               <th className="px-4 py-4 font-medium text-black dark:text-white">
//                 Name
//               </th>
//               <th className="px-4 py-4 font-medium text-black dark:text-white">
//                 Quantity
//               </th>
//               <th className="px-4 py-4 font-medium text-black dark:text-white">
//                 Unit
//               </th>
//             </tr>
//           </thead>
//           <tbody>
//             {groupedData ? (
//               renderRows(groupedData)
//             ) : (
//               <tr>
//                 <td
//                   colSpan={6}
//                   className="border-b border-[#eee] px-4 py-4 text-center"
//                 >
//                   Loading...
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>

//     </div>
//   );
// };

// export default TotalRawMaterial;

//Use this when your generatePDF collapsed----------------------------------------------------------------------------------
// const generatePDF = () => {
//   if (!groupedData) return; // Exit if no data is available

//   const doc = new jsPDF();

//   // Add the Hindi font to the document
//   doc.addFileToVFS('NotoSansDevanagari.ttf', hindiFontBase64);
//   doc.addFont('NotoSansDevanagari.ttf', 'NotoSansDevanagari', 'normal');

//   // Set default font for English text (helvetica)
//   doc.setFont('helvetica');

//   const marginLeft = 14;
//   let currentY = 30;  // Starting Y position for the first table
//   const pageHeight = doc.internal.pageSize.height;

//   const isMarathi = (text: string) => /[\u0900-\u097F]/.test(text); // Regex for Marathi characters

//   const addTableToPDF = (data: any, parentKey: string = '') => {
//     const pageHeight = doc.internal.pageSize.height; // Ensure you have access to the full page height

//     if (Array.isArray(data)) {
//       // Leaf data: add rows to the PDF
//       const header = ['नाम', 'मात्रा', 'इकाई']; // Marathi headers

//       // Set the font for the Marathi headers
//       doc.setFont('NotoSansDevanagari');

//       const columnWidths = [
//         Math.max(...header.map(h => doc.getTextWidth(h)), ...data.map(item => doc.getTextWidth(String(item.name)))) + 10,
//         Math.max(...header.map(h => doc.getTextWidth(h)), ...data.map(item => doc.getTextWidth(String(item.quantity)))) + 10,
//         Math.max(...header.map(h => doc.getTextWidth(h)), ...data.map(item => doc.getTextWidth(String(item.unit)))) + 10,
//       ];

//       // Draw header row with Marathi font
//       const headerY = currentY;
//       doc.rect(marginLeft, headerY, columnWidths[0], 10);
//       doc.rect(marginLeft + columnWidths[0], headerY, columnWidths[1], 10);
//       doc.rect(marginLeft + columnWidths[0] + columnWidths[1], headerY, columnWidths[2], 10);

//       // Render headers with font handling based on language
//       header.forEach((col, index) => {
//         if (isMarathi(col)) {
//           doc.setFont('NotoSansDevanagari'); // Set to Marathi font
//         } else {
//           doc.setFont('helvetica'); // Set to English font
//         }

//         doc.text(col, marginLeft + columnWidths.slice(0, index).reduce((acc, curr) => acc + curr, 0) + 5, headerY + 7);
//       });

//       // Add data rows
//       data.forEach((item: RawMaterial, index: number) => {
//         currentY += 10;

//         // For name column, check if it's Marathi or English and set font accordingly
//         if (isMarathi(item.name)) {
//           doc.setFont('NotoSansDevanagari');
//         } else {
//           doc.setFont('helvetica');
//         }

//         // Check if we need a new page
//         if (currentY > pageHeight - 30) { // Adjust margin for the last row
//           doc.addPage();
//           currentY = 20; // Reset Y to top of the new page
//         }

//         const rowY = currentY;
//         doc.rect(marginLeft, rowY, columnWidths[0], 10);
//         doc.rect(marginLeft + columnWidths[0], rowY, columnWidths[1], 10);
//         doc.rect(marginLeft + columnWidths[0] + columnWidths[1], rowY, columnWidths[2], 10);

//         // For the name column (Marathi or English)
//         doc.text(String(item.name), marginLeft + 5, rowY + 7);

//         // Switch to Helvetica for quantity and unit (usually in English)
//         doc.setFont('helvetica');

//         // Format the quantity: display up to two decimals but without trailing zeros
//         const formattedQuantity = parseFloat(item.quantity).toFixed(2);
//         const finalQuantity = parseFloat(formattedQuantity).toString(); // This removes trailing zeros
//         doc.text(finalQuantity, marginLeft + columnWidths[0] + 5, rowY + 7);
//         doc.text(String(item.unit), marginLeft + columnWidths[0] + columnWidths[1] + 5, rowY + 7);
//       });

//       currentY += 20; // Add space after the table
//     } else {
//       // Handle group data
//       Object.keys(data).forEach((key) => {
//         const groupTitle = parentKey ? `${parentKey} > ${key}` : key;

//         // Check if group title is Marathi or English
//         if (isMarathi(groupTitle)) {
//           doc.setFont('NotoSansDevanagari'); // Set to Marathi font
//         } else {
//           doc.setFont('helvetica'); // Set to English font
//         }

//         doc.text(groupTitle, marginLeft, currentY);
//         currentY += 10;

//         if (currentY > pageHeight - 30) {
//           doc.addPage();
//           currentY = 20;
//         }

//         addTableToPDF(data[key], groupTitle);
//       });
//     }
//   };

//   addTableToPDF(groupedData);

//   // Save the PDF
//   doc.save('filteredRawMaterials.pdf');
// };
// -------------------------------------------------------------------------------------------------------------------

import React, {useEffect, useRef, useState} from 'react';
// import {FaAngleDown, FaAngleRight} from 'react-icons/fa';
// import {useGetAllRawMaterialFromSubEvent} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {Route} from '@/routes/_app/_event/events.$id';
// import {getAllRawmaterialsFromEvent} from '@/lib/api/cateror/event';
// import jsPDF from 'jspdf';
import 'jspdf-autotable';
// import html2canvas from 'html2canvas'; // Import html2canvas
import AllVendorsList from './RawMaterialComponents/AllVendors/AllVendorsList';
import {useGetAllVendors} from '@/lib/react-query/queriesAndMutations/cateror/external';

// Define the type for a raw material item.
// interface RawMaterial {
//   quantity: number;
//   maharaj: string;
//   name: string;
//   unit: string;
//   subEvent: string;
//   category: string;
// }

// Define the overall structure of the fetched data.
// interface FormattedData {
//   unformatedRawMaterials: RawMaterial[];
//   maharajList: string[];
//   subEventNameList: string[];
//   formatedRawMaterials: RawMaterial[];
//   subEventMaharajwiseRawMaterials: {
//     [subEvent: string]: RawMaterial[];
//   };
//   maharajSubEventwiseRawMaterials: {
//     [maharaj: string]: RawMaterial[];
//   };
// }

const TotalRawMaterial: React.FC = () => {
  const {id: EventId} = Route.useParams();
  // (Optional) using a react-query hook.
  // const {data: queryData} = useGetAllRawMaterialFromSubEvent(EventId);
  // console.log(' TotalRawMaterial :::::::::::', queryData);
  const {data: vendors} = useGetAllVendors(EventId);
  console.log(' Vendors Data :', vendors);

  // Store the fetched data.
  // const [rawMaterial, setRawMaterial] = useState<FormattedData | null>(null);

  // useEffect(() => {
  //   getAllRawmaterialsFromEvent(EventId).then((res) => {
  //     setRawMaterial(res.data);
  //   });
  // }, [EventId]);

  // const [filters, setFilters] = useState({
  //   subEvent: false,
  //   maharaj: false,
  //   category: true,
  // });

  // const [expanded, setExpanded] = useState<{[key: string]: boolean}>({});

  // const toggleExpand = (keyPath: string) => {
  //   setExpanded((prev) => ({...prev, [keyPath]: !prev[keyPath]}));
  // };

  // const getGroupedData = () => {
  //   if (!rawMaterial) return null;
  //   const baseData = rawMaterial.formatedRawMaterials;

  //   const mergedData: {[key: string]: RawMaterial} = {};

  //   baseData.forEach((item) => {
  //     const key = item.name;
  //     if (mergedData[key]) {
  //       mergedData[key].quantity += item.quantity;
  //     } else {
  //       mergedData[key] = {...item};
  //     }
  //   });

  //   const mergedDataArray = Object.values(mergedData);

  //   let groupedData: any = {};

  //   if (!filters.subEvent && !filters.maharaj && !filters.category) {
  //     groupedData['All Raw Materials'] = mergedDataArray;
  //   } else {
  //     if (filters.subEvent) {
  //       mergedDataArray.forEach((item) => {
  //         if (!groupedData[item.subEvent]) groupedData[item.subEvent] = [];
  //         groupedData[item.subEvent].push(item);
  //       });
  //     } else {
  //       groupedData['All Raw Materials'] = mergedDataArray;
  //     }

  //     if (filters.maharaj) {
  //       Object.keys(groupedData).forEach((groupKey) => {
  //         const groupArr = groupedData[groupKey];
  //         const maharajGroup: any = {};
  //         groupArr.forEach((item: RawMaterial) => {
  //           if (!maharajGroup[item.maharaj]) maharajGroup[item.maharaj] = [];
  //           maharajGroup[item.maharaj].push(item);
  //         });
  //         groupedData[groupKey] = maharajGroup;
  //       });
  //     }

  //     if (filters.category) {
  //       const groupByCategory = (dataToGroup: any): any => {
  //         if (Array.isArray(dataToGroup)) {
  //           const catGroup: any = {};
  //           dataToGroup.forEach((item: RawMaterial) => {
  //             if (!catGroup[item.category]) catGroup[item.category] = [];
  //             catGroup[item.category].push(item);
  //           });
  //           return catGroup;
  //         } else {
  //           const result: any = {};
  //           Object.keys(dataToGroup).forEach((key) => {
  //             result[key] = groupByCategory(dataToGroup[key]);
  //           });
  //           return result;
  //         }
  //       };
  //       groupedData = groupByCategory(groupedData);
  //     }
  //   }

  //   return groupedData;
  // };

  // const groupedData = getGroupedData();

  // const renderRows = (data: any, keyPath: string = ''): JSX.Element[] => {
  //   if (Array.isArray(data)) {
  //     return data.map((item, index) => (
  //       <tr
  //         key={`${keyPath}-${index}`}
  //         className="bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-150"
  //       >
  //         <td className="border-gray-300 border-b px-3 pb-2">{item.name}</td>
  //         <td className="border-gray-300 border-b px-3 pb-2">
  //           {Number(item.quantity).toFixed(item.quantity % 1 === 0 ? 0 : 1)}
  //         </td>
  //         <td className="border-gray-300 border-b px-3 pb-2">{item.unit}</td>
  //       </tr>
  //     ));
  //   } else {
  //     const rows: JSX.Element[] = [];
  //     Object.keys(data).forEach((groupKey) => {
  //       const currentPath = keyPath ? `${keyPath}-${groupKey}` : groupKey;
  //       const isExpanded =
  //         currentPath in expanded ? expanded[currentPath] : true;

  //       rows.push(
  //         <tr
  //           key={currentPath}
  //           className="bg-gray-100 dark:bg-gray-700 cursor-pointer"
  //           onClick={() => toggleExpand(currentPath)}
  //         >
  //           <td className="flex items-center px-4 py-1.5 font-bold" colSpan={6}>
  //             <span className="mr-2">
  //               {isExpanded ? (
  //                 <FaAngleDown className="text-gray-600 dark:text-gray-400" />
  //               ) : (
  //                 <FaAngleRight className="text-gray-600 dark:text-gray-400" />
  //               )}
  //             </span>
  //             <span className="text-gray-700 dark:text-gray-200">
  //               {groupKey}
  //             </span>
  //           </td>
  //         </tr>,
  //       );
  //       if (isExpanded) {
  //         rows.push(...renderRows(data[groupKey], currentPath));
  //       }
  //     });
  //     return rows;
  //   }
  // };

  // const tableRef = useRef<HTMLDivElement | null>(null);

  // const generatePDF = () => {
  //   if (!rawMaterial || !groupedData) return; // Exit if no data is available

  //   // Capture the content to an image using html2canvas
  //   if (!tableRef.current) return;

  //   html2canvas(tableRef.current).then((canvas) => {
  //     // Create a new jsPDF instance
  //     const doc = new jsPDF();

  //     // Get the image data from the canvas
  //     const imgData = canvas.toDataURL('image/png');

  //     // Calculate image dimensions to fit it into the PDF page
  //     const imgWidth = doc.internal.pageSize.width;
  //     const imgHeight = (canvas.height * imgWidth) / canvas.width;

  //     // Define the page height for jsPDF
  //     const pageHeight = doc.internal.pageSize.height;

  //     // Initialize Y position for the first page
  //     let offsetY = 0;

  //     // Loop to add content across multiple pages
  //     while (offsetY < imgHeight) {
  //       // Add a new page if needed (except for the first page)
  //       if (offsetY > 0) {
  //         doc.addPage(); // Add new page
  //       }

  //       // Add the image for this page, adjusting the Y-position
  //       doc.addImage(imgData, 'PNG', 0, -offsetY, imgWidth, imgHeight);

  //       // Increase the offset to move the Y-position down for the next page
  //       offsetY += pageHeight;
  //     }

  //     // Save the generated PDF
  //     doc.save('filteredRawMaterials.pdf');
  //   });
  // };

  // const generatePDF = () => {
  //   if (!rawMaterial || !groupedData) return; // Exit if no data is available

  //   // Capture the content to an image using html2canvas
  //   if (!tableRef.current) return;

  //   html2canvas(tableRef.current).then((canvas) => {
  //     // Create a new jsPDF instance
  //     const doc = new jsPDF();

  //     // Get the image data from the canvas
  //     const imgData = canvas.toDataURL('image/png');

  //     // Calculate image dimensions to fit it into the PDF page
  //     const imgWidth = doc.internal.pageSize.width;
  //     const imgHeight = (canvas.height * imgWidth) / canvas.width;

  //     // Define the page height for jsPDF
  //     const pageHeight = doc.internal.pageSize.height;

  //     // Start by adding the first page with the content
  //     let currentY = 0;
  //     let remainingHeight = imgHeight;

  //     // Add the image to the first page
  //     doc.addImage(imgData, 'PNG', 0, currentY, imgWidth, imgHeight);
  //     remainingHeight -= pageHeight;

  //     // Loop to check if content exceeds one page
  //     while (remainingHeight > 0) {
  //       doc.addPage(); // Add a new page
  //       currentY = -pageHeight; // Set the Y position to start from the top of the next page
  //       doc.addImage(imgData, 'PNG', 0, currentY, imgWidth, imgHeight);
  //       remainingHeight -= pageHeight;
  //     }

  //     // Save the PDF
  //     doc.save('filteredRawMaterials.pdf');
  //   });
  // };

  return (
    // <div className="rounded-lg border border-stroke bg-white px-6 pb-4 pt-6 shadow-md dark:border-strokedark dark:bg-boxdark sm:px-8 xl:pb-2">
    //   <h2 className="mb-6 text-2xl font-semibold text-primary">
    //     Total Raw Material
    //   </h2>

    //   <div className="mb-5 flex flex-wrap justify-end gap-6">
    //     {(['subEvent', 'maharaj', 'category'] as const).map((filter) => (
    //       <label key={filter} className="flex items-center gap-3">
    //         <input
    //           type="checkbox"
    //           checked={filters[filter]}
    //           onChange={() => {
    //             setFilters((prev) => ({...prev, [filter]: !prev[filter]}));
    //             setExpanded({});
    //           }}
    //           className="h-5 w-5 accent-primary"
    //         />
    //         <span className="text-gray-600 dark:text-gray-300 text-sm font-medium capitalize">
    //           {filter} Wise
    //         </span>
    //       </label>
    //     ))}
    //   </div>

    //   <div className="mt-6 flex justify-end gap-6">
    //     <button
    //       className="flex justify-center rounded-full bg-primary px-8 py-3 font-medium text-white transition duration-200 hover:bg-opacity-80"
    //       onClick={generatePDF}
    //     >
    //       Download PDF
    //     </button>
    //   </div>

    //   <div ref={tableRef} className="mt-8 max-w-full overflow-x-auto">
    //     <table className="min-w-full table-auto">
    //       <thead className="bg-gray-200 dark:bg-gray-800 sticky top-0">
    //         <tr className="bg-violet-300 py-2 text-sm font-medium text-black">
    //           <th className="px-4 pb-3 pt-1 text-left">Name</th>
    //           <th className="px-4 pb-3 pt-1 text-left">Quantity</th>
    //           <th className="px-4 pb-3 pt-1 text-left">Unit</th>
    //         </tr>
    //       </thead>
    //       <tbody>
    //         {groupedData ? (
    //           renderRows(groupedData)
    //         ) : (
    //           <tr>
    //             <td colSpan={6} className="px-4 py-6 text-center">
    //               Loading...
    //             </td>
    //           </tr>
    //         )}
    //       </tbody>
    //     </table>
    //   </div>
    // </div>
    <>
      <AllVendorsList vendors={vendors || []} />
    </>
  );
};

export default TotalRawMaterial;

// import React, {useEffect, useState} from 'react';
// import {FaAngleDown, FaAngleRight} from 'react-icons/fa';
// import {useGetAllRawMaterialFromSubEvent} from '@/lib/react-query/queriesAndMutations/cateror/event';
// import {Route} from '@/routes/_app/_event/events.$id';
// import {getAllRawmaterialsFromEvent} from '@/lib/api/cateror/event';
// import html2canvas from 'html2canvas';

// // Define the type for a raw material item.
// interface RawMaterial {
//   quantity: number;
//   maharaj: string;
//   name: string;
//   unit: string;
//   subEvent: string;
//   category: string;
// }

// // Define the overall structure of the fetched data.
// interface FormattedData {
//   unformatedRawMaterials: RawMaterial[];
//   maharajList: string[];
//   subEventNameList: string[];
//   formatedRawMaterials: RawMaterial[];
//   subEventMaharajwiseRawMaterials: {
//     [subEvent: string]: RawMaterial[];
//   };
//   maharajSubEventwiseRawMaterials: {
//     [maharaj: string]: RawMaterial[];
//   };
// }

// const TotalRawMaterial: React.FC = () => {
//   const {id: EventId} = Route.useParams();
//   // (Optional) using a react-query hook.
//   const {data: queryData} = useGetAllRawMaterialFromSubEvent(EventId);

//   // Store the fetched data.
//   const [rawMaterial, setRawMaterial] = useState<FormattedData | null>(null);

//   useEffect(() => {
//     getAllRawmaterialsFromEvent(EventId).then((res) => {
//       setRawMaterial(res.data);
//     });
//   }, [EventId]);

//   // Filter state: each boolean controls whether grouping is applied.
//   const [filters, setFilters] = useState({
//     subEvent: false,
//     maharaj: false,
//     category: true,
//   });

//   const [expanded, setExpanded] = useState<{[key: string]: boolean}>({});

//   // Group the raw materials based on the active filters.
//   const getGroupedData = () => {
//     if (!rawMaterial) return null;
//     const baseData = rawMaterial.formatedRawMaterials;
//     let groupedData: any = {};

//     if (!filters.subEvent && !filters.maharaj && !filters.category) {
//       groupedData['All Raw Materials'] = baseData;
//     } else {
//       if (filters.subEvent) {
//         baseData.forEach((item) => {
//           if (!groupedData[item.subEvent]) groupedData[item.subEvent] = [];
//           groupedData[item.subEvent].push(item);
//         });
//       } else {
//         groupedData['All Raw Materials'] = baseData;
//       }

//       if (filters.maharaj) {
//         Object.keys(groupedData).forEach((groupKey) => {
//           const groupArr = groupedData[groupKey];
//           const maharajGroup: any = {};
//           groupArr.forEach((item: RawMaterial) => {
//             if (!maharajGroup[item.maharaj]) maharajGroup[item.maharaj] = [];
//             maharajGroup[item.maharaj].push(item);
//           });
//           groupedData[groupKey] = maharajGroup;
//         });
//       }

//       if (filters.category) {
//         const groupByCategory = (dataToGroup: any): any => {
//           if (Array.isArray(dataToGroup)) {
//             const catGroup: any = {};
//             dataToGroup.forEach((item: RawMaterial) => {
//               if (!catGroup[item.category]) catGroup[item.category] = [];
//               catGroup[item.category].push(item);
//             });
//             return catGroup;
//           } else {
//             const result: any = {};
//             Object.keys(dataToGroup).forEach((key) => {
//               result[key] = groupByCategory(dataToGroup[key]);
//             });
//             return result;
//           }
//         };
//         groupedData = groupByCategory(groupedData);
//       }
//     }

//     return groupedData;
//   };

//   const groupedData = getGroupedData();

//   // Recursive rendering function.
//   const renderRows = (data: any, keyPath: string = ''): JSX.Element[] => {
//     if (Array.isArray(data)) {
//       return data.map((item, index) => (
//         <tr key={`${keyPath}-${index}`} className="bg-white dark:bg-boxdark">
//           <td className="border-b border-[#eee] px-4 py-2">{item.name}</td>
//           <td className="border-b border-[#eee] px-4 py-2">
//             {Number(item.quantity).toFixed(item.quantity % 1 === 0 ? 0 : 1)}
//           </td>
//           <td className="border-b border-[#eee] px-4 py-2">{item.unit}</td>
//         </tr>
//       ));
//     } else {
//       const rows: JSX.Element[] = [];
//       Object.keys(data).forEach((groupKey) => {
//         const currentPath = keyPath ? `${keyPath}-${groupKey}` : groupKey;
//         const isExpanded =
//           currentPath in expanded ? expanded[currentPath] : true;

//         rows.push(
//           <tr
//             key={currentPath}
//             className="bg-gray-100 dark:bg-gray-800 cursor-pointer"
//             onClick={() => toggleExpand(currentPath)}
//           >
//             <td className="flex items-center px-4 py-4 font-bold" colSpan={6}>
//               <span className="mr-2">
//                 {isExpanded ? <FaAngleDown /> : <FaAngleRight />}
//               </span>
//               <span>{groupKey}</span>
//             </td>
//           </tr>
//         );
//         if (isExpanded) {
//           rows.push(...renderRows(data[groupKey], currentPath));
//         }
//       });
//       return rows;
//     }
//   };

//   const [selectedRows, setSelectedRows] = useState<string[]>([]);

//   // Use the new generateJPEG function here
//   const generateJPEG = () => {
//     if (!groupedData) return; // Exit if no data is available

//     const tableElement = document.getElementById('raw-material-table');

//     if (tableElement) {
//       html2canvas(tableElement, {scale: 2}).then((canvas) => {
//         const imageUrl = canvas.toDataURL('image/jpeg');

//         const link = document.createElement('a');
//         link.href = imageUrl;
//         link.download = 'raw-materials.jpg'; // File name for download

//         link.click();
//       });
//     }
//   };

//   return (
//     <div className="rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 shadow-default dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
//       <h2 className="mb-4 text-xl font-bold">Total Raw Material</h2>

//       <div className="mb-4 flex flex-wrap justify-end gap-4">
//         {(['subEvent', 'maharaj', 'category'] as const).map((filter) => (
//           <label key={filter} className="flex items-center gap-2">
//             <input
//               type="checkbox"
//               checked={filters[filter]}
//               onChange={() => {
//                 setFilters((prev) => ({...prev, [filter]: !prev[filter]}));
//                 setExpanded({});
//               }}
//               className="h-5 w-5 accent-primary"
//             />
//             <span className="text-sm font-medium capitalize">{filter} Wise</span>
//           </label>
//         ))}
//       </div>

//       {/* Download JPEG button */}
//       <div className="mt-4 flex justify-end gap-4">
//         <button
//           className="flex justify-center rounded bg-primary px-6 py-2 font-medium text-gray hover:bg-opacity-90"
//           onClick={generateJPEG}
//         >
//           Download JPEG
//         </button>
//       </div>

//       {/* Table Container */}
//       <div className="max-w-full overflow-x-auto">
//         <table id="raw-material-table" className="min-w-full table-auto">
//           <thead>
//             <tr className="bg-gray-2 text-left dark:bg-meta-4">
//               <th className="px-4 py-4 font-medium text-black dark:text-white">
//                 Name
//               </th>
//               <th className="px-4 py-4 font-medium text-black dark:text-white">
//                 Quantity
//               </th>
//               <th className="px-4 py-4 font-medium text-black dark:text-white">
//                 Unit
//               </th>
//             </tr>
//           </thead>
//           <tbody>
//             {groupedData ? renderRows(groupedData) : <tr><td colSpan={6} className="border-b border-[#eee] px-4 py-4 text-center">Loading...</td></tr>}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default TotalRawMaterial;
// function toggleExpand(currentPath: string): void {
//   throw new Error('Function not implemented.');
// }
