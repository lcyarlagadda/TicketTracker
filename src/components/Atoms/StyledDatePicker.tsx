// components/Atoms/StyledDatePicker.tsx
import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, Clock } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import './StyledDatePicker.css';

interface StyledDatePickerProps {
  selected: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  className?: string;
  label?: string;
  showTimeSelect?: boolean;
  timeFormat?: string;
  timeIntervals?: number;
  dateFormat?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  required?: boolean;
}

const StyledDatePicker: React.FC<StyledDatePickerProps> = ({
  selected,
  onChange,
  placeholder = "Select date",
  className = "",
  label,
  showTimeSelect = false,
  timeFormat = "HH:mm",
  timeIntervals = 15,
  dateFormat = showTimeSelect ? "MMM dd, yyyy HH:mm" : "MMM dd, yyyy",
  minDate,
  maxDate,
  disabled = false,
  required = false
}) => {
  const [focused, setFocused] = useState(false);

  return (
    <div className={`styled-datepicker-container ${className}`}>
      {label && (
        <label className="block text-sm font-semibold text-slate-700 mb-2">
          <Calendar size={16} className="inline mr-2" />
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      
      <div className={`styled-datepicker-wrapper ${focused ? 'focused' : ''} ${disabled ? 'disabled' : ''}`}>
        <div className="datepicker-icon">
          {showTimeSelect ? <Clock size={18} /> : <Calendar size={18} />}
        </div>
        
        <DatePicker
          selected={selected}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholderText={placeholder}
          dateFormat={dateFormat}
          showTimeSelect={showTimeSelect}
          timeFormat={timeFormat}
          timeIntervals={timeIntervals}
          minDate={minDate}
          maxDate={maxDate}
          disabled={disabled}
          className="styled-datepicker-input"
          wrapperClassName="datepicker-wrapper"
          popperClassName="styled-datepicker-popper"
          calendarClassName="styled-datepicker-calendar"
          showPopperArrow={false}
          autoComplete="off"
        />
      </div>
    </div>
  );
};

export default StyledDatePicker;