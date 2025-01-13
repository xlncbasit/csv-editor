'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  forceReadOnly?: boolean;
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

const LIST_TYPES = ['Fixed', 'Codeset'];

export function EnhancedCsvCell({ 
  value, 
  mapping,
  onChange,
  isHeader,  
  onFocus,
  className,
  forceReadOnly,
  listTypes,
  onListTypeChange
}: EnhancedCsvCellProps) {
  const [editing, setEditing] = useState(false);
  const [cellValue, setCellValue] = useState(value);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const { columnHeader, fieldCode, fieldType } = mapping;
  const listTypeData = listTypes?.[fieldCode];
  const listType = listTypeData?.type;
  const listValues = listTypeData?.values;
  const [isHovered, setisHovered] = useState(false);
  

  const isNonEditable = 
    forceReadOnly ||
    (mapping.original.col === 0) || // First column
    (mapping.original.col === 1) ||
    (mapping.original.col === 2) ||
    (mapping.original.col === 26) ||
    (mapping.original.row === 0) ||
    (mapping.original.col === 8) ||
    (mapping.original.col ===9);

  

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

  const handleClick = (e: React.MouseEvent) => {
    if (!isNonEditable && !isHeader) {
      setEditing(true);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      finishEditing();
    } else if (e.key === 'Escape') {
      setCellValue(value);
      setEditing(false);
    }
  };

  const finishEditing = useCallback(() => {
    setEditing(false);
    if (cellValue !== value) {
      console.log('Cell Edit Complete:', {
        fieldCode: mapping.fieldCode,
        columnHeader: mapping.columnHeader,
        fieldType: mapping.fieldType,
        oldValue: value,
        newValue: cellValue,
        position: {
          original: mapping.original,
          transposed: mapping.transposed,
          uniqueId: mapping.uniqueId // Log the unique ID
        }
      });
      onChange(cellValue);
    }
  }, [cellValue, value, mapping, onChange]);

  const getCellClassName = () => {
    const labelValue = mapping.original.row === 3 ? value : '';
    const isHiddenRow = ['Link Setup', 'Update Setup', 'multi_group', 'hidden'].includes(value.toLowerCase());
    const shouldBeGray = isNonEditable && mapping.original.row !== 1 && mapping.original.row !== 0;
   
    return cn(
      'px-3 py-2 min-w-[150px] h-[36px] w-full truncate whitespace-nowrap',
      isHiddenRow && 'hidden',
      shouldBeGray && 'bg-[#dee2e6] text-sm cursor-not-allowed',
      isNonEditable && 'cursor-not-allowed',
      isHeader && 'font-bold',
      forceReadOnly && 'bg-black text-white hover:bg-black/90',
      labelValue,
      mapping.original.row === 0 && 'cursor-not-allowed',
      mapping.original.col === 0 && mapping.original.row !== 1 && !value.startsWith('fieldCode') && 'bg-[#3A53A3] text-white',
      mapping.original.col === 0 && value.startsWith('fieldCode') && 'bg-[#dee2e6]',
      !isNonEditable && !isHeader && 'bg-white cursor-text'
    );
  };

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
          onOpenChange={(open) => !open && setEditing(false)}
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

  if (isListType && !isHeader) {
    if (!isCatField) {
      const isFirstColumn = mapping.original.row === 0;
      return (
        <div className={cn(
          "px-3 py-2 cursor-not-allowed ",
          isFirstColumn ? "bg-[#3A53A3] text-white" : "bg-[#dee2e6]"
        )}>
          {cellValue}
        </div>
      );
    }
    return (
      <div className="h-[36px]">
        <Select 
          value={cellValue}
          onValueChange={(newValue) => {
            setCellValue(newValue);
            onChange(newValue);
            onListTypeChange?.(fieldCode, newValue);
          }}
        >
          <SelectTrigger className="w-full h-[36px] bg-white border-gray-200 hover:bg-gray-50">
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
  if (isListValue && !isHeader) {
    if (!isCatField) {
      const isFirstColumn = mapping.original.row === 0;
      return (
        <div className={cn(
          "px-3 py-2 cursor-not-allowed",
          isFirstColumn ? "bg-[#3A53A3] text-white" : "bg-[#dee2e6]"
        )}>
          {cellValue}
        </div>
      );
    }

    const handleListClick = () => {
      if (isNonEditable) {
        setListDialogOpen(true);
      }
    };
  
    if (listType === 'Codeset') {
      return (
        <>
          <div 
            className="h-[36px] flex items-center justify-center cursor-pointer hover:bg-gray-50"
            onClick={handleListClick}
          >
            {cellValue ? (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800 border border-green-300">
                {cellValue}
              </span>
            ) : (
              <span className="text-gray-400">Click to select codeset</span>
            )}
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
            onBlur={() => setEditing(false)}
            placeholder="Enter reference key"
            className="h-8"
          />
        </div>
      );
    }
    
    return (
      <>
        <div 
          className="p-2 flex flex-wrap gap-1.5 cursor-pointer hover:bg-gray-50"
          onClick={handleListClick}
        >
          {cellValue ? cellValue.split('#').map((value, idx) => (
            <span
              key={idx}
              className="px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300"
            >
              {value.trim()}
            </span>
          )) : (
            <span className="text-gray-400">Click to add values</span>
          )}
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

  if (editing && !isHeader) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="w-full h-full px-4 py-2 border-2 border-[#3A53A3] focus:ring-2 focus:ring-[#41C1CF] "
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
      className={getCellClassName()}
      onClick={handleClick}
      tabIndex={0}
      onFocus={onFocus}
      onMouseEnter={() => !isNonEditable && !isHeader && setisHovered(true)}
      onMouseLeave={() => setisHovered(false)}
      title={isNonEditable ? "This cell cannot be edited." : "Click to edit"}
    >
      {isHovered ? (
        <input
          type="text"
          className="w-full h-full px-4 py-2 border-2 border-[#3A53A3] focus:ring-2 focus:ring-[#41C1CF]"
          value={cellValue}
          onChange={(e) => setCellValue(e.target.value)}
          onBlur={() => {
            setisHovered(false);
            finishEditing();
          }}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      ) : (
        cellValue
      )}
    </div>
  );
}

// For backward compatibility
export function CsvCell(props: CsvCellProps) {
  const uniqueId = `${props.fieldCode || ''}-${Date.now()}`; // Generate a unique ID
  return <EnhancedCsvCell {...props} mapping={{
    original: { row: 0, col: 0 },
    transposed: { row: 0, col: 0 },
    fieldCode: props.fieldCode || '',
    columnHeader: props.columnHeader || '',
    fieldType: props.fieldType || '',
    uniqueId // Add the uniqueId property
  }} />;
}

