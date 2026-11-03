/* eslint-disable  */
import React, {useState, useRef} from 'react';
import {Route} from '@/routes/_app/_event/events.$id';
import {
  useGetSubevent,
  useGetWastages,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {BiChevronDown, BiChevronUp} from 'react-icons/bi';
import {FiDownload} from 'react-icons/fi';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DishWastage from './DishWastage';
import GenericButton from '@/components/Forms/Buttons/GenericButton';
import {useAuthContext} from '@/context/AuthContext';

interface SubEvent {
  id: string;
  name: string;
  [key: string]: string;
}

interface SubEventResponse {
  data: {
    subEvents: SubEvent[];
    name?: string;
  };
}

const WastageReport: React.FC = () => {
  const {user} = useAuthContext();
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const tableRef = useRef<HTMLDivElement>(null);
  const {id: EventId} = Route.useParams<{id: string}>();
  const {data: wastagesData} = useGetWastages(EventId);
  const {data: subEventResponse} = useGetSubevent(EventId) as {
    data?: SubEventResponse;
  };

  const subEvents: SubEvent[] = subEventResponse?.data.subEvents || [];

  const handleDownloadPDF = () => {
    if (!subEvents || !wastagesData) return;

    const reportContainer = document.createElement('div');
    reportContainer.style.width = '800px';
    reportContainer.style.padding = '20px';
    reportContainer.style.background = 'white';
    reportContainer.style.fontFamily = 'Arial, sans-serif';

    // Header Section (unchanged)
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '20px';
    header.innerHTML = `
    <h2 style="margin-bottom: 5px; font-size: 20px; color: #333;">Wastage Report</h2>
    <p style="margin: 0; font-size: 14px;">Event Name: <strong>${subEventResponse?.data?.name || 'N/A'}</strong></p>
     <div style="margin-bottom: 5px; padding: 8px; border-radius: 4px;">
      <p style="margin: 2px 0; font-size: 13px; color: #333;">
        <strong>Cateror:</strong> ${user?.fullname || 'N/A'} | 
        <strong>Phone:</strong> ${user?.phoneNumber || 'N/A'} | 
        <strong>Address:</strong> ${user?.address || 'N/A'}
      </p>
    </div>
  `;
    reportContainer.appendChild(header);

    // Table Section
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '14px';
    table.style.border = '1px solid #ddd';

    // Table Header (unchanged)
    const headerRow = table.insertRow();
    ['Sub Event', 'Dish', 'Quantity', 'Unit'].forEach((text) => {
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

    // Fixed Table Rows Section
    subEvents.forEach((subEvent) => {
      const subEventWastage = wastagesData.data?.subEvents?.find(
        (wastageEvent) => wastageEvent.id === subEvent.id,
      );

      if (subEventWastage?.wastage?.length) {
        subEventWastage.wastage.forEach((wastage: any, index: number) => {
          const row = table.insertRow();
          row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#e6f2ff';

          // Ensure proper access to quantity value
          const quantity =
            wastage.quantity !== undefined && wastage.quantity !== null
              ? wastage.quantity.toString()
              : '0';

          [
            subEvent.name,
            wastage.dish?.name || 'N/A',
            quantity, // Use the properly accessed quantity here
            wastage.measurement || 'N/A',
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
        // Add a row indicating no wastage for this sub-event
        const row = table.insertRow();
        row.style.backgroundColor = '#ffffff';

        const cell = row.insertCell();
        cell.colSpan = 4;
        cell.innerText = `No wastage recorded for ${subEvent.name}`;
        cell.style.border = '1px solid #ddd';
        cell.style.padding = '8px';
        cell.style.textAlign = 'center';
        cell.style.fontStyle = 'italic';
        cell.style.color = '#666';
      }
    });

    reportContainer.appendChild(table);

    // Rest of your code (notes section, footer, PDF generation) remains the same
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
      scale: 2, // Reduced from 10 for better performance
      logging: true, // Enabled for debugging
      useCORS: true,
      allowTaint: true,
      letterRendering: true,
      quality: 1,
      width: reportContainer.scrollWidth,
      height: reportContainer.scrollHeight,
    };

    html2canvas(reportContainer, options)
      .then((canvas) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 1);

        const imgWidth = doc.internal.pageSize.getWidth() - 20;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        doc.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);
        doc.save('WastageReport.pdf');
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
      })
      .finally(() => {
        document.body.removeChild(reportContainer);
      });
  };

  return (
    <div className="mt-2.5 rounded-lg border border-stroke bg-transparent bg-white p-6 shadow-sm dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4 flex items-center justify-between bg-gray-2 px-4 py-2 dark:bg-meta-4">
        <h2 className="text-gray-800 text-xl font-bold dark:text-white">
          Wastage Report
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
        <div ref={tableRef} className="flex flex-col gap-4">
          {subEvents.map((subEvent) => (
            <div key={subEvent.id} className="flex flex-col gap-4">
              <DishWastage subEvent={subEvent} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WastageReport;
