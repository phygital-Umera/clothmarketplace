import {DownIcon} from '@/icons';
import React, {useState, useEffect, useMemo} from 'react';
import {Controller, useFormContext, useWatch} from 'react-hook-form';

export const RawMaterialNameInput = ({
  rawMaterials,
}: {
  rawMaterials: Array<{
    id: string;
    name: string;
    categoryId: string;
    category?: {id: string; name: string};
    unit: string;
  }>;
}) => {
  const {control, reset, setValue} = useFormContext();
  const rawMaterialName = useWatch({control, name: 'name'});

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [selectedFromDropdown, setSelectedFromDropdown] = useState(false);

  // Filter options by typed name
  const filteredOptions = useMemo(() => {
    if (!rawMaterialName) return rawMaterials;
    return rawMaterials.filter((rm) =>
      rm.name.toLowerCase().includes(rawMaterialName.toLowerCase()),
    );
  }, [rawMaterialName, rawMaterials]);

  // When user selects from dropdown
  const handleSelect = (rm: (typeof rawMaterials)[0]) => {
    setValue('rawMaterial', rm.id);
    setValue('name', rm.name);
    setValue('rawMaterialCategory', rm.category?.id || rm.categoryId || '');
    setValue('unit', rm.unit);
    setIsDropdownOpen(false);
    setSelectedFromDropdown(true);
  };

  // When typing, reset selectedFromDropdown flag and rawMaterial id
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setValue('name', e.target.value);
    setValue('rawMaterial', ''); // reset rawMaterial id because user is typing a new name
    setSelectedFromDropdown(false);
    setIsDropdownOpen(true);
  };

  // Auto-fill when user selects rawMaterial id (optional)
  useEffect(() => {
    if (selectedFromDropdown) return; // already handled on select

    const match = rawMaterials.find(
      (rm) => rm.name.toLowerCase() === rawMaterialName.toLowerCase(),
    );
    if (match) {
      setValue('rawMaterial', match.id);
      setValue(
        'rawMaterialCategory',
        match.category?.id || match.categoryId || '',
      );
      setValue('unit', match.unit);
    } else {
      setValue('rawMaterialCategory', '');
      setValue('unit', '');
    }
  }, [rawMaterialName, rawMaterials, setValue, selectedFromDropdown]);

  return (
    <div className="relative">
      <label className="mb-2.5 block text-black dark:text-white">
        Raw Material
      </label>

      <div className="relative bg-white dark:bg-form-input">
        <input
          type="text"
          value={rawMaterialName || ''}
          onChange={handleInputChange}
          onFocus={() => setIsDropdownOpen(true)}
          onBlur={() => setTimeout(() => setIsDropdownOpen(false), 200)}
          placeholder="Type or select raw material"
          className="w-full rounded-md border border-stroke bg-transparent px-2 py-1 text-sm text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary dark:disabled:bg-black"
          aria-expanded={isDropdownOpen}
          aria-haspopup="true"
          aria-controls="raw-material-dropdown"
        />

        <span className="absolute right-4 top-1/2 -translate-y-1/2">
          <DownIcon />
        </span>

        {isDropdownOpen && (
          <div
            id="raw-material-dropdown"
            className="absolute z-10 mt-2 max-h-60 w-full overflow-y-auto rounded border border-stroke bg-white shadow-lg dark:bg-form-input"
            role="listbox"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((rm) => (
                <div
                  key={rm.id}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    handleSelect(rm);
                  }}
                  className="hover:bg-gray-200 dark:hover:bg-gray-600 cursor-pointer p-2"
                  role="option"
                >
                  {rm.name}
                </div>
              ))
            ) : (
              <div className="text-gray-500 dark:text-gray-400 p-2">
                No options found
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
