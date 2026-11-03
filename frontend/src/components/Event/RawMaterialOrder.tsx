/* eslint-disable */
import React, {useState, useEffect} from 'react';
import {FaAngleDown, FaAngleRight, FaCopy, FaShare} from 'react-icons/fa';
import {getAllRawmaterialsFromEvent} from '@/lib/api/cateror/event';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import {
  useGetAllRawMaterialFromSubEvent,
  useGetEventRawMaterial,
  useGetSubevent,
} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {Route} from '@/routes/_app/_event/events.$id';
import hindiFontBase64 from '@/assets/js/hindiFontBase64';
import {useMatch} from '@tanstack/react-router';
import {shareLinkSchema, vendorSchema} from '@/lib/validation/vendorSchema';
import {zodResolver} from '@hookform/resolvers/zod';
import {useForm} from 'react-hook-form';
import {useAuthContext} from '@/context/AuthContext';
import toast from 'react-hot-toast';
import {
  useGetAllVendors,
  usePostExternalVendor,
} from '@/lib/react-query/queriesAndMutations/cateror/external';
import AllVendorsList from './RawMaterialComponents/AllVendors/AllVendorsList';
import {BiShare} from 'react-icons/bi';
import {BsShare} from 'react-icons/bs';
import html2canvas from 'html2canvas';
import ExtraRawmaterial from './ExtraRawmaterial';
import {useGetNewRawMaterialsFroSubevent} from '@/lib/react-query/queriesAndMutations/cateror/dish';

interface RawMaterial {
  quantity: number;
  maharaj: string;
  rawmaterialId: string;
  name: string;
  unit: string;
  subEvent: string;
  category: string;
}

interface ExtraRawMaterial {
  id: string;
  rawMaterialId: string;
  quantity: number;
  eventId: string;
  rawMaterial: {
    id: string;
    name: string;
    unit: string;
    categoryId: string;
    languageId: string;
    caterorId: string;
    inventory: number;
    amount: number;
  };
}

interface FormattedData {
  unformatedRawMaterials: RawMaterial[];
  maharajList: string[];
  subEventNameList: string[];
  formatedRawMaterials: RawMaterial[];
  subEventMaharajwiseRawMaterials: {
    [subEvent: string]: RawMaterial[];
  };
  maharajSubEventwiseRawMaterials: {
    [maharaj: string]: RawMaterial[];
  };
}

const RawMaterialOrder: React.FC = () => {
  const {user} = useAuthContext();
  const {id: EventId} = Route.useParams();
  const {data: vendorData} = useGetEventRawMaterial(EventId);
  const {data: extraAddedRawmaterials} =
    useGetNewRawMaterialsFroSubevent(EventId);
  const {mutate: sendExternalVendor} = usePostExternalVendor();
  const registrationLink = `${import.meta.env.VITE_EXTERNAL_VENDOR_BASE_URL}${user?.fullname.replace(/\s/g, '_')}/${user?.caterorId}/${EventId}`;
  const methods = useForm({
    resolver: zodResolver(shareLinkSchema),
    defaultValues: {
      EventId: EventId,
      sponsorId: user?.caterorId,
      link: registrationLink,
    },
  });

  const [rawMaterial, setRawMaterial] = useState<FormattedData | null>(null);
  const [filters, setFilters] = useState({
    subEvent: false,
    maharaj: false,
    category: true,
  });
  const [expanded, setExpanded] = useState<{[key: string]: boolean}>({});
  const [selectedColumns, setSelectedColumns] = useState({
    inventory: true,
    totalQuantity: true,
  }); // Function to sort raw materials alphabetically
  const sortRawMaterials = (
    materials: RawMaterial[] | undefined,
  ): RawMaterial[] => {
    if (!materials) return [];
    return materials.sort((a, b) => {
      return a.name.localeCompare(b.name, 'en', {sensitivity: 'base'});
    });
  };

  useEffect(() => {
    if (vendorData?.data) {
      const sortedMaterials = sortRawMaterials(
        vendorData.data.formatedRawMaterials,
      );
      setRawMaterial({
        ...vendorData.data,
        formatedRawMaterials: sortedMaterials,
      });
    }
  }, [vendorData]);
  const mergeRawMaterials = (materials: ExtraRawMaterial[] | undefined) => {
    if (!materials) return [];
    const merged: Record<string, ExtraRawMaterial> = {};

    materials.forEach((item) => {
      const key = item.rawMaterialId;
      if (merged[key]) {
        merged[key].quantity += item.quantity;
      } else {
        merged[key] = {...item};
      }
    });

    return Object.values(merged);
  };

  const mergedMaterials = mergeRawMaterials(extraAddedRawmaterials?.data);
  const toggleColumnSelection = (column: string) => {
    setSelectedColumns((prev) => ({...prev, [column]: !prev[column]}));
  };
  // if (!mergedMaterials || mergedMaterials.length === 0) {
  //   return null;
  // }

  const toggleExpand = (keyPath: string) => {
    setExpanded((prev) => ({...prev, [keyPath]: !prev[keyPath]}));
  };

  const getGroupedData = () => {
    if (!rawMaterial) return null;
    const baseData = rawMaterial.formatedRawMaterials;
    const mergedData: {[key: string]: RawMaterial} = {};

    baseData.forEach((item) => {
      const key = item.name;
      if (mergedData[key]) {
        mergedData[key].quantity += item.quantity;
      } else {
        mergedData[key] = {...item};
      }
    });

    const mergedDataArray = Object.values(mergedData);
    let groupedData: any = {};

    if (!filters.subEvent && !filters.maharaj && !filters.category) {
      groupedData['All Raw Materials'] = mergedDataArray;
    } else {
      if (filters.subEvent) {
        mergedDataArray.forEach((item) => {
          if (!groupedData[item.subEvent]) groupedData[item.subEvent] = [];
          groupedData[item.subEvent].push(item);
        });
      } else {
        groupedData['All Raw Materials'] = mergedDataArray;
      }

      if (filters.maharaj) {
        Object.keys(groupedData).forEach((groupKey) => {
          const groupArr = groupedData[groupKey];
          const maharajGroup: any = {};
          groupArr.forEach((item: RawMaterial) => {
            if (!maharajGroup[item.maharaj]) maharajGroup[item.maharaj] = [];
            maharajGroup[item.maharaj].push(item);
          });
          groupedData[groupKey] = maharajGroup;
        });
      }

      if (filters.category) {
        const groupByCategory = (dataToGroup: any): any => {
          if (Array.isArray(dataToGroup)) {
            const catGroup: any = {};
            dataToGroup.forEach((item: RawMaterial) => {
              if (!catGroup[item.category]) catGroup[item.category] = [];
              catGroup[item.category].push(item);
            });
            return catGroup;
          } else {
            const result: any = {};
            Object.keys(dataToGroup).forEach((key) => {
              result[key] = groupByCategory(dataToGroup[key]);
            });
            return result;
          }
        };
        groupedData = groupByCategory(groupedData);
      }
    }
    return groupedData;
  };

  const groupedData = getGroupedData();

  const handleSend = (eventId: string, data: any) => {
    sendExternalVendor({eventId, data});
  };

  const renderRows = (data: any, keyPath: string = ''): JSX.Element[] => {
    if (Array.isArray(data)) {
      return data.map((item, index) => (
        <tr key={`${keyPath}-${index}`} className="bg-white dark:bg-boxdark">
          <td className="w-1/5 border-stroke px-4 py-2 dark:border-strokedark">
            {item.name}
          </td>
          {selectedColumns.inventory && (
            <td className="w-1/5 border-stroke px-4 py-2 dark:border-strokedark">
              {typeof item.inventory === 'number'
                ? item.inventory.toFixed(2)
                : 0}
            </td>
          )}
          {selectedColumns.totalQuantity && (
            <td className="w-1/5 border-stroke px-4 py-2 dark:border-strokedark">
              <input
                disabled
                type="number"
                className="w-full bg-white dark:bg-boxdark"
                defaultValue={Number(item.quantity).toFixed(
                  item.quantity % 1 === 0 ? 0 : 1,
                )}
              />
            </td>
          )}
          <td className="w-1/5 border-stroke px-4 py-2 dark:border-strokedark">
            <div className="flex items-center gap-2">
              <input
                type="number"
                className="mt-2 w-24 rounded-md border border-stroke px-2 py-1 dark:border-strokedark dark:bg-meta-4 dark:text-white"
                defaultValue={Number(item.quantity).toFixed(
                  item.quantity % 1 === 0 ? 0 : 1,
                )}
              />
              <span className="text-gray-600 dark:text-gray-300 min-w-[80px] whitespace-nowrap text-sm">
                {item.unit}
              </span>
            </div>
          </td>
        </tr>
      ));
    } else {
      const rows: JSX.Element[] = [];
      Object.keys(data).forEach((groupKey) => {
        const currentPath = keyPath ? `${keyPath}-${groupKey}` : groupKey;
        const isExpanded =
          currentPath in expanded ? expanded[currentPath] : true;

        rows.push(
          <tr
            key={currentPath}
            className="cursor-pointer bg-gray dark:bg-black"
            onClick={() => toggleExpand(currentPath)}
          >
            <td
              colSpan={6}
              className="bg-gray-2 px-4 py-4 font-bold text-black dark:bg-meta-4 dark:text-white"
            >
              <div className="flex w-full items-center">
                <span className="mr-2">
                  {isExpanded ? <FaAngleDown /> : <FaAngleRight />}
                </span>
                <span className="mr-4">{groupKey}</span>
              </div>
            </td>
          </tr>,
        );
        if (isExpanded) {
          rows.push(...renderRows(data[groupKey], currentPath));
        }
      });
      return rows;
    }
  };

  const handleDownloadPDF = () => {
    if (!groupedData) return;

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
    <h2 style="margin-bottom: 5px; font-size: 20px; color: #333;">Raw Material Order Report</h2>
  
    <div style="margin-bottom: 5px; padding: 8px; border-radius: 4px;">
      <p style="margin: 2px 0; font-size: 13px; color: #333;">
        <strong>Cateror:</strong> ${user?.fullname || 'N/A'} | 
        <strong>Phone:</strong> ${user?.phoneNumber || 'N/A'} | 
        <strong>Address:</strong> ${user?.address || 'N/A'}
      </p>
    </div>
  `;
    reportContainer.appendChild(header);

    // Function to create a table for raw materials
    const createMaterialsTable = (
      title: string,
      data: any,
      isExtra = false,
    ) => {
      // Add section title if provided
      if (title) {
        const sectionTitle = document.createElement('h3');
        sectionTitle.innerText = title;
        sectionTitle.style.fontSize = '18px';
        sectionTitle.style.margin = '20px 0 10px 0';
        sectionTitle.style.color = '#333';
        sectionTitle.style.fontWeight = 'bold';
        reportContainer.appendChild(sectionTitle);
      }

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '14px';
      table.style.border = '1px solid #ddd';
      table.style.marginBottom = '20px';

      // Create table header
      const headerRow = table.insertRow();
      const columns = ['Name']; // Always show Name column

      if (selectedColumns.totalQuantity) {
        columns.push('Total Qty');
      }

      columns.push('Order Qty');

      if (selectedColumns.inventory && !isExtra) {
        columns.push('Inventory');
      }

      columns.forEach((text) => {
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

      // Function to render rows for PDF
      const renderPDFRows = (data: any, depth = 0) => {
        if (Array.isArray(data)) {
          data.forEach((item, index) => {
            const row = table.insertRow();
            row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#e6f2ff';

            // Name column (always shown)
            const nameCell = row.insertCell();
            nameCell.innerText = item.name || item.rawMaterial?.name;
            nameCell.style.border = '1px solid #ddd';
            nameCell.style.padding = '8px';
            nameCell.style.textAlign = 'left';
            nameCell.style.fontWeight = 'bold';
            nameCell.style.color = 'black';

            // Total Quantity column (conditional)
            if (selectedColumns.totalQuantity) {
              const totalQtyCell = row.insertCell();
              totalQtyCell.innerText = Number(item.quantity).toFixed(
                item.quantity % 1 === 0 ? 0 : 1,
              );
              totalQtyCell.style.border = '1px solid #ddd';
              totalQtyCell.style.padding = '8px';
              totalQtyCell.style.textAlign = 'center';
              totalQtyCell.style.color = 'black';
            }

            // Order Quantity column (always shown with unit)
            const orderQtyCell = row.insertCell();
            orderQtyCell.innerText = `${Number(item.quantity).toFixed(
              item.quantity % 1 === 0 ? 0 : 1,
            )} ${item.unit || item.rawMaterial?.unit}`;
            orderQtyCell.style.border = '1px solid #ddd';
            orderQtyCell.style.padding = '8px';
            orderQtyCell.style.textAlign = 'center';
            orderQtyCell.style.color = 'black';

            // Inventory column (conditional)
            if (selectedColumns.inventory && !isExtra) {
              const inventoryCell = row.insertCell();
              inventoryCell.innerText =
                typeof item.inventory === 'number'
                  ? item.inventory.toFixed(2)
                  : '0';
              inventoryCell.style.border = '1px solid #ddd';
              inventoryCell.style.padding = '8px';
              inventoryCell.style.textAlign = 'center';
              inventoryCell.style.color = 'black';
            }
          });
        } else {
          Object.keys(data).forEach((key) => {
            // Add group header row
            const groupRow = table.insertRow();
            groupRow.style.backgroundColor = '#f5f5f5';

            const groupCell = groupRow.insertCell();
            groupCell.colSpan = columns.length; // Span all columns
            groupCell.innerText = key;
            groupCell.style.border = '1px solid #ddd';
            groupCell.style.padding = '8px';
            groupCell.style.fontWeight = 'bold';
            groupCell.style.textAlign = 'left';
            groupCell.style.color = 'black';

            renderPDFRows(data[key], depth + 1);
          });
        }
      };

      renderPDFRows(data);
      reportContainer.appendChild(table);
    };

    // Create main raw materials table
    createMaterialsTable('Main Raw Materials', groupedData);

    // Create extra raw materials table if data exists
    if (
      extraAddedRawmaterials?.data &&
      extraAddedRawmaterials.data.length > 0
    ) {
      // Merge duplicate raw materials and sum their quantities
      const mergedExtraMaterials: Record<string, any> = {};
      extraAddedRawmaterials.data.forEach((item: any) => {
        const key = item.rawMaterialId;
        if (mergedExtraMaterials[key]) {
          mergedExtraMaterials[key].quantity += item.quantity;
        } else {
          mergedExtraMaterials[key] = {
            ...item,
            name: item.rawMaterial.name,
            unit: item.rawMaterial.unit,
          };
        }
      });
      const mergedExtraMaterialsArray = Object.values(mergedExtraMaterials);

      createMaterialsTable(
        'Extra Raw Materials',
        mergedExtraMaterialsArray,
        true,
      );
    }

    // Add notes section
    const notesSection = document.createElement('div');
    notesSection.style.marginTop = '20px';
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

    // Add footer
    const footer = document.createElement('div');
    footer.style.marginTop = '20px';
    footer.style.fontSize = '10px';
    footer.style.textAlign = 'center';
    footer.style.color = '#666';
    footer.innerHTML = `<p>&copy; All Rights Reserved by PhygitalTech. Contact: 95116 40351.</p>`;
    reportContainer.appendChild(footer);

    document.body.appendChild(reportContainer);

    // Convert to image and generate PDF
    html2canvas(reportContainer, {
      scale: 10,
      useCORS: true,
      logging: false,
      allowTaint: true,
    })
      .then((canvas) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 0.8);

        const imgWidth = 210;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const pageHeight = doc.internal.pageSize.height;
        let offsetY = 0;

        while (offsetY < imgHeight) {
          if (offsetY > 0) doc.addPage();
          doc.addImage(imgData, 'JPEG', 0, -offsetY, imgWidth, imgHeight);
          offsetY += pageHeight;
        }

        doc.save('RawMaterialOrderReport.pdf');
      })
      .catch((error) => {
        console.error('Error generating PDF:', error);
        toast.error('Failed to generate PDF');
      })
      .finally(() => {
        document.body.removeChild(reportContainer);
      });
  };

  const handleshare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Check this out!',
        text: 'Join us using this registration link.',
        url: registrationLink,
      });
    } else {
      navigator.clipboard.writeText(registrationLink);
    }
  };

  return (
    <>
      <div className="rounded-sm sm:px-7.5 xl:pb-1">
        <div className="dark flex items-center justify-between bg-gray-2 p-4 dark:bg-meta-4">
          <h2 className="mb-4 text-xl font-bold">Raw Material Order</h2>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDownloadPDF();
            }}
            className="text-blue-500 underline"
          >
            Download PDF
          </button>
        </div>
        {/* Column selection checkboxes */}
        <div className="mb-4 flex items-center gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedColumns.inventory}
              onChange={() => toggleColumnSelection('inventory')}
              className="mr-2"
            />
            Include Inventory Column
          </label>
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={selectedColumns.totalQuantity}
              onChange={() => toggleColumnSelection('totalQuantity')}
              className="mr-2"
            />
            Include Total Quantity Column
          </label>
        </div>
        <div className="min-w-full overflow-x-auto">
          <table className="min-w-full table-auto">
            <thead>
              <tr className="bg-gray-2 text-left dark:bg-meta-4">
                <th className="w-2/5 px-4 py-4 font-medium text-black dark:text-white">
                  Name
                </th>
                {selectedColumns.inventory && (
                  <th className="w-1/5 px-4 py-4 font-medium text-black dark:text-white">
                    Inventory
                  </th>
                )}
                {selectedColumns.totalQuantity && (
                  <th className="w-1/5 px-4 py-4 font-medium text-black dark:text-white">
                    Total Qty
                  </th>
                )}
                <th className="w-2/5 px-4 py-4 font-medium text-black dark:text-white">
                  Order Quantity
                </th>
              </tr>
            </thead>
            <tbody>
              {groupedData ? (
                renderRows(groupedData)
              ) : (
                <tr>
                  <td
                    colSpan={6}
                    className="border-b border-[#eee] px-4 py-4 text-center"
                  >
                    No data found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
          <div className="border-stroke bg-white pb-2.5 dark:border-strokedark dark:bg-boxdark xl:pb-1">
            <h2 className="mb-4 text-xl font-bold">Extra Raw Material List</h2>
            <div className="min-w-full overflow-x-auto">
              <table className="min-w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="w-2/5 px-4 py-4 font-medium text-black dark:text-white">
                      Name
                    </th>
                    <th className="w-1/5 px-4 py-4 font-medium text-black dark:text-white">
                      Total Qty
                    </th>
                    <th className="w-2/5 px-4 py-4 font-medium text-black dark:text-white">
                      Order Quantity
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {mergedMaterials.map((item, index) => (
                    <tr
                      key={`extra-${index}`}
                      className="bg-white dark:bg-boxdark"
                    >
                      <td className="w-1/5 border-stroke px-4 py-2 dark:border-strokedark">
                        {item.rawMaterial.name}
                      </td>
                      <td className="w-1/5 border-stroke px-4 py-2 dark:border-strokedark">
                        <input
                          disabled
                          type="number"
                          className="w-full bg-white dark:bg-boxdark"
                          defaultValue={Number(item.quantity).toFixed(
                            item.quantity % 1 === 0 ? 0 : 1,
                          )}
                        />
                      </td>
                      <td className="w-1/5 border-stroke px-4 py-2 dark:border-strokedark">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            className="mt-2 w-24 rounded-md border border-stroke px-2 py-1 dark:border-strokedark dark:bg-meta-4 dark:text-white"
                            defaultValue={Number(item.quantity).toFixed(
                              item.quantity % 1 === 0 ? 0 : 1,
                            )}
                          />
                          <span className="text-gray-600 dark:text-gray-300 min-w-[80px] whitespace-nowrap text-sm">
                            {item.rawMaterial.unit}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ExtraRawmaterial />
          </div>
          <div className="mr-6 flex justify-end">
            <div className="mb-5 ml-4 mt-4 flex">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleSend(EventId, rawMaterial?.formatedRawMaterials || []);
                  handleshare();
                }}
                className={`hover:bg-primary-dark mx-1 rounded bg-primary px-6 py-1 text-white transition duration-300 ease-in-out disabled:cursor-not-allowed disabled:opacity-50`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="mt-4"></div>
    </>
  );
};

export default RawMaterialOrder;
