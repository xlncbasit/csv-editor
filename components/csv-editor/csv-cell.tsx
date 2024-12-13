'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListValueDialog } from './list-value-dialog';
import { cn } from '@/lib/utils';
import { CellMapping } from './types';

interface CsvCellProps {
  value: string;
  isHeader?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  rowType?: string;
  columnHeader?: string;
  fieldType?: string;
  fieldCode?: string;
  getListType?: () => string;
  onListTypeChange?: (type: string) => void;
  classname?: string;
}

interface EnhancedCsvCellProps {
  value: string;
  mapping: CellMapping;
  isHeader?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  className?: string;
  listTypes?: {[key: string]: string};
  onListTypeChange?: (fieldCode: string, type: string) => void;

}


const LIST_TYPES = ['Fixed', 'Codeset'];
const FIELD_TYPES = [
  'TAG', 'NAM', 'QTY', 'CAT', 
  'GEN', 'IMG', 'REM', 'TIM'
];

export function EnhancedCsvCell({ 
  value, 
  mapping,
  isHeader, 
  onChange, 
  onFocus,
  className,
  listTypes = {},
  onListTypeChange
}: EnhancedCsvCellProps) {
  console.log('Column Header:', mapping.columnHeader);
  const [editing, setEditing] = useState(false);
  const [cellValue, setCellValue] = useState(value);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const { columnHeader, fieldCode } = mapping;
  const listType = listTypes[fieldCode];
  const isFieldType = columnHeader.toLowerCase() === 'field_type';
  const isListTypeCell = columnHeader.toLowerCase() === 'list_type';
  const isListValueCell = columnHeader.toLowerCase() === 'list_value';
  const isCatField = mapping.original.col === 1 && cellValue === 'CAT';

  useEffect(() => {
    setCellValue(value);
  }, [value]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishEditing();
    } else if (e.key === 'Escape') {
      setCellValue(value);
      setEditing(false);
    }
  };


  const finishEditing = () => {
    setEditing(false);
    if (cellValue !== value) {
      onChange(cellValue);
    }
  };


  const getCellClassName = () => {
    return cn(
      'px-4 py-2 min-w-[150px] h-full text-sm',
      isHeader ? 'font-semibold bg-[#41C1CF] text-black' : 'hover:bg-[#f4f4f4] transition-colors',
      isListTypeCell && isCatField && 'bg-blue-100',
      isListValueCell && isCatField && listType === 'Fixed' && 'bg-green-100',
      isListValueCell && isCatField && listType === 'Codeset' && 'bg-gray-100',
      className
    );
  };

  // Handle list type selection
  if (isListTypeCell && !isHeader) {
    return (
      <div className={cn("p-2", "bg-blue-50")}>
        <Select 
          value={listType || ''}
          onValueChange={(newValue) => {
            onChange(newValue);
            if (onListTypeChange) {
              onListTypeChange(fieldCode, newValue);
            }
          }}
        >
          <SelectTrigger className="w-full bg-white">
            <SelectValue placeholder="Select list type" />
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

  // Handle list value editing
  if (isListValueCell && !isHeader && listType) {
    const bgColorClass = listType === 'Fixed' ? 'bg-green-50' : 
                        listType === 'Codeset' ? 'bg-gray-50' : 'bg-white';
  
    return (
      <>
        <div 
          className={cn(
            "px-4 py-2 cursor-pointer group relative",
            bgColorClass
          )}
          onDoubleClick={() => listType === 'Fixed' && setListDialogOpen(true)}
        >
          {listType === 'Codeset' ? (
            <span className="text-gray-600">Codeset values</span>
          ) : (
            <>
              {cellValue || 'Double-click to edit values'}
              <div className="absolute inset-0 bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
            </>
          )}
        </div>
        {listType === 'Fixed' && (
          <ListValueDialog
            open={listDialogOpen}
            onOpenChange={setListDialogOpen}
            onSave={(newValue) => {
              setCellValue(newValue);
              onChange(newValue);
            }}
            initialValues={cellValue}
          />
        )}
      </>
    );
  }



  // Handle field type selection
  if (isFieldType && editing && !isHeader) {
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

  // Handle regular cell editing
  if (editing && !isHeader) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="w-full h-full px-4 py-2 border-2 border-[#3A53A3] focus:ring-2 focus:ring-[#41C1CF] text-sm"
        value={cellValue}
        onChange={(e) => setCellValue(e.target.value)}
        onBlur={finishEditing}
        onKeyDown={handleKeyDown}
      />
    );
  }

  return (
    <div 
      ref={cellRef}
      className={cn(
        'px-4 py-2 min-w-[150px] h-full text-sm',
        isHeader ? 'font-semibold bg-[#41C1CF] text-black' : 'hover:bg-[#f4f4f4] transition-colors',
        className
      )}
      onDoubleClick={() => !isHeader && setEditing(true)}
      tabIndex={0}
      role="gridcell"
      aria-selected={editing}
    >
      {cellValue}
    </div>
  );
}

// For backward compatibility
export function CsvCell(props: CsvCellProps) {
  return <EnhancedCsvCell {...props} mapping={{
    original: { row: 0, col: 0 },
    transposed: { row: 0, col: 0 },
    fieldCode: props.fieldCode || '',
    columnHeader: props.columnHeader || ''
  }} />;
}