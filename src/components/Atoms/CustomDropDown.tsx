// components/Atoms/CustomDropDown.tsx - Updated with getDisplayValue support
import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface CustomDropdownProps {
  options: string[];
  selected: string;
  setSelected: (value: string) => void;
  placeholder?: string;
  className?: string;
  getDisplayValue?: (value: string) => string;
  disabled?: boolean;
}

const CustomDropdown: React.FC<CustomDropdownProps> = ({
  options,
  selected,
  setSelected,
  placeholder = "Select an option",
  className = "",
  getDisplayValue
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSelect = (option: string) => {
    setSelected(option);
    setIsOpen(false);
  };

  const getDisplayText = (value: string) => {
    if (getDisplayValue) {
      return getDisplayValue(value);
    }
    return value;
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full h-full flex items-center justify-between px-4 py-2 text-left bg-white border-2 border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-slate-300 focus:border-blue-500 focus:outline-none transition-colors"
      >
        <span className="block truncate">
          {selected ? getDisplayText(selected) : placeholder}
        </span>
        <ChevronDown 
          size={16} 
          className={`ml-2 transition-transform duration-200 ${
            isOpen ? 'transform rotate-180' : ''
          }`} 
        />
      </button>

      {isOpen && (
        <div className="absolute z-50 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-lg max-h-60 overflow-auto">
          {options.map((option, index) => (
            <button
              key={index}
              type="button"
              onClick={() => handleSelect(option)}
              className={`w-full px-4 py-2 text-left text-sm hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors first:rounded-t-xl last:rounded-b-xl ${
                option === selected 
                  ? 'bg-blue-100 text-blue-900 font-medium' 
                  : 'text-slate-700'
              }`}
            >
              {getDisplayText(option)}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-4 py-2 text-sm text-slate-500 italic">
              No options available
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomDropdown;