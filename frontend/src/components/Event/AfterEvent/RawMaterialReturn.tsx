/* eslint-disable  */
import React, {useEffect, useMemo, useState} from 'react';
import {
  FormProvider,
  useForm,
  UseFormReturn,
  SubmitHandler,
} from 'react-hook-form';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import html2canvas from 'html2canvas';
import GenericSearchDropdown from '@/components/Forms/SearchDropDown/GenericSearchDropdown';
import GenericInputField from '@/components/Forms/Input/GenericInputField';
import GenericButton from '@/components/Forms/Buttons/GenericButton';
import {Route} from '@/routes/_app/_event/events.$id';
import {useGetAllRawMaterialFromSubEvent} from '@/lib/react-query/queriesAndMutations/cateror/event';
import {useGetRawMaterialsCateror} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import {BiChevronDown, BiChevronUp} from 'react-icons/bi';
import {FiSave, FiDownload} from 'react-icons/fi';
import {useAddRawMaterialToInventory} from '@/lib/react-query/queriesAndMutations/cateror/inventorydata';
import {useAuthContext} from '@/context/AuthContext';

interface RawMaterialItem {
  rawMaterialId: string;
  quantity: number;
  unit: string;
  categoryId: string;
  categoryName?: string;
}

interface FlattenedRawMaterial extends RawMaterialItem {
  [key: string]: any;
}

interface CategoryGroup {
  categoryId: string;
  categoryName: string;
  rawMaterials: FlattenedRawMaterial[];
}

interface FormValues {
  rawMaterials: {
    rawMaterialId: string;
    totalQuantity: number;
    unit: string;
    type: string;
    vendor: string;
    categoryId: string;
    categoryName?: string;
  }[];
}

const RawMaterialReturn: React.FC = () => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(true);
  const methods: UseFormReturn<FormValues> = useForm<FormValues>({
    defaultValues: {
      rawMaterials: [],
    },
  });
  const {user} = useAuthContext();
  const {control, reset, watch, handleSubmit} = methods;
  const {id: EventId} = Route.useParams();

  const {data: rawMaterial} = useGetAllRawMaterialFromSubEvent(EventId);
  console.log('====================================');
  console.log(rawMaterial);
  console.log('====================================');
  const {data: rawMaterialResponse} = useGetRawMaterialsCateror();

  const {mutateAsync: addRawMaterialToInventory, isPending} =
    useAddRawMaterialToInventory();

  const rawMaterialOptions =
    rawMaterialResponse?.data.rawMaterials.map(
      (item: {
        id: string;
        name: string;
        category: {id: string; name: string};
      }) => ({
        label: item.name,
        value: item.id,
        categoryId: item.category.id,
        categoryName: item.category.name,
      }),
    ) || [];

  const flattenResult: FlattenedRawMaterial[] = useMemo(() => {
    if (!rawMaterial || !Array.isArray(rawMaterial.data)) return [];

    return rawMaterial.data.reduce(
      (
        acc: FlattenedRawMaterial[],
        item: {
          rawMaterials: RawMaterialItem[];
          categoryId: string;
          categoryName?: string;
        },
      ) => {
        if (Array.isArray(item.rawMaterials)) {
          item.rawMaterials.forEach((rawMaterial) => {
            acc.push({
              ...rawMaterial,
              unit: rawMaterial.unit || 'kg',
              categoryId: item.categoryId,
              // categoryName: item.categoryName || `Category ${item.categoryId}`,
            });
          });
        }
        return acc;
      },
      [],
    );
  }, [rawMaterial]);

  // Group by category
  const categoryGroups: CategoryGroup[] = useMemo(() => {
    const mergedData = flattenResult.reduce((acc, item) => {
      const existingItem = acc.find(
        (i) =>
          i.rawMaterialId === item.rawMaterialId &&
          i.categoryId === item.categoryId,
      );
      if (existingItem) {
        existingItem.quantity += item.quantity;
      } else {
        acc.push({...item});
      }
      // console.log("item",item);
      return acc;
    }, [] as FlattenedRawMaterial[]);

    // Group by category
    const grouped = mergedData.reduce((acc, item) => {
      const category = acc.find((c) => c.categoryId === item.categoryId);
      if (category) {
        category.rawMaterials.push(item);
      } else {
        acc.push({
          categoryId: item.categoryId,
          categoryName: item.categoryName || `Category ${item.categoryName}`,
          rawMaterials: [item],
        });
      }
      return acc;
    }, [] as CategoryGroup[]);
    return grouped;
  }, [flattenResult]);

  useEffect(() => {
    const initialFormValues = categoryGroups.flatMap((group) =>
      group.rawMaterials.map((rawMaterial) => ({
        rawMaterialId: rawMaterial.rawMaterialId,
        totalQuantity: 0,
        unit: rawMaterial.unit || 'kg',
        type: '1',
        vendor: '',
        categoryId: rawMaterial.categoryId,
        categoryName: rawMaterial.categoryName,
      })),
    );
    reset({
      rawMaterials: initialFormValues,
    });
  }, [categoryGroups, reset]);

  const onSubmit: SubmitHandler<FormValues> = async (data: FormValues) => {
    const mappedInventoryRawMaterials = data.rawMaterials
      .filter((item) => item.type === '1' && Number(item.totalQuantity) > 0)
      .map((item) => ({
        rawMaterialId: item.rawMaterialId,
        quantity: parseFloat(Number(item.totalQuantity).toFixed(2)),
        unit: item.unit,
      }));

    if (mappedInventoryRawMaterials.length === 0) {
      return;
    }

    await addRawMaterialToInventory(mappedInventoryRawMaterials, {
      onSuccess: () => {},
      onError: () => {},
    });
  };

  const handleDownloadPDF = () => {
    const reportContainer = document.createElement('div');
    reportContainer.style.width = '100%'; // Changed from fixed 500px to 100%
    reportContainer.style.maxWidth = '210mm'; // Standard A4 width
    reportContainer.style.padding = '15px';
    reportContainer.style.background = 'white';
    reportContainer.style.fontFamily = 'Arial, sans-serif';
    reportContainer.style.boxSizing = 'border-box';

    // Header Section
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '15px';
    header.innerHTML = `
      <h2 style="margin-bottom: 5px; font-size: 18px; color: #333;">Raw Material Return Report</h2>
      <p style="margin: 0; font-size: 13px;">Event Name: <strong>${
        rawMaterial?.data[0]?.eventName || 'N/A'
      }</strong></p>
      <div style="margin: 5px 0; padding: 5px; border-radius: 4px;">
        <p style="margin: 2px 0; font-size: 12px; color: #333;">
          <strong>Cateror:</strong> ${user?.fullname || 'N/A'} | 
          <strong>Phone:</strong> ${user?.phoneNumber || 'N/A'} | 
          <strong>Address:</strong> ${user?.address || 'N/A'}
        </p>
      </div>
    `;
    reportContainer.appendChild(header);

    // Table Section
    categoryGroups.forEach((group) => {
      const categoryHeader = document.createElement('h3');
      categoryHeader.style.margin = '10px 0 5px 0';
      categoryHeader.style.fontSize = '14px';
      categoryHeader.style.fontWeight = 'bold';
      categoryHeader.style.color = '#444';
      categoryHeader.textContent = group.categoryName;
      reportContainer.appendChild(categoryHeader);

      const table = document.createElement('table');
      table.style.width = '100%';
      table.style.borderCollapse = 'collapse';
      table.style.fontSize = '12px'; // Reduced font size
      table.style.border = '1px solid #ddd';
      table.style.marginBottom = '15px';
      table.style.wordWrap = 'break-word';
      table.style.tableLayout = 'fixed';

      // Set column widths (percentage-based)
      const colWidths = ['40%', '20%', '20%', '20%']; // Adjust as needed

      // Table Header
      const headerRow = table.insertRow();
      ['Raw Material', 'Quantity', 'Self/Vendor', 'Vendor'].forEach(
        (text, i) => {
          const th = document.createElement('th');
          th.innerText = text;
          th.style.border = '1px solid gray';
          th.style.padding = '6px';
          th.style.backgroundColor = '#318CE7';
          th.style.color = 'white';
          th.style.textAlign = 'center';
          th.style.fontWeight = 'bold';
          th.style.width = colWidths[i]; // Apply column width
          headerRow.appendChild(th);
        },
      );

      // Table Rows
      watch('rawMaterials')
        ?.filter((item) => item.categoryId === group.categoryId)
        .forEach((item, index) => {
          const row = table.insertRow();
          row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#f5f5f5';

          const rawMaterialOption = rawMaterialOptions.find(
            (opt: {value: string}) => opt.value === item.rawMaterialId,
          );
          const name = rawMaterialOption
            ? rawMaterialOption.label
            : item.rawMaterialId;
          const typeLabel =
            item.type === '1'
              ? 'Self'
              : item.type === '2'
                ? 'Vendor'
                : item.type;
          const inventoryOrVendor =
            item.type === '1' ? 'Inventory' : item.vendor;

          [
            name,
            `${item.totalQuantity} ${item.unit}`,
            typeLabel,
            inventoryOrVendor,
          ].forEach((text, i) => {
            const cell = row.insertCell();
            cell.innerText = text;
            cell.style.border = '1px solid #ddd';
            cell.style.padding = '6px';
            cell.style.textAlign = 'center';
            cell.style.height = 'auto';
            cell.style.minHeight = '30px';
            cell.style.overflow = 'hidden';
            cell.style.textOverflow = 'ellipsis';
            cell.style.width = colWidths[i]; // Apply column width
          });
        });

      reportContainer.appendChild(table);
    });

    // Notes Section
    const notesSection = document.createElement('div');
    notesSection.style.marginTop = '10px';
    notesSection.style.marginBottom = '15px';

    const notesTitle = document.createElement('h3');
    notesTitle.innerText = 'Notes:';
    notesTitle.style.fontSize = '14px';
    notesTitle.style.marginBottom = '8px';
    notesTitle.style.color = '#333';
    notesSection.appendChild(notesTitle);

    const notesBox = document.createElement('div');
    notesBox.style.border = '1px solid #ddd';
    notesBox.style.borderRadius = '4px';
    notesBox.style.padding = '10px';
    notesBox.style.minHeight = '80px';
    notesBox.style.backgroundColor = '#f9f9f9';
    notesBox.innerHTML = `<div style="display: flex; flex-direction: column; gap: 60px;"></div>`;
    notesSection.appendChild(notesBox);
    reportContainer.appendChild(notesSection);

    const footer = document.createElement('div');
    footer.style.marginTop = '15px';
    footer.style.fontSize = '9px';
    footer.style.textAlign = 'center';
    footer.style.color = '#666';
    footer.innerHTML = `<p>&copy; All Rights Reserved by PhygitalTech. Contact: 95116 40351.</p>`;
    reportContainer.appendChild(footer);

    document.body.appendChild(reportContainer);

    const options = {
      scale: 2, // Reduced from 10 for better performance
      logging: true, // Enable for debugging
      useCORS: true,
      allowTaint: true,
      letterRendering: true,
      quality: 1,
      width: reportContainer.clientWidth,
      height: reportContainer.scrollHeight,
    };

    html2canvas(reportContainer, options)
      .then((canvas) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 1);

        // Calculate dimensions to fit A4
        const pageWidth = doc.internal.pageSize.getWidth();
        const pageHeight = doc.internal.pageSize.getHeight();
        const imgWidth = pageWidth - 20; // 10mm margins on each side
        const imgHeight = (canvas.height * imgWidth) / canvas.width;

        // Add first page
        doc.addImage(imgData, 'JPEG', 10, 10, imgWidth, imgHeight);

        // Add additional pages if needed
        let heightLeft = imgHeight;
        let position = 10 + imgHeight; // Initial position
        const margin = 10; // mm

        while (heightLeft >= pageHeight) {
          doc.addPage();
          position = heightLeft - pageHeight + margin;
          doc.addImage(imgData, 'JPEG', margin, -position, imgWidth, imgHeight);
          heightLeft -= pageHeight;
        }

        doc.save('RawMaterialReturnReport.pdf');
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
          Raw Material Return
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
            {categoryGroups.map((group) => (
              <div key={group.categoryId} className="mb-8">
                <h3 className="text-gray-700 dark:text-gray-300 mb-4 text-lg font-semibold">
                  {group.categoryName}
                </h3>
                <div className="overflow-x-auto">
                  <table className="text-gray-500 dark:text-gray-400 w-full text-left text-sm">
                    <thead className="bg-gray-50 text-gray-700 dark:bg-gray-700 dark:text-gray-400 bg-gray-2 text-xs uppercase dark:bg-black">
                      <tr>
                        <th scope="col" className="w-2/5 px-6 py-3">
                          Raw Material
                        </th>
                        <th scope="col" className="w-1/5 px-6 py-3">
                          Quantity
                        </th>
                        <th scope="col" className="w-1/5 px-6 py-3">
                          Self/Vendor
                        </th>
                        <th scope="col" className="w-1/5 px-6 py-3">
                          Vendor
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {watch('rawMaterials')
                        ?.filter((item) => item.categoryId === group.categoryId)
                        .map((field, index) => {
                          const globalIndex = watch('rawMaterials').findIndex(
                            (item) =>
                              item.rawMaterialId === field.rawMaterialId &&
                              item.categoryId === field.categoryId,
                          );
                          const typeValue = watch(
                            `rawMaterials[${globalIndex}].type`,
                          );
                          const isVendor = typeValue === '2';
                          const rawMaterialOption = rawMaterialOptions.find(
                            (opt: {value: string}) =>
                              opt.value === field.rawMaterialId,
                          );
                          const name = rawMaterialOption
                            ? rawMaterialOption.label
                            : field.rawMaterialId;

                          return (
                            <tr
                              key={`${group.categoryId}-${field.rawMaterialId}`}
                              className="dark:border-gray-700 dark:bg-gray-800 border-b bg-transparent"
                            >
                              <td className="text-gray-900 px-6 py-4 font-medium dark:text-white">
                                {name}
                                <input
                                  type="hidden"
                                  name={`rawMaterials[${globalIndex}].rawMaterialId`}
                                  value={field.rawMaterialId}
                                />
                                <input
                                  type="hidden"
                                  name={`rawMaterials[${globalIndex}].categoryId`}
                                  value={field.categoryId}
                                />
                              </td>
                              <td className="">
                                <div className="flex items-center gap-2">
                                  <GenericInputField
                                    name={`rawMaterials[${globalIndex}].totalQuantity`}
                                    placeholder="Quantity"
                                    type="number"
                                  />
                                  <span className="text-gray-500 dark:text-gray-300 min-w-[60px]">
                                    {watch(`rawMaterials[${globalIndex}].unit`)}
                                  </span>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <GenericSearchDropdown
                                  name={`rawMaterials[${globalIndex}].type`}
                                  options={[
                                    {label: 'Self', value: '1'},
                                    {label: 'Vendor', value: '2'},
                                  ]}
                                />
                              </td>
                              <td className="px-6 py-4">
                                {isVendor ? (
                                  <GenericInputField
                                    name={`rawMaterials[${globalIndex}].vendor`}
                                    placeholder="Vendor name"
                                  />
                                ) : (
                                  <span className="text-gray-500 dark:text-gray-300">
                                    Inventory
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              </div>
            ))}
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

export default RawMaterialReturn;
