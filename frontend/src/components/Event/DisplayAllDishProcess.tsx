/* eslint-disable  */
import React, {useRef, useState} from 'react';
import {BiChevronDown, BiChevronUp} from 'react-icons/bi';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  useGetSubevent,
  useGetAllDishProcess,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {Route} from '@/routes/_app/_event/events.$id';
import DishProcess from './DishProcess';
import {Loader} from '../Loader/Loader';

interface SubEvent {
  id: string;
  name: string;
  dishes: {
    id: string;
    name: string;
    processes: {
      processId: string;
      process: {
        id: string;
        name: string;
      };
      rawMaterials: {
        id: string;
        name: string;
        unit: string;
      };
    }[];
  }[];
}

interface SubEventResponse {
  data: {
    subEvents: SubEvent[];
    name?: string;
  };
}

const DisplayAllDishProcess = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const tableRef = useRef<HTMLDivElement>(null);
  const {id: EventId} = Route.useParams<{id: string}>();
  const {data: getAllProcess, isFetching} = useGetAllDishProcess(EventId);
  console.log('dddddddddd', getAllProcess);

  const {data: subEventResponse} = useGetSubevent(EventId) as {
    data?: SubEventResponse;
  };

  const normalizeSubEvents = (subEvents: any[]): SubEvent[] => {
    return (subEvents || []).map((subEvent) => ({
      ...subEvent,
      dishes: (subEvent.dishes || []).map((dish: any) => ({
        ...dish,
        processes: (dish.processes || []).map((proc: any) => ({
          processId: proc.id,
          process: {
            id: proc.id,
            name: proc.name,
          },
          rawMaterials: {
            id: proc.rawMaterial?.id || '',
            name: proc.rawMaterial?.name || '',
            unit: 'N/A', // default or fallback\
            quantity: proc.rawMaterial?.quantity || '',
          },
        })),
      })),
    }));
  };

  // if (true) {
  //   return (
  //     <div className="mt-10 flex items-center justify-center">
  //       <Loader />
  //     </div>
  //   );
  // }

  const rawSubEvents = getAllProcess?.data?.subEvents || [];
  const subEvents: SubEvent[] = normalizeSubEvents(rawSubEvents);

  const handleDownloadPDF = () => {
    if (!subEvents) return;

    const reportContainer = document.createElement('div');
    reportContainer.style.width = '800px';
    reportContainer.style.padding = '20px';
    reportContainer.style.background = 'white';
    reportContainer.style.fontFamily = 'Arial, sans-serif';

    // Header Section
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '20px';
    header.innerHTML = `
      <h2 style="margin-bottom: 5px; font-size: 20px; color: #333;">Dish Process Report</h2>
      <p style="margin: 0; font-size: 14px;">Event Name: <strong>${subEventResponse?.data?.name || 'N/A'}</strong></p>
      <p style="margin: 0; font-size: 14px;">Generated on: ${new Date().toLocaleDateString()}</p>
    `;
    reportContainer.appendChild(header);

    // Table Section
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '14px';
    table.style.border = '1px solid #ddd';

    // Table Header
    const headerRow = table.insertRow();
    ['Sub Event', 'Dish', 'Process', 'Raw Material'].forEach((text) => {
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

    // Table Rows
    subEvents.forEach((subEvent) => {
      subEvent.dishes.forEach((dish) => {
        if (dish.processes.length > 0) {
          dish.processes.forEach((process) => {
            const row = table.insertRow();
            row.style.backgroundColor = '#ffffff';

            [
              subEvent.name,
              dish.name,
              process.process.name,
              process.rawMaterials.name,
            ].forEach((text) => {
              const cell = row.insertCell();
              cell.innerText = text;
              cell.style.border = '1px solid #ddd';
              cell.style.padding = '8px';
              cell.style.textAlign = 'center';
              cell.style.height = '30px';
            });
          });
        } else {
          const row = table.insertRow();
          row.style.backgroundColor = '#ffffff';

          [subEvent.name, dish.name, 'No process', 'N/A', 'N/A'].forEach(
            (text) => {
              const cell = row.insertCell();
              cell.innerText = text;
              cell.style.border = '1px solid #ddd';
              cell.style.padding = '8px';
              cell.style.textAlign = 'center';
              cell.style.height = '30px';
            },
          );
        }
      });
    });

    reportContainer.appendChild(table);

    // Footer Section
    const footer = document.createElement('div');
    footer.style.marginTop = '10px';
    footer.style.fontSize = '9px';
    footer.style.textAlign = 'center';
    footer.style.color = '#666';
    footer.innerHTML = `<p>&copy; All Rights Reserved by PhygitalTech. Contact: 95116 40351.</p>`;
    reportContainer.appendChild(footer);

    document.body.appendChild(reportContainer);

    html2canvas(reportContainer, {scale: 1, useCORS: true})
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

        doc.save('DishProcessReport.pdf');
      })
      .finally(() => {
        document.body.removeChild(reportContainer);
      });
  };

  return (
    <div className="rounded-lg border-stroke bg-transparent bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4 flex items-center justify-between p-4 dark:bg-meta-4">
        <h2 className="text-gray-800 text-xl font-bold">Event Dish Process</h2>
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
        <div ref={tableRef} className="flex flex-col gap-4">
          {subEvents.map((subEvent) => (
            <div key={subEvent.id} className="flex flex-col gap-4">
              <DishProcess subEvent={subEvent} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default DisplayAllDishProcess;
