// import React, {useState} from 'react';

// const AllVendorsList = ({vendors}) => {
//   console.log('VENDORS DATA', vendors);
//   // Collect all unique rawMaterial names.
//   const rawMaterialSet = new Set();
//   vendors?.forEach((vendor) => {
//     vendor?.rawMaterials?.forEach((rm) => rawMaterialSet.add(rm.name));
//   });
//   const allRawMaterials = Array.from(rawMaterialSet);

//   // Search state
//   const [searchQuery, setSearchQuery] = useState('');

//   // Filter raw materials based on search input
//   const filteredRawMaterials = allRawMaterials.filter((rmName) =>
//     rmName.toLowerCase().includes(searchQuery.toLowerCase()),
//   );

//   return (
//     <div className="mt-10 rounded-md border border-stroke bg-white px-5 py-6 shadow-md dark:border-strokedark dark:bg-boxdark">
//       <h2 className="text-gray-900 mb-4 text-xl font-semibold dark:text-white">
//         All Vendors
//       </h2>

//       {/* Search Input */}
//       <div className="mb-4">
//         <input
//           type="text"
//           placeholder="Search Raw Material..."
//           value={searchQuery}
//           onChange={(e) => setSearchQuery(e.target.value)}
//           className="w-full rounded border-[1.5px] border-stroke bg-transparent px-4 py-2 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
//         />
//       </div>

//       <div className="max-w-full overflow-x-auto">
//         <table className="w-full border-collapse">
//           <thead>
//             <tr className="bg-gray-2 text-left dark:bg-meta-4">
//               <th className="text-gray-900 px-4 py-4 text-sm font-semibold dark:text-white">
//                 Raw Material
//               </th>
//               {vendors.map((vendor) => (
//                 <th
//                   key={vendor.id}
//                   className="text-gray-900 px-4 py-4 text-sm font-semibold dark:text-white"
//                 >
//                   {vendor.name}
//                 </th>
//               ))}
//             </tr>
//           </thead>

//           <tbody>
//             {filteredRawMaterials.length > 0 ? (
//               filteredRawMaterials.map((rmName, rowIndex) => (
//                 <tr
//                   key={rowIndex}
//                   className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-stroke dark:border-form-strokedark"
//                 >
//                   <td className="text-gray-800 text-md px-4 py-5 font-medium dark:text-white">
//                     {rmName}
//                   </td>
//                   {vendors.map((vendor) => {
//                     const match = vendor.rawMaterials.find(
//                       (item) => item.name === rmName,
//                     );
//                     return (
//                       <td
//                         key={vendor.id}
//                         className="text-gray-700 dark:text-gray-300 px-4 py-3 text-sm"
//                       >
//                         {match ? `${match.price}` : 'N/A'}
//                       </td>
//                     );
//                   })}
//                 </tr>
//               ))
//             ) : (
//               <tr>
//                 <td
//                   colSpan={vendors.length + 1}
//                   className="text-gray-500 dark:text-gray-400 px-4 py-3 text-center text-sm"
//                 >
//                   No matching raw materials found.
//                 </td>
//               </tr>
//             )}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default AllVendorsList;

/* eslint-disable */
import React, {useState} from 'react';
import {BiChevronDown, BiChevronRight} from 'react-icons/bi';

const AllVendorsList = ({vendors}) => {
  // Early return if there are no vendors
  if (!vendors || vendors.length === 0) {
    return (
      <div className="mt-10 rounded-md border border-stroke bg-white px-5 py-6 shadow-md dark:border-strokedark dark:bg-boxdark">
        <h2 className="text-gray-900 mb-4 text-xl font-semibold dark:text-white">
          All Vendors
        </h2>
        <div className="text-gray-500 dark:text-gray-400 text-center">
          No vendors available.
        </div>
      </div>
    );
  }

  // Extract unique categories and their raw materials
  const categories = {};
  vendors.forEach((vendor) => {
    vendor.categories.forEach((category) => {
      if (!categories[category.category]) {
        categories[category.category] = new Set();
      }
      category.rawMaterials.forEach((rm) =>
        categories[category.category].add(rm.name),
      );
    });
  });

  // Convert sets to arrays
  const categoryData = Object.keys(categories).map((category) => ({
    name: category,
    rawMaterials: Array.from(categories[category]),
  }));

  const [expandedCategories, setExpandedCategories] = useState(
    Object.fromEntries(categoryData.map(({name}) => [name, true])),
  );
  const [searchQuery, setSearchQuery] = useState('');

  const toggleCategory = (category) => {
    setExpandedCategories((prev) => ({
      ...prev,
      [category]: !prev[category],
    }));
  };

  return (
    <div className="mt-10 rounded-md border border-stroke bg-white px-5 py-6 shadow-md dark:border-strokedark dark:bg-boxdark">
      <h2 className="text-gray-900 mb-4 text-xl font-semibold dark:text-white">
        All Vendors
      </h2>

      {/* Search Input */}
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search Raw Material..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full rounded border-[1.5px] border-stroke bg-transparent px-4 py-2 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
        />
      </div>

      <div className="max-w-full overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-gray-2 text-left dark:bg-black">
              <th className="text-gray-900 px-4 py-4 text-sm font-semibold dark:text-white">
                Category / Raw Material
              </th>
              <th className="text-gray-900 px-4 py-4 text-sm font-semibold dark:text-white">
                Quantity
              </th>
              <th className="text-gray-900 px-4 py-4 text-sm font-semibold dark:text-white">
                Unit
              </th>
              {vendors.map((vendor) => (
                <th
                  key={vendor.id}
                  className="text-gray-900 px-4 py-6 text-sm font-semibold dark:text-white"
                >
                  {vendor.name}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {categoryData.map(({name, rawMaterials}) => (
              <>
                <tr
                  key={name}
                  className="hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 cursor-pointer bg-gray dark:bg-meta-4"
                  onClick={() => toggleCategory(name)}
                >
                  <td
                    colSpan={vendors.length + 3} // Adjusted colspan for new columns
                    className="text-gray-900 px-4 py-4 font-semibold dark:text-white"
                  >
                    {expandedCategories[name] ? (
                      <BiChevronDown className="inline-block" />
                    ) : (
                      <BiChevronRight className="inline-block" />
                    )}{' '}
                    {name}
                  </td>
                </tr>
                {expandedCategories[name] &&
                  rawMaterials
                    .filter((rm) =>
                      rm.toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                    .map((rmName, index) => {
                      // Find the first vendor's raw material details for quantity and unit
                      const firstVendor = vendors[0];
                      const category = firstVendor.categories.find(
                        (c) => c.category === name,
                      );
                      const match = category?.rawMaterials.find(
                        (item) => item.name === rmName,
                      );

                      return (
                        <tr
                          key={index}
                          className="hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-stroke dark:border-form-strokedark"
                        >
                          <td className="text-gray-800 text-md px-4 py-3 font-medium dark:text-white">
                            {rmName}
                          </td>
                          <td className="text-gray-700 dark:text-gray-300 px-4 py-3 text-sm">
                            {match ? match.quantity : 'N/A'}
                          </td>
                          <td className="text-gray-700 dark:text-gray-300 px-4 py-3 text-sm">
                            {match ? match.unit : 'N/A'}
                          </td>
                          {vendors.map((vendor) => {
                            const vendorCategory = vendor.categories.find(
                              (c) => c.category === name,
                            );
                            const vendorMatch =
                              vendorCategory?.rawMaterials.find(
                                (item) => item.name === rmName,
                              );
                            return (
                              <td
                                key={vendor.id}
                                className="text-gray-700 dark:text-gray-300 px-4 py-3 text-sm"
                              >
                                {vendorMatch ? `${vendorMatch.price}` : 'N/A'}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
              </>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AllVendorsList;
