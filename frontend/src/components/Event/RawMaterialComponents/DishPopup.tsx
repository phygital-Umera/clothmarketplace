/* eslint-disable */
import React, {useState, useEffect} from 'react';
import {useSubEventContext} from '@/context/SubEventContext';
import {usePredictRawMaterials} from '@/lib/react-query/queriesAndMutations/cateror/dish';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {useAuthContext} from '@/context/AuthContext';

const DishPopup: React.FC = () => {
  const {user} = useAuthContext();
  const {
    selectedDishDetails,
    dishUpdates,
    setSelectedDishDetails,
    handleSaveDishDetails,
    preparationPeople,
  } = useSubEventContext();

  console.log('====================================');
  console.log('ssssssss', selectedDishDetails);
  console.log('====================================');
  // If no dish is selected, do not render anything.
  if (!selectedDishDetails) return null;

  // Local state for the dish data shown in the popup and for the dish kg value.
  const [updatedDish, setUpdatedDish] = useState(selectedDishDetails);
  const [popupKg, setPopupKg] = useState<number>(selectedDishDetails.kg || 0);

  // Get the prediction function from the hook.
  const {mutateAsync: predictRawMaterial} = usePredictRawMaterials();

  // When the popup opens or when dishUpdates change,
  // check if a manual update exists for this dish.
  // If yes, show that data first; if not, show the predicted/original data.
  useEffect(() => {
    const manualUpdate = dishUpdates[selectedDishDetails.dishId];
    if (manualUpdate) {
      setUpdatedDish({
        ...selectedDishDetails,
        kg: manualUpdate.kg,
        rawMaterials: manualUpdate.rawMaterials.sort(
          (a: any, b: any) => a.rawMaterial.localeCompare(b.rawMaterial), // Sorting raw material names alphabetically
        ),
      });
      setPopupKg(manualUpdate.kg);
    } else {
      setUpdatedDish({
        ...selectedDishDetails,
        rawMaterials: selectedDishDetails.rawMaterials.sort(
          (a: any, b: any) => a.rawMaterial.localeCompare(b.rawMaterial), // Sorting raw material names alphabetically
        ),
      });
      setPopupKg(selectedDishDetails.kg || 0);
    }
  }, [selectedDishDetails, dishUpdates]);

  // Update a raw material's quantity in the local state.
  const handleQuantityChange = (index: number, value: string) => {
    setUpdatedDish((prev: any) => {
      const updatedMaterials = [...prev.rawMaterials];
      updatedMaterials[index] = {
        ...updatedMaterials[index],
        quantity: Number(value),
      };
      return {...prev, rawMaterials: updatedMaterials};
    });
  };

  // When the dish kg input changes, update local state.
  const handlePopupKgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newKg = parseFloat(e.target.value);
    setPopupKg(newKg);
    setUpdatedDish((prev: any) => ({...prev, kg: newKg}));
  };

  // Trigger prediction via a button click.
  const handlePredictDish = () => {
    console.log(popupKg);
    if (selectedDishDetails.dishId && !isNaN(popupKg)) {
      predictRawMaterial({
        dishId: selectedDishDetails.dishId,
        people: preparationPeople,
        kg: popupKg,
      })
        .then((res) => {
          console.log('Prediction data from popup:', res);

          const sortedPredictedRawMaterials = res.rawMaterials?.sort(
            (a: any, b: any) => a.rawMaterial.localeCompare(b.rawMaterial),
          );

          // Merge predicted data with the current popupKg so that manual input is preserved.
          setUpdatedDish((prev: any) => ({
            ...res,
            kg: popupKg,
            rawMaterials: sortedPredictedRawMaterials,
          }));
        })
        .catch(console.error);
    }
  };

  // Function to handle PDF download
  const handleDownloadPDF = () => {
    if (!selectedDishDetails) return;

    // Create a hidden div to hold the formatted report
    const reportContainer = document.createElement('div');
    reportContainer.style.width = '800px'; // Fixed width for consistent scaling
    reportContainer.style.padding = '20px';
    reportContainer.style.background = 'white';
    reportContainer.style.fontFamily = 'Arial, sans-serif';

    // Header Section
    const header = document.createElement('div');
    header.style.textAlign = 'center';
    header.style.marginBottom = '20px';
    header.innerHTML = `
      <h2 style="margin-bottom: 5px; font-size: 20px; color: #333;">Dish Raw Material Report</h2>
      <p style="margin: 0; font-size: 14px;">Dish Name: <strong>${selectedDishDetails.dish}</strong></p>
      <p style="margin: 0; font-size: 14px;">Dish Kg: <strong>${popupKg}</strong></p>
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
    const table = document.createElement('table');
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '14px';
    table.style.border = '1px solid #ddd';

    // Table Header
    const headerRow = table.insertRow();
    ['Raw Material', 'Quantity', 'Unit', 'Process'].forEach((text) => {
      const th = document.createElement('th');
      th.innerText = text;
      th.style.border = '1px solid gray';
      th.style.paddingBottom = '10px';
      th.style.backgroundColor = '#318CE7';
      th.style.color = 'white';
      th.style.textAlign = 'center';
      th.style.fontWeight = 'bold';
      headerRow.appendChild(th);
    });

    // Table Rows with Alternating Colors
    updatedDish.rawMaterials?.forEach((rm: any, index: number) => {
      const row = table.insertRow();
      row.style.backgroundColor = index % 2 === 0 ? '#ffffff' : '#e6f2ff';

      [
        rm.rawMaterial,
        rm.quantity % 1 === 0 ? rm.quantity : rm.quantity.toFixed(1),
        rm.unit,
        rm.process || 'N/A',
      ].forEach((text) => {
        const cell = row.insertCell();
        cell.innerText = text;
        cell.style.border = '1px solid #ddd';
        cell.style.paddingBottom = '10px';
        cell.style.textAlign = 'center';
      });
    });

    reportContainer.appendChild(table);
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

    // Footer Section
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

    // Convert to image and generate PDF with optimized settings
    html2canvas(reportContainer, options)
      .then((canvas) => {
        const doc = new jsPDF('p', 'mm', 'a4');
        const imgData = canvas.toDataURL('image/jpeg', 0.7); // Lower quality for smaller size

        const imgWidth = 210; // A4 width in mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        doc.addImage(imgData, 'JPEG', 0, 0, imgWidth, imgHeight);

        doc.save('DishRawMaterialReport.pdf');
      })
      .finally(() => {
        document.body.removeChild(reportContainer);
      });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 dark:bg-opacity-75">
      <div className="max-h-[80vh] w-full max-w-3xl overflow-auto rounded bg-white p-4 shadow-lg dark:bg-boxdark-2 sm:p-6">
        {/* Header with dish name and input for dish kg */}
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <h2 className="text-lg font-bold sm:text-xl">
            {selectedDishDetails.dish}
          </h2>
          <div className="flex flex-col items-center gap-2 sm:flex-row">
            <label className="font-medium">Dish Kg:</label>
            <input
              type="number"
              value={popupKg}
              onChange={handlePopupKgChange}
              className="w-24 rounded border border-stroke bg-transparent px-2 py-1 text-black outline-none dark:border-form-strokedark dark:bg-form-input dark:text-white"
            />
            {/* Predict button for dish prediction */}
            <button
              onClick={handlePredictDish}
              className="rounded bg-primary px-4 py-1 text-white"
            >
              Predict
            </button>
            {/* Download PDF button */}
            <button
              onClick={handleDownloadPDF}
              className="rounded bg-green-500 px-4 py-1 text-white"
            >
              Download PDF
            </button>
          </div>
        </div>
        {/* Table showing raw material data */}
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-200 dark:bg-boxdark-2">
                <th className="p-2">Raw Material</th>
                <th className="p-2">Quantity</th>
                <th className="p-2">Unit</th>
                <th className="p-2">Process</th>
              </tr>
            </thead>
            <tbody>
              {updatedDish.rawMaterials?.map((rm: any, index: number) => (
                <tr
                  key={index}
                  className={`text-center ${rm.quantity === 0 ? 'text-red-500' : ''}`}
                >
                  <td className="p-1">{rm.rawMaterial}</td>
                  <td className="p-1">
                    <input
                      type="number"
                      value={
                        rm.quantity % 1 === 0
                          ? rm.quantity
                          : rm.quantity.toFixed(1)
                      }
                      onChange={(e) =>
                        handleQuantityChange(index, e.target.value)
                      }
                      className={`w-full rounded border-[1.7px] border-stroke bg-transparent px-3 py-2 text-black dark:border-form-strokedark dark:bg-form-input dark:text-white sm:px-2 sm:py-1 ${
                        rm.quantity === 0
                          ? 'border-red-500 dark:border-red-500'
                          : ''
                      }`}
                    />
                  </td>
                  <td className="p-1">{rm.unit}</td>
                  <td className="p-1">{rm.process || 'Select Process'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Buttons to close or save the popup */}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
          <button
            onClick={() => setSelectedDishDetails(null)}
            className="hover:bg-gray-100 rounded border border-graydark bg-transparent px-4 py-2 text-graydark dark:border-bodydark dark:text-bodydark"
          >
            Close
          </button>
          <button
            onClick={() => {
              handleSaveDishDetails(updatedDish);
              setSelectedDishDetails(null);
            }}
            className="hover:bg-primary-dark rounded bg-primary px-4 py-2 text-white"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
};

export default DishPopup;
