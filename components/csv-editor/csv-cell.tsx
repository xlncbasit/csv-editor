'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedListValueDialog } from './enhanced-list-dialog';
import { Input } from '@/components/ui/input';
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
  className?: string;
}

interface EnhancedCsvCellProps {
  value: string;
  mapping: CellMapping;
  orgKey?: string;
  moduleKey?: string;
  isHeader?: boolean;
  onChange: (value: string) => void;
  onFocus?: () => void;
  className?: string;
  listTypes?: {
    [key: string]: {
      type: string;
      values: string[];
    };
  };
  onListTypeChange?: (fieldCode: string, type: string) => void;
}

const FIELD_TYPES = [
  'TAG', 'NAM', 'QTY', 'CAT', 
  'GEN', 'IMG', 'REM', 'TIM'
];

const LIST_TYPES = ['Fixed', 'Codeset', 'Other'];

export function EnhancedCsvCell({ 
  value, 
  mapping,
  onChange,
  isHeader,  
  onFocus,
  className,
  listTypes,
  onListTypeChange
}: EnhancedCsvCellProps) {
  console.log("Column Header:", mapping.columnHeader);
  console.log("field type:", mapping.fieldType);
  const [editing, setEditing] = useState(false);
  const [cellValue, setCellValue] = useState(value);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const { columnHeader, fieldCode, fieldType } = mapping;
  const listTypeData = listTypes?.[fieldCode];
  const listType = listTypeData?.type;
  const listValues = listTypeData?.values;

  const isFieldType = columnHeader.toLowerCase() === 'field_type';
  const isListType = columnHeader.toLowerCase() === 'list_type';
  const isListValue = columnHeader.toLowerCase() === 'list_value';
  const isCatField = fieldType === 'CAT';

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
    } else if (e.key === 'Tab') {
      finishEditing();
      if (cellRef.current) {
        const nextCell = e.shiftKey 
          ? cellRef.current.previousElementSibling
          : cellRef.current.nextElementSibling;
        (nextCell as HTMLElement)?.focus();
      }
    }
  };

  const finishEditing = () => {
    setEditing(false);
    if (cellValue !== value) {
      onChange(cellValue);
    }
  };

  const getCellClassName = () => {
    const labelValue = mapping.original.row === 3 ? value : ''; // Get value from label row
   
    return cn(
      'px-4 py-2 min-w-[150px] h-full text-sm',
      
      
      labelValue,
    );
   };
  

  // Handle field type selection
  if (isFieldType && editing && !isHeader) {
    return (
      <div className="p-2">
        <Select 
          value={cellValue}
          onValueChange={(newValue) => {
            setCellValue(newValue);
            onChange(newValue);
            setEditing(false);
          }}
        >
          <SelectTrigger className="w-full h-8 bg-white">
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

  // Handle list type selection
  if (isListType && !isHeader && isCatField) {
    return (
      <div className="p-2 bg-blue-100">
        <Select 
          value={cellValue}
          onValueChange={(newValue) => {
            setCellValue(newValue);
            onChange(newValue);
            onListTypeChange?.(fieldCode, newValue);
          }}
        >
          <SelectTrigger className="w-full bg-white border-gray-200 hover:bg-gray-50">
            <SelectValue placeholder="Select list type" />
          </SelectTrigger>
          <SelectContent 
            className="!bg-white [&_*]:!bg-white border rounded-md shadow-md overflow-hidden"
            style={{ backgroundColor: 'white' }}
          >
            {LIST_TYPES.map((type) => (
              <SelectItem 
                key={type} 
                value={type}
                className="hover:!bg-gray-50 cursor-pointer data-[highlighted]:!bg-gray-50"
              >
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Handle list value editing
  if (isListValue && !isHeader && isCatField) {
    if (listType === 'Codeset') {
      return (
        <>
          <div 
            className="px-4 py-2 cursor-pointer bg-blue-100"
            onDoubleClick={() => setListDialogOpen(true)}
          >
            {cellValue || 'Click to select codeset'}
          </div>
          <EnhancedListValueDialog
            open={listDialogOpen}
            onOpenChange={setListDialogOpen}
            onSave={(newValue) => {
              setCellValue(newValue);
              onChange(newValue);
            }}
            initialValues={cellValue}
            listType={listType}
            fieldCode={fieldCode}
          />
        </>
      );
    }
    
    if (listType === 'Other') {
      return (
        <div className="px-4 py-2 bg-yellow-50">
          <Input 
            value={cellValue}
            onChange={(e) => {
              setCellValue(e.target.value);
              onChange(e.target.value);
            }}
            placeholder="Enter reference key"
            className="h-8"
          />
        </div>
      );
    }
    
    return (
      <>
        <div 
          className="px-4 py-2 cursor-pointer bg-green-100"
          onDoubleClick={() => setListDialogOpen(true)}
        >
          {cellValue || 'Click to edit values'}
        </div>
        <EnhancedListValueDialog
          open={listDialogOpen}
          onOpenChange={setListDialogOpen}
          onSave={(newValue) => {
            setCellValue(newValue);
            onChange(newValue);
          }}
          initialValues={cellValue}
          listType={listType}
        />
      </>
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

  // Regular cell display
  return (
    <div 
      ref={cellRef}
      className={getCellClassName()}
      onDoubleClick={() => !isHeader && setEditing(true)}
      tabIndex={0}
      onFocus={onFocus}
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
    columnHeader: props.columnHeader || '',
    fieldType: props.fieldType || ''
  }} />;
}