import React, { useState, useEffect, useRef } from 'react';

interface CsvCellProps {
  value: string;
  isHeader?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
}

export function CsvCell({ value, isHeader, onChange, onFocus }: CsvCellProps) {
  const [editing, setEditing] = useState(false);
  const [cellValue, setCellValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCellValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleDoubleClick = () => {
    if (!isHeader) {
      setEditing(true);
      onFocus?.();
    }
  };

  const cellClasses = `px-4 py-2 min-w-[150px] h-full text-sm ${
    isHeader 
      ? 'font-semibold bg-[#41C1CF] text-black' 
      : 'hover:bg-[#f4f4f4] transition-colors'
  }`;

  if (editing && !isHeader) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="w-full h-full px-4 py-2 border-2 border-[#3A53A3] focus:ring-2 focus:ring-[#41C1CF] text-sm font-poppins"
        value={cellValue}
        onChange={(e) => setCellValue(e.target.value)}
        onBlur={() => {
          setEditing(false);
          if (cellValue !== value) {
            onChange(cellValue);
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            setEditing(false);
            onChange(cellValue);
          } else if (e.key === 'Escape') {
            setEditing(false);
            setCellValue(value);
          }
        }}
      />
    );
  }

  return (
    <div className={cellClasses} onDoubleClick={handleDoubleClick}>
      {cellValue}
    </div>
  );
}