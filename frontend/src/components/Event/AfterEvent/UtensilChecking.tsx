/* eslint-disable  */

import React, {useEffect, useRef, useState} from 'react';
import {FormProvider, useForm} from 'react-hook-form';
import GenericInputField from '@/components/Forms/Input/GenericInputField';
import GenericButton from '@/components/Forms/Buttons/GenericButton';
import {BiChevronDown, BiChevronUp} from 'react-icons/bi';
import {
  useBulkReturnEventUtensils,
  useGetEventUtensils,
} from '@/lib/react-query/queriesAndMutations/cateror/eventUtensils';
import {Route} from '@/routes/_app/_event/events.$id';
import {
  useGetUtensils,
  useGetUtensilCategories,
} from '@/lib/react-query/queriesAndMutations/cateror/utensils';
import z from 'zod';
import {
  bulkReturnUtensilToEventSchema,
  eventUtensilSchema,
} from '@/lib/validation/eventSchema';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {FiSave} from 'react-icons/fi';

// Extend your utensil schema with a default utensil type.
const UtensilSchema = eventUtensilSchema.extend({
  utensilType: z.string().default('FORK'),
});

type EventUtensil = z.infer<typeof UtensilSchema>;
type FormValues = z.infer<typeof bulkReturnUtensilToEventSchema>;

const UtensilChecking: React.FunctionComponent = () => {
  const [isOpen, setIsOpen] = useState(false);
  const methods = useForm<FormValues>({
    defaultValues: {
      eventId: '',
      utensils: [],
    },
  });

  const {handleSubmit, setValue, reset} = methods;
  const {id: EventId} = Route.useParams();
  const {data: eventUtensils} = useGetEventUtensils(EventId);
  console.log('====================================');
  console.log(eventUtensils);
  console.log('====================================');
  const {data: utensils} = useGetUtensils(
    localStorage.getItem('languageId') || '',
  );

  const {data: utensilCategories} = useGetUtensilCategories();

  // State for category and utensil names
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>(
    {},
  );
  const [utensilNames, setUtensilNames] = useState<Record<string, string>>({});
  const [utensilList, setUtensilList] = useState<EventUtensil[]>([]);
  const tableRef = useRef<HTMLDivElement>(null);

  // Initialize category names
  useEffect(() => {
    if (utensilCategories?.data) {
      const names: Record<string, string> = {};
      utensilCategories.data.forEach((category: {id: string; name: string}) => {
        names[category.id] = category.name;
      });
      setCategoryNames(names);
    }
  }, [utensilCategories]);

  // Initialize utensil names
  useEffect(() => {
    if (utensils?.data) {
      const names: Record<string, string> = {};
      utensils.data.forEach((utensil: {id: string; name: string}) => {
        names[utensil.id] = utensil.name;
      });
      setUtensilNames(names);
    }
  }, [utensils]);

  // Initialize utensil list with category and utensil names
  useEffect(() => {
    if (eventUtensils && utensils?.data) {
      const transformedData = eventUtensils.map((utensil: EventUtensil) => {
        const foundUtensil = utensils.data.find(
          (u: any) => u.id === utensil.utensilId,
        );
        return {
          ...utensil,
          utensilType: 'FORK', // Default value
          taken: utensil.taken,
          returned: utensil.returned,
          fetchedReturned: utensil.returned,
          updateReturned: utensil.returned,
          categoryName: foundUtensil
            ? categoryNames[foundUtensil.categoryId]
            : 'Unknown',
          utensilName: foundUtensil ? utensilNames[foundUtensil.id] : 'Unknown',
        };
      });
      setUtensilList(transformedData);
      setValue('utensils', transformedData);
    }
  }, [eventUtensils, utensils, categoryNames, utensilNames, setValue]);

  const {mutateAsync: bulkReturnUtensils, isPending} =
    useBulkReturnEventUtensils();

  const onSubmit = async (data: FormValues) => {
    const transformedData = data.utensils.map((utensil) => ({
      ...utensil,
      returned: Number(utensil.updateReturned),
    }));
    await bulkReturnUtensils({
      eventId: EventId,
      utensils: transformedData,
    });
  };

  const handleDownloadPDF = () => {
    if (!utensilList || !utensilCategories) return;

    const reportContainer = document.createElement('div');
    reportContainer.style.width = '800px';
    reportContainer.style.padding = '20px';
    reportContainer.style.background = 'white';
    reportContainer.style.fontFamily = 'Arial, sans-serif';

    // Header Section
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '20px';

    // Safely access the event name with proper null checks
    const eventName = eventUtensils[0]?.event?.name || 'N/A';

    header.innerHTML = `
  <h2 style="margin-bottom: 5px; font-size: 16px; color: #333;">Event Utensil Report</h2>
  <p style="margin: 0; font-size: 14px;">Event Name: <strong>${eventName}</strong></p>
  <p style="margin: 0; font-size: 12px;">Generated on: ${new Date().toLocaleDateString()}</p>
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
    ['Category', 'Utensil', 'Outward', 'Inward'].forEach((text) => {
      const th = document.createElement('th');
      th.innerText = text;
      th.style.border = '1px solid gray';
      th.style.padding = '8px';
      th.style.backgroundColor = '#318CE7';
      th.style.color = 'white';
      th.style.textAlign = 'center';
      th.style.fontWeight = 'bold';
      headerRow.appendChild(th);
    });

    // Table Rows with Alternating Colors
    utensilList.forEach((item, index) => {
      const row = table.insertRow();
      row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#e6f2ff';

      [
        item.categoryName || 'Unknown',
        item.utensilName || 'Unknown',
        item.taken,
        item.returned,
      ].forEach((text) => {
        const cell = row.insertCell();
        cell.innerText = String(text);
        cell.style.border = '1px solid #ddd';
        cell.style.padding = '8px';
        cell.style.textAlign = 'center';
        cell.style.height = '30px';
      });
    });

    reportContainer.appendChild(table);

    // Notes Section
    const notesSection = document.createElement('div');
    notesSection.style.marginTop = '10px';
    notesSection.style.marginBottom = '20px';

    const notesTitle = document.createElement('h3');
    notesTitle.innerText = 'Notes:';
    notesTitle.style.fontSize = '16px';
    notesTitle.style.marginBottom = '10px';
    notesTitle.style.color = '#333';
    notesSection.appendChild(notesTitle);

    const notesBox = document.createElement('div');
    notesBox.style.border = '1px solid #ddd';
    notesBox.style.borderRadius = '8px';
    notesBox.style.padding = '15px';
    notesBox.style.minHeight = '100px';
    notesBox.style.backgroundColor = '#f9f9f9';
    notesBox.innerHTML = `<div style="display: flex; flex-direction: column; gap: 80px;"></div>`;
    notesSection.appendChild(notesBox);
    reportContainer.appendChild(notesSection);

    const footer = document.createElement('div');
    footer.style.marginTop = '20px';
    footer.style.fontSize = '10px';
    footer.style.textAlign = 'center';
    footer.style.color = '#666';
    footer.innerHTML = `<p>&copy; All Rights Reserved by PhygitalTech. Contact: 95116 40351.</p>`;
    reportContainer.appendChild(footer);

    document.body.appendChild(reportContainer);

    const options = {
      scale: 10,
      logging: false,
      useCORS: true,
      allowTaint: true,
      letterRendering: true,
      quality: 1,
      windowWidth: reportContainer.scrollWidth,
      windowHeight: reportContainer.scrollHeight,
    };

    html2canvas(reportContainer, options)
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

        doc.save('EventUtensilReport.pdf');
      })
      .finally(() => {
        document.body.removeChild(reportContainer);
      });
  };

  return (
    <div className="mt-2.5 rounded-lg border border-stroke bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4 flex items-center justify-between bg-gray-2 px-4 py-2 dark:bg-meta-4">
        <h2 className="text-gray-800 text-xl font-bold dark:text-white">
          Utensil Checking
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadPDF();
            }}
            className="text-blue-500 underline"
          >
            Download PDF
          </button>
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2"
          >
            {isOpen ? <BiChevronUp size={24} /> : <BiChevronDown size={24} />}
          </button>
        </div>
      </div>

      {isOpen && (
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div ref={tableRef} className="overflow-x-auto">
              <table className="text-gray-500 dark:text-gray-400 w-full text-left text-sm">
                <thead className="text-gray-700 bg-gray-50 dark:bg-gray-700 dark:text-gray-400 bg-gray-2 text-xs uppercase dark:bg-black">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Category
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Utensil
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Outward
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Inward
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {utensilList.map((item, index) => (
                    <tr
                      key={index}
                      className="dark:bg-gray-800 dark:border-gray-700 border-b bg-transparent"
                    >
                      <td className="text-gray-900 px-6 py-4 font-medium dark:text-white">
                        {item.categoryName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">
                        {item.utensilName || 'Unknown'}
                      </td>
                      <td className="px-6 py-4">{item.taken}</td>
                      <td className="w-40 px-6 py-4">
                        <GenericInputField
                          name={`utensils.${index}.updateReturned`}
                          type="number"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-6 flex justify-end">
              <GenericButton
                type="submit"
                disabled={isPending}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <FiSave /> {isPending ? 'Saving...' : 'Save '}
              </GenericButton>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
};

export default UtensilChecking;
