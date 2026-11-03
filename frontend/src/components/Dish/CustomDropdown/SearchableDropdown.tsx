import React, {useState, useEffect, useRef} from 'react';
import {IoIosArrowDown} from 'react-icons/io';
import {createPortal} from 'react-dom';

interface SearchableDropdownProps {
  options: {value: string; label: string}[];
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}

const SearchableDropdown: React.FC<SearchableDropdownProps> = ({
  options,
  value,
  onChange,
  placeholder,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [hasTyped, setHasTyped] = useState(false);
  const [dropdownPos, setDropdownPos] = useState({top: 0, left: 0, width: 0});

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const selectedOption = options.find((option) => option.value === value);

  useEffect(() => {
    if (!hasTyped && selectedOption) {
      setSearchTerm(selectedOption.label);
    }
  }, [selectedOption, hasTyped]);

  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      setDropdownPos({
        top: rect.bottom + window.scrollY,
        left: rect.left + window.scrollX,
        width: rect.width,
      });
    }
  }, [isOpen]);

  const filteredOptions = options.filter((option) =>
    option.label.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
    setHasTyped(true);
    setIsOpen(true);
  };

  const handleSelect = (option: {value: string; label: string}) => {
    onChange(option.value);
    setSearchTerm(option.label);
    setHasTyped(false);
    setIsOpen(false);
  };

  const handleClickOutside = (e: MouseEvent) => {
    if (
      inputRef.current &&
      !inputRef.current.contains(e.target as Node) &&
      dropdownRef.current &&
      !dropdownRef.current.contains(e.target as Node)
    ) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  return (
    <>
      <div className="relative w-full">
        <input
          ref={inputRef}
          type="text"
          placeholder={placeholder}
          className="w-full rounded border-[1.7px] border-stroke bg-transparent px-5 py-3 pr-10 text-black outline-none transition focus:border-primary dark:border-form-strokedark dark:bg-form-input dark:text-white"
          value={searchTerm}
          onClick={() => setIsOpen(!isOpen)}
          onChange={handleInputChange}
        />
        <IoIosArrowDown
          className="text-gray-500 pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 dark:text-white"
          size={18}
        />
      </div>

      {isOpen &&
        createPortal(
          <ul
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: dropdownPos.top,
              left: dropdownPos.left,
              width: dropdownPos.width,
              zIndex: 9999,
            }}
            className="max-h-60 overflow-auto rounded border border-stroke bg-white shadow-lg dark:border-form-strokedark dark:bg-black"
          >
            {filteredOptions.length > 0 ? (
              filteredOptions.map((option) => (
                <li
                  key={option.value}
                  className="cursor-pointer p-2 hover:bg-primary hover:text-white"
                  onClick={() => handleSelect(option)}
                >
                  {option.label}
                </li>
              ))
            ) : (
              <li className="p-2">No results found</li>
            )}
          </ul>,
          document.body,
        )}
    </>
  );
};

export default SearchableDropdown;
