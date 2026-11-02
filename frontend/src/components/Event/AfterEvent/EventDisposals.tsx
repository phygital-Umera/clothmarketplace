// import React, {useEffect, useRef, useState} from 'react';
// import {FormProvider, useForm} from 'react-hook-form';
// import GenericInputField from '@/components/Forms/Input/GenericInputField';
// import GenericButton from '@/components/Forms/Buttons/GenericButton';
// import {BiChevronDown, BiChevronUp} from 'react-icons/bi';
// import {useBulkReturnEventUtensils} from '@/lib/react-query/queriesAndMutations/cateror/eventUtensils';
// import {Route} from '@/routes/_app/_event/events.$id';
// import {useGetUtensils} from '@/lib/react-query/queriesAndMutations/cateror/utensils';
// import z from 'zod';
// import {bulkReturnUtensilToEventSchema} from '@/lib/validation/eventSchema';
// import html2canvas from 'html2canvas';
// import jsPDF from 'jspdf';
// import {useGetEventDisposal} from '@/lib/react-query/queriesAndMutations/cateror/eventDisposal';
// import {log} from 'console';

// // Extend your utensil schema with a default utensil type.
// const UtensilSchema = z.object({
//   utensilId: z.string(),
//   utensilType: z.string().default('FORK'),
//   taken: z.number(),
//   returned: z.number(),
//   updateReturned: z.number(),
// });

// type EventUtensil = z.infer<typeof UtensilSchema>;
// type FormValues = z.infer<typeof bulkReturnUtensilToEventSchema>;

// const EventDisposals: React.FunctionComponent = () => {
//   const [isOpen, setIsOpen] = useState(false);
//   const methods = useForm<FormValues>({
//     defaultValues: {
//       eventId: '',
//       utensils: [],
//     },
//   });

//   const {handleSubmit, setValue} = methods;
//   const {id: EventId} = Route.useParams();
//   const {data: eventDisposals} = useGetEventDisposal(EventId);
//   console.log('ddddddddddddddddd', eventDisposals);

//   const {data: utensils} = useGetUtensils(
//     localStorage.getItem('languageId') || '',
//   );

//   const [utensilList, setUtensilList] = useState<EventUtensil[]>([]);
//   const tableRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (eventDisposals) {
//       const transformedData = eventDisposals.map((disposal: any) => ({
//         utensilId: disposal.disposalId,
//         utensilType: disposal.name,
//         taken: disposal.taken,
//         returned: disposal.returned,
//         updateReturned: disposal.returned,
//       }));
//       setUtensilList(transformedData);
//       setValue('utensils', transformedData);
//     }
//   }, [eventDisposals, setValue]);

//   const {mutateAsync: bulkReturnUtensils} = useBulkReturnEventUtensils();

//   const onSubmit = async (data: FormValues) => {
//     const transformedData = data.utensils.map((utensil) => ({
//       ...utensil,
//       returned: Number(utensil.updateReturned),
//     }));
//     await bulkReturnUtensils({
//       eventId: EventId,
//       utensils: transformedData,
//     });
//   };

//   const handleDownloadPDF = () => {
//     if (!utensilList) return;

//     const reportContainer = document.createElement('div');
//     reportContainer.style.width = '500px';
//     reportContainer.style.padding = '10px';
//     reportContainer.style.background = 'white';
//     reportContainer.style.fontFamily = 'Arial, sans-serif';

//     // Header Section
//     const header = document.createElement('div');
//     header.style.textAlign = 'center';
//     header.style.marginBottom = '15px';
//     header.innerHTML = `
//       <h2 style="margin-bottom: 5px; font-size: 16px; color: #333;">Event Utensil Report</h2>
//       <p style="margin: 0; font-size: 12px;">Event Name: <strong>${EventId}</strong></p>
//       <p style="margin: 0; font-size: 10px; color: #666;">Generated on: ${new Date().toLocaleDateString()}</p>
//     `;
//     reportContainer.appendChild(header);

//     // Table Section
//     const table = document.createElement('table');
//     table.style.width = '100%';
//     table.style.borderCollapse = 'collapse';
//     table.style.fontSize = '10px';
//     table.style.border = '1px solid #ddd';

//     // Table Header
//     const headerRow = table.insertRow();
//     ['Category', 'Disposal', 'Outward', 'Inward'].forEach((text) => {
//       const th = document.createElement('th');
//       th.innerText = text;
//       th.style.border = '1px solid gray';
//       th.style.paddingBottom = '8px';
//       th.style.backgroundColor = '#318CE7';
//       th.style.color = 'white';
//       th.style.textAlign = 'center';
//       th.style.fontWeight = 'bold';
//       headerRow.appendChild(th);
//     });

//     // Table Rows
//     utensilList.forEach((item, index) => {
//       const row = table.insertRow();
//       row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#e6f2ff';

//       [
//         utensils?.data?.find((sub: any) => sub.id === item.utensilId)?.name ||
//           '',
//         item.utensilType,
//         item.taken,
//         item.returned,
//       ].forEach((text) => {
//         const cell = row.insertCell();
//         cell.innerText = text;
//         cell.style.border = '1px solid #ddd';
//         cell.style.paddingBottom = '8px';
//         cell.style.textAlign = 'center';
//         cell.style.height = '30px';
//       });
//     });

//     reportContainer.appendChild(table);

//     // Footer Section
//     const footer = document.createElement('div');
//     footer.style.marginTop = '10px';
//     footer.style.fontSize = '8px';
//     footer.style.textAlign = 'center';
//     footer.style.color = '#666';
//     footer.innerHTML = `<p>&copy; PhygitalTech. Contact: 9511640351.</p>`;
//     reportContainer.appendChild(footer);

//     document.body.appendChild(reportContainer);

//     // Convert to PDF
//     html2canvas(reportContainer, {scale: 1.5})
//       .then((canvas) => {
//         const doc = new jsPDF('p', 'mm', 'a4');
//         const imgData = canvas.toDataURL('image/jpeg', 0.8);
//         const imgWidth = 210;
//         const imgHeight = (canvas.height * imgWidth) / canvas.width;
//         const pageHeight = doc.internal.pageSize.height;
//         let offsetY = 0;

//         while (offsetY < imgHeight) {
//           if (offsetY > 0) {
//             doc.addPage();
//           }
//           doc.addImage(imgData, 'JPEG', 0, -offsetY, imgWidth, imgHeight);
//           offsetY += pageHeight;
//         }

//         doc.save('EventUtensilReport.pdf');
//       })
//       .finally(() => {
//         document.body.removeChild(reportContainer);
//       });
//   };

//   return (
//     <div className="mt-2.5 rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
//       <div
//         className="flex flex-row justify-between"
//         onClick={() => setIsOpen(!isOpen)}
//       >
//         <h2 className="mb-4 cursor-pointer text-xl font-bold">Disposals</h2>
//         <div className="flex gap-6">
//           <button
//             onClick={(e) => {
//               e.stopPropagation();
//               handleDownloadPDF();
//             }}
//             className="text-blue-500 underline"
//           >
//             Download PDF
//           </button>
//           <h2 className="cursor-pointer text-xl">
//             {isOpen ? <BiChevronUp size={30} /> : <BiChevronDown size={30} />}
//           </h2>
//         </div>
//       </div>
//       {isOpen && (
//         <FormProvider {...methods}>
//           <form onSubmit={handleSubmit(onSubmit)}>
//             <div ref={tableRef} className="max-w-full overflow-x-auto">
//               <table className="w-full table-auto">
//                 <thead>
//                   <tr className="bg-gray-2 text-left dark:bg-meta-4">
//                     {['Category', 'Disposal', 'Outward', 'Inward'].map(
//                       (column, index) => (
//                         <th
//                           key={index}
//                           className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white"
//                         >
//                           {column}
//                         </th>
//                       ),
//                     )}
//                   </tr>
//                 </thead>
//                 <tbody>
//                   {utensilList.map((utensil, index) => (
//                     <tr
//                       key={index}
//                       className="border-b border-stroke dark:border-strokedark"
//                     >
//                       <td className="px-4 pb-2.5">
//                         {utensils?.data?.find(
//                           (sub: any) => sub.id === utensil.categoryId,
//                         )?.name || ''}
//                       </td>
//                       <td className="px-4 pb-2.5">{utensil.utensilType}</td>
//                       <td className="px-4 pb-2.5">{utensil.taken}</td>
//                       <td className="px-4">
//                         <GenericInputField
//                           name={`utensils.${index}.updateReturned`}
//                           type="number"
//                         />
//                       </td>
//                     </tr>
//                   ))}
//                 </tbody>
//               </table>
//             </div>
//             <div className="mt-2.5 flex justify-end pb-5">
//               <GenericButton type="submit">Save</GenericButton>
//             </div>
//           </form>
//         </FormProvider>
//       )}
//     </div>
//   );
// };

// export default EventDisposals;

/*eslint-disable */
import React, {useEffect, useRef, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import GenericInputField from '@/components/Forms/Input/GenericInputField';
import GenericButton from '@/components/Forms/Buttons/GenericButton';
import {BiChevronDown, BiChevronUp} from 'react-icons/bi';
import {Route} from '@/routes/_app/_event/events.$id';
import z from 'zod';
import {bulkReturnDisposalToEventSchema} from '@/lib/validation/eventSchema';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {useGetEventDisposal} from '@/lib/react-query/queriesAndMutations/cateror/eventDisposal';
import {useBulkReturnEventUtensils} from '@/lib/react-query/queriesAndMutations/cateror/eventUtensils';
import {useGetDisposals} from '@/lib/react-query/queriesAndMutations/cateror/disposal';

// Schema for disposal
const DisposalSchema = z.object({
  disposalId: z.string(),
  categoryId: z.string(),
  taken: z.number(),
  returned: z.number(),
  updateReturned: z.number(),
  name: z.string(), // Add disposal name to the schema
});

type EventDisposal = z.infer<typeof DisposalSchema>;
type FormValues = z.infer<typeof bulkReturnDisposalToEventSchema>;

const EventDisposals: React.FunctionComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const methods = useForm<FormValues>({
    defaultValues: {
      eventId: '',
      disposals: [],
    },
  });

  const {handleSubmit, setValue} = methods;
  const {id: EventId} = Route.useParams();
  const {data: eventDisposals} = useGetEventDisposal(EventId);
  console.log(eventDisposals);

  const {data: categories} = useGetDisposals(
    localStorage.getItem('languageId') || '',
  ); // Fetch categories

  const [disposalList, setDisposalList] = useState<EventDisposal[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (eventDisposals) {
      const transformedData = eventDisposals.map((disposal: any) => ({
        disposalId: disposal.disposalId,
        categoryId: disposal.categoryId,
        taken: disposal.taken,
        returned: disposal.returned,
        updateReturned: disposal.returned,
        categoryName: disposal.category.name, // Add category name here
        name: disposal.name,
      }));
      setDisposalList(transformedData);
      setValue('disposals', transformedData);
    }
  }, [eventDisposals, setValue]);

  const {mutateAsync: bulkReturnDisposals} = useBulkReturnEventUtensils();

  const onSubmit = async (data: FormValues) => {
    const transformedData = data.disposals.map((disposal) => ({
      ...disposal,
      returned: Number(disposal.updateReturned),
    }));
    await bulkReturnDisposals({
      eventId: EventId,
      disposals: transformedData,
    });
  };

  const handleDownloadPDF = () => {
    if (!disposalList) return;

    const reportContainer = document.createElement('div');
    reportContainer.style.width = '500px';
    reportContainer.style.padding = '10px';
    reportContainer.style.background = 'white';
    reportContainer.style.fontFamily = 'Arial, sans-serif';

    // Header Section
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '15px';
    header.innerHTML = `
      <h2 style="margin-bottom: 5px; font-size: 16px; color: #333;">Event Disposal Report</h2>
      <p style="margin: 0; font-size: 12px;">Event Name: <strong>${EventId}</strong></p>
      <p style="margin: 0; font-size: 10px; color: #666;">Generated on: ${new Date().toLocaleDateString()}</p>
    `;
    reportContainer.appendChild(header);

    // Table Section
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '10px';
    table.style.border = '1px solid #ddd';

    // Table Header
    const headerRow = table.insertRow();
    ['Category', 'Disposal', 'Outward', 'Inward'].forEach((text) => {
      const th = document.createElement('th');
      th.innerText = text;
      th.style.border = '1px solid gray';
      th.style.paddingBottom = '8px';
      th.style.backgroundColor = '#318CE7';
      th.style.color = 'white';
      th.style.textAlign = 'center';
      th.style.fontWeight = 'bold';
      headerRow.appendChild(th);
    });

    // Table Rows
    disposalList.forEach((item, index) => {
      const row = table.insertRow();
      row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#e6f2ff';

      [
        categories?.data?.find((sub: any) => sub.id === item.categoryId)
          ?.name || '', // Category Name
        item.name, // Disposal Name
        item.taken, // Outward
        item.returned, // Inward
      ].forEach((text) => {
        const cell = row.insertCell();
        cell.innerText = text;
        cell.style.border = '1px solid #ddd';
        cell.style.paddingBottom = '8px';
        cell.style.textAlign = 'center';
        cell.style.height = '30px';
      });
    });

    reportContainer.appendChild(table);

    // Footer Section
    const footer = document.createElement('div');
    footer.style.marginTop = '10px';
    footer.style.fontSize = '8px';
    footer.style.textAlign = 'center';
    footer.style.color = '#666';
    footer.innerHTML = `<p>&copy; All Rights Reserved by PhygitalTech. Contact: 95116 40351.</p>`;
    reportContainer.appendChild(footer);

    document.body.appendChild(reportContainer);

    // Convert to PDF
    html2canvas(reportContainer, {scale: 1.5})
      .then((canvas) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 0.8);
        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageHeight = doc.internal.pageSize.height;
        let offsetY = 0;

        while (offsetY < imgHeight) {
          if (offsetY > 0) {
            doc.addPage();
          }
          doc.addImage(imgData, 'JPEG', 0, -offsetY, imgWidth, imgHeight);
          offsetY += pageHeight;
        }

        doc.save('EventDisposalReport.pdf');
      })
      .finally(() => {
        document.body.removeChild(reportContainer);
      });
  };

  return (
    <div className="mt-2.5 rounded-sm border border-stroke bg-white px-5 pb-2.5 pt-6 dark:border-strokedark dark:bg-boxdark sm:px-7.5 xl:pb-1">
      <div
        className="flex flex-row justify-between"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h2 className="mb-4 cursor-pointer text-xl font-bold">Disposals</h2>
        <div className="flex gap-6">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadPDF();
            }}
            className="text-blue-500 underline"
          >
            Download PDF
          </button>
          <h2 className="cursor-pointer text-xl">
            {isOpen ? <BiChevronUp size={30} /> : <BiChevronDown size={30} />}
          </h2>
        </div>
      </div>
      {isOpen && (
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div ref={tableRef} className="max-w-full overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    {['Category', 'Disposal', 'Outward'].map(
                      (column, index) => (
                        <th
                          key={index}
                          className="min-w-[120px] px-4 py-4 font-medium text-black dark:text-white"
                        >
                          {column}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {disposalList.map((disposal, index) => (
                    <tr
                      key={index}
                      className="border-b border-stroke dark:border-strokedark"
                    >
                      {/* Display Category Name */}
                      <td className="px-4 pb-2.5">
                        {disposal.categoryName || 'N/A'}{' '}
                        {/* Use categoryName here */}
                      </td>
                      {/* Display Disposal Name */}
                      <td className="px-4 pb-2.5">{disposal.name}</td>
                      {/* Display Taken Quantity */}
                      <td className="px-4 pb-2.5">{disposal.taken}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2.5 flex justify-end pb-5">
              <GenericButton type="submit">Save</GenericButton>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
};

export default EventDisposals;
