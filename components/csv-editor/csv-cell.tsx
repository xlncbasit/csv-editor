import React, { useState, useEffect, useRef } from 'react';
import {Select, SelectContent, SelectItem, SelectTrigger, SelectValue} from '@/components/ui/select';

interface CsvCellProps {
  value: string;
  isHeader?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  rowType?: string;
  columnHeader?: string;
}

const LIST_TYPES = ['Fixed', 'Codeset'];
const FIELD_TYPES = ['KEY', 'TYP', 'TAG', 'NAM', 'QTY', 'CAT', 'GEN', 'IMG', 'REM', 'ALT', 'STA', 'TIM', 'REF'];

export function CsvCell({ value, isHeader, onChange, onFocus, rowType, columnHeader }: CsvCellProps) {
  const [editing, setEditing] = useState(false);
  const [cellValue, setCellValue] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setCellValue(value);
  }, [value]);

  // Always show list_type dropdown regardless of editing state
  if (columnHeader === 'list_type' && !isHeader) {
    return (
      <div className="p-2">
        <Select 
          defaultValue={cellValue || LIST_TYPES[0]}
          onValueChange={(newValue) => {
            setCellValue(newValue);
            onChange(newValue);
          }}
        >
          <SelectTrigger className="w-full h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LIST_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (rowType === 'field_type' && editing && !isHeader) {
    return (
      <div className="p-0">
        <Select 
          value={cellValue}
          onValueChange={(newValue) => {
            setCellValue(newValue);
            onChange(newValue);
            setEditing(false);
          }}
          onOpenChange={(open) => {
            if (!open) setEditing(false);
          }}
        >
          <SelectTrigger className="w-full h-full border-0 focus:ring-2 focus:ring-primary">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map((type) => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

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