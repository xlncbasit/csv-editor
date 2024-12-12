'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ListValueDialog } from './list-value-dialog';
import { cn } from '@/lib/utils';

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

const LIST_TYPES = ['Fixed', 'Codeset'];
const FIELD_TYPES = [
  'KEY', 'TYP', 'TAG', 'NAM', 'QTY', 'CAT', 
  'GEN', 'IMG', 'REM', 'ALT', 'STA', 'TIM', 'REF'
];

export function CsvCell({ 
  value, 
  isHeader, 
  onChange, 
  onFocus, 
  rowType, 
  columnHeader, 
  fieldType,
  fieldCode, 
  getListType, 
  onListTypeChange,
  classname 
}: CsvCellProps) {
  const [editing, setEditing] = useState(false);
  const [cellValue, setCellValue] = useState(value);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

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

  const handleDoubleClick = () => {
    if (!isHeader) {
      setEditing(true);
      onFocus?.();
    }
  };

  const getCellClassName = () => {
    return cn(
      'px-4 py-2 min-w-[150px] h-full text-sm',
      isHeader ? 'font-semibold bg-[#41C1CF] text-black' : 'hover:bg-[#f4f4f4] transition-colors',
      columnHeader === 'list_type' && fieldType === 'CAT' && 'bg-blue-100',
      columnHeader === 'list_value' && fieldType === 'CAT' && getListType?.() === 'Fixed' && 'bg-green-100',
      columnHeader === 'list_value' && fieldType === 'CAT' && getListType?.() === 'Codeset' && 'bg-gray-100',
      classname
    );
  };

  // Handle list_type cell for CAT field_type
  if (columnHeader === 'list_type' && !isHeader && fieldType === 'CAT') {
    return (
      <div className="p-2 bg-blue-100">
        <Select 
          value={cellValue}
          onValueChange={(newValue) => {
            setCellValue(newValue);
            onChange(newValue);
            onListTypeChange?.(newValue);
          }}
        >
          <SelectTrigger className="w-full bg-white border focus:ring-2 focus:ring-gray-200">
            <SelectValue placeholder="Select list type" />
          </SelectTrigger>
          <SelectContent className="bg-white border">
            {LIST_TYPES.map((type) => (
              <SelectItem key={type} value={type} className="hover:bg-gray-50">
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  // Handle list_value cell
  if (columnHeader === 'list_value' && !isHeader && fieldType === 'CAT') {
    const listType = getListType?.();
    if (listType === 'Codeset') {
      return <div className="px-4 py-2 bg-gray-100">Codeset values</div>;
    }
    
    return (
      <>
        <div 
          className="px-4 py-2 cursor-pointer hover:bg-muted/50 bg-green-100"
          onDoubleClick={() => setListDialogOpen(true)}
        >
          {cellValue || 'Click to edit values'}
        </div>
        <ListValueDialog
          open={listDialogOpen}
          onOpenChange={setListDialogOpen}
          onSave={(newValue) => {
            setCellValue(newValue);
            onChange(newValue);
          }}
          initialValues={cellValue}
        />
      </>
    );
  }

  // Handle field_type cell
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
      onDoubleClick={handleDoubleClick}
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          handleDoubleClick();
        }
      }}
      role="gridcell"
      aria-selected={editing}
    >
      {cellValue}
    </div>
  );
}