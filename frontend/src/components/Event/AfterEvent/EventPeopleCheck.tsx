import React, {useEffect, useRef, useState} from 'react';
import GenericButton from '@/components/Forms/Buttons/GenericButton';
import {FormProvider, useForm, SubmitHandler} from 'react-hook-form';
import {
  useGetActualPeople,
  useGetSubevent,
  useUpdateActualPeople,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {Route} from '@/routes/_app/_event/events.$id';
import {BiChevronDown, BiChevronUp} from 'react-icons/bi';
import {FiSave, FiDownload} from 'react-icons/fi';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {useAuthContext} from '@/context/AuthContext';

interface Dish {
  dish: {name: string};
  actual: number;
}

interface SubEvent {
  id: string;
  date: string;
  name: string;
  expectedPeople?: number;
  dishes: Dish[];
}

interface EventData {
  name: string;
  subEvents: SubEvent[];
}

interface FormValues {
  subEventPeople: {
    subEventId: string;
    expectedPeople: number;
    actualPeople: number;
    status: string;
  }[];
}

const EventPeopleCheck: React.FC = () => {
  const methods = useForm<FormValues>({
    defaultValues: {
      subEventPeople: [],
    },
  });
  const tableRef = useRef<HTMLDivElement>(null);
  const {
    control,
    handleSubmit,
    setValue,
    register,
    formState: {isSubmitting},
  } = methods;
  const {id: EventId} = Route.useParams();
  const {user} = useAuthContext();

  const {mutateAsync: updateActualPeople, isSuccess} = useUpdateActualPeople();
  const {data: subEvent} = useGetSubevent(EventId);
  const {data: actualPeople, refetch} = useGetActualPeople(EventId);

  const subeventPeople: EventData | undefined = subEvent?.data;
  const [isCollapsed, setIsCollapsed] = useState(true);

  const [subEventPeopleState, setSubEventPeopleState] = useState<{
    eventName: string;
    subEvents: {
      expectedPeople: string;
      subEventId: string;
      date: string;
      dishes: {
        dishName: string;
        quantity: number;
      }[];
    }[];
  } | null>(null);

  useEffect(() => {
    if (subeventPeople && actualPeople?.data?.subevents) {
      const eventName = subeventPeople.name;

      const formattedSubEvents = subeventPeople.subEvents.map((subEvent) => {
        const actualPeopleEntry = actualPeople.data.subevents.find(
          (sub) => sub.id === subEvent.id,
        );

        return {
          subEventId: subEvent.id,
          date: subEvent.date,
          expectedPeople: subEvent?.expectedPeople,
          actualPeople: actualPeopleEntry ? actualPeopleEntry.actualPeople : 0,
          dishes: subEvent.dishes.map((dishItem) => ({
            dishName: dishItem.dish?.name,
            quantity: dishItem.actual,
          })),
        };
      });

      setSubEventPeopleState({eventName, subEvents: formattedSubEvents});
      setValue('subEventPeople', formattedSubEvents);
    }
  }, [subeventPeople, actualPeople, setValue, isSuccess]);

  useEffect(() => {
    if (isSuccess) {
      refetch();
    }
  }, [isSuccess, refetch]);

  const onSubmit: SubmitHandler<FormValues> = async (data) => {
    const sendingData = data.subEventPeople.map((item) => ({
      subEventId: item.subEventId,
      actualPeople: Number(item.actualPeople),
    }));

    try {
      await updateActualPeople(sendingData);
      refetch();
    } catch (error) {
      console.error('Error updating people:', error);
    }
  };

  const handleDownloadPDF = () => {
    if (!subEventPeopleState) return;

    const reportContainer = document.createElement('div');
    reportContainer.style.width = '800px';
    reportContainer.style.padding = '20px';
    reportContainer.style.background = 'white';
    reportContainer.style.fontFamily = 'Arial, sans-serif';

    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '20px';
    header.innerHTML = `
      <h2 style="margin-bottom: 5px; font-size: 20px; color: #333;">Event People Report</h2>
      <p style="margin: 0; font-size: 14px;">Event Name: <strong>${subEventPeopleState.eventName}</strong></p>
       <div style="margin-bottom: 5px; ; padding: 8px; border-radius: 4px;">
        <p style="margin: 2px 0; font-size: 13px; color: #333;">
          <strong>Cateror:</strong> ${user?.fullname || 'N/A'} | 
          <strong>Phone:</strong> ${user?.phoneNumber || 'N/A'} | 
          <strong>Address:</strong> ${user?.address || 'N/A'}
        </p>
      </div>
    `;
    reportContainer.appendChild(header);

    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '14px';
    table.style.border = '1px solid #ddd';

    const headerRow = table.insertRow();
    ['Sub Event', 'Expected People', 'Actual People'].forEach((text) => {
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

    subEventPeopleState.subEvents.forEach((item, index) => {
      const row = table.insertRow();
      row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#e6f2ff';

      [
        subeventPeople?.subEvents?.find((sub) => sub.id === item.subEventId)
          ?.name || '',
        item.expectedPeople,
        item.actualPeople,
      ].forEach((text) => {
        const cell = row.insertCell();
        cell.innerText = text;
        cell.style.border = '1px solid #ddd';
        cell.style.padding = '8px';
        cell.style.textAlign = 'center';
        cell.style.color = 'black';
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
        const imgData = canvas.toDataURL('image/jpeg', 1);

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageHeight = doc.internal.pageSize.height;
        let offsetY = 0;

        while (offsetY < imgHeight) {
          if (offsetY > 0) doc.addPage();
          doc.addImage(imgData, 'JPEG', 0, -offsetY, imgWidth, imgHeight);
          offsetY += pageHeight;
        }

        doc.save('EventPeopleReport.pdf');
      })
      .finally(() => {
        document.body.removeChild(reportContainer);
      });
  };

  return (
    <div className="mt-2.5 rounded-lg border border-stroke bg-transparent bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4 flex items-center justify-between bg-gray-2 px-4 py-2 dark:bg-meta-4">
        <h2 className="text-gray-800 text-xl font-bold dark:text-white">
          People Check
        </h2>
        <div className="flex items-center gap-4">
          <button
            onClick={handleDownloadPDF}
            className="text-blue-500 underline"
          >
            Download PDF
          </button>
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full p-2"
          >
            {isCollapsed ? (
              <BiChevronDown size={24} />
            ) : (
              <BiChevronUp size={24} />
            )}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <FormProvider {...methods}>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div ref={tableRef} className="overflow-x-auto">
              <table className="text-gray-500 dark:text-gray-400 w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-400 bg-gray-2 text-xs uppercase dark:bg-black">
                  <tr>
                    <th scope="col" className="px-6 py-3">
                      Sub Event
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Expected People
                    </th>
                    <th scope="col" className="px-6 py-3">
                      Actual People
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {subEventPeopleState?.subEvents.map((item, index) => (
                    <tr
                      key={index}
                      className="dark:border-gray-700 dark:bg-gray-800 border-b bg-transparent"
                    >
                      <td className="text-gray-900 px-6 py-4 font-medium dark:text-white">
                        {subeventPeople?.subEvents?.find(
                          (sub) => sub.id === item.subEventId,
                        )?.name || ''}
                      </td>
                      <td className="px-6 py-4">{item.expectedPeople}</td>
                      <td className="px-6 py-4">
                        <input
                          {...register(`subEventPeople.${index}.actualPeople`)}
                          type="number"
                          className="dark:bg-gray-700 dark:border-gray-600 w-24 rounded border bg-transparent px-2 py-1 dark:text-white"
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
                disabled={isSubmitting}
                className="flex items-center gap-2 rounded-lg bg-green-600 px-6 py-2 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <FiSave /> {isSubmitting ? 'Saving...' : 'Save'}
              </GenericButton>
            </div>
          </form>
        </FormProvider>
      )}
    </div>
  );
};

export default EventPeopleCheck;
