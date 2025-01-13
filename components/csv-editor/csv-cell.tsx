'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { EnhancedListValueDialog } from './enhanced-list-dialog';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { CellMapping } from './types';

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
  listTypes?: {[key: string]: { type: string; values: string[]; }};
  onListTypeChange?: (fieldCode: string, type: string) => void;
}

const FIELD_TYPES = ['TAG', 'NAM', 'QTY', 'CAT', 'GEN', 'IMG', 'REM', 'TIM'];
const LIST_TYPES = ['Fixed', 'Codeset'];

export function EnhancedCsvCell({ 
  value, 
  mapping,
  onChange,
  isHeader,  
  onFocus,
  forceReadOnly,
  listTypes,
  onListTypeChange
}: EnhancedCsvCellProps) {
  const [editing, setEditing] = useState(false);
  const [cellValue, setCellValue] = useState(value);
  const [listDialogOpen, setListDialogOpen] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const cellRef = useRef<HTMLDivElement>(null);

  const { columnHeader, fieldCode, fieldType } = mapping;
  const listTypeData = listTypes?.[fieldCode];
  const listType = listTypeData?.type;

  const isNonEditable = forceReadOnly || [0, 1, 2, 26, 8, 9].includes(mapping.original.col) || mapping.original.row === 0;
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

  const handleEditComplete = useCallback(() => {
    setEditing(false);
    if (cellValue !== value) {
      onChange(cellValue);
    }
  }, [cellValue, value, onChange]);

  const renderPill = (text: string, variant: 'blue' | 'gray' | 'green' | 'red' = 'gray') => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-300',
      gray: 'bg-gray-100 text-gray-800 border-gray-300',
      green: 'bg-green-100 text-green-800 border-green-300',
      red: 'bg-red-100 text-red-800 border-red-300'
    };
    
    return (
      <span className={cn(
        "px-2 py-1 rounded-full text-sm font-medium border",
        colors[variant]
      )}>
        {text || 'N/A'}
      </span>
    );
  };

  if (isFieldType && editing && !isHeader) {
    return (
      <div className="p-2">
        <Select 
          value={cellValue}
          onValueChange={v => { setCellValue(v); onChange(v); setEditing(false); }}
          onOpenChange={open => !open && setEditing(false)}
        >
          <SelectTrigger className="w-full h-8 bg-white">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent>
            {FIELD_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isListType && !isHeader) {
    if (!isCatField) {
      // Don't show pills for header row
      if (mapping.original.row === 0) {
        return (
          <div className={cn(
            "px-3 py-2",
            "bg-[#3A53A3] text-white", "cursor-not-allowed"
          )}>
            {cellValue}
          </div>
        );
      }
      // Show pill for other rows
      return (
        <div className="px-3 py-2 flex items-center cursor-not-allowed">
          {renderPill(cellValue, 'red')}
        </div>
      );
    }
    return (
      <div className="h-[36px]">
        <Select 
          value={cellValue}
          onValueChange={v => {
            setCellValue(v);
            onChange(v);
            onListTypeChange?.(fieldCode, v);
          }}
        >
          <SelectTrigger className="w-full h-[36px] bg-white border-gray-200 hover:bg-gray-50">
            <SelectValue placeholder="Select list type" />
          </SelectTrigger>
          <SelectContent>
            {LIST_TYPES.map(type => (
              <SelectItem key={type} value={type}>{type}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    );
  }

  if (isListValue && !isHeader) {
    if (!isCatField) {
      // Don't show pills for header row
      if (mapping.original.row === 0) {
        return (
          <div className={cn(
            "px-3 py-2",
            "bg-[#3A53A3] text-white", "cursor-not-allowed"
          )}>
            {cellValue}
          </div>
        );
      }
      // Show pills for other rows
      return (
        <div className=" w-full px-3 py-2 flex flex-wrap gap-1.5 cursor-not-allowed">
          {cellValue ? 
            cellValue.split('#').map((v, i) => renderPill(v.trim(), 'gray'))
            : renderPill('N/A', 'red')
          }
        </div>
      );
    }

    if (listType === 'Codeset') {
      return (
        <>
          <div 
            className="min-h-[36px] p-2 flex flex-wrap gap-1.5 cursor-pointer hover:bg-gray-50"
            onClick={() => setListDialogOpen(true)}
          >
            {cellValue ? 
              cellValue.split('#').map((v, i) => (
                <span 
                  key={i}
                  className={cn(
                    "px-2 py-1 rounded-full text-sm font-medium border",
                    "bg-green-100 text-green-800 border-green-300",
                    "whitespace-normal break-words max-w-[300px]"
                  )}
                >
                  {v.trim()}
                </span>
              ))
              : <span className="text-gray-400">Click to add values</span>
            }
          </div>
          <EnhancedListValueDialog
            open={listDialogOpen}
            onOpenChange={setListDialogOpen}
            onSave={v => { setCellValue(v); onChange(v); }}
            initialValues={cellValue}
            listType={listType}
          />
        </>
      );
      
    }
    
    return (
      <>
        <div 
          className="p-2 flex flex-wrap gap-1.5 cursor-pointer hover:bg-gray-50"
          onClick={() => setListDialogOpen(true)}
        >
          {cellValue ? 
            cellValue.split('#').map((v, i) => renderPill(v.trim(), 'green'))
            : <span className="text-gray-400">Click to add values</span>
          }
        </div>
        <EnhancedListValueDialog
          open={listDialogOpen}
          onOpenChange={setListDialogOpen}
          onSave={v => { setCellValue(v); onChange(v); }}
          initialValues={cellValue}
          listType={listType}
        />
      </>
    );
  }

  const cellClassName = cn(
    'px-3 py-2 min-w-[150px] h-[36px] w-full truncate whitespace-nowrap',
    {
      'hidden': ['Link Setup', 'Update Setup', 'multi_group', 'hidden'].includes(value.toLowerCase()),
      'bg-[#dee2e6] text-sm cursor-not-allowed': isNonEditable && mapping.original.row !== 1 && mapping.original.row !== 0,
      'cursor-not-allowed': isNonEditable,
      'font-bold': isHeader,
      'bg-black text-white hover:bg-black/90': forceReadOnly,
      'bg-[#3A53A3] text-white': mapping.original.col === 0 && mapping.original.row !== 1 && !value.startsWith('fieldCode'),
      'bg-[#dee2e6]': mapping.original.col === 0 && value.startsWith('fieldCode'),
      'bg-white cursor-text': !isNonEditable && !isHeader
    }
  );

  if (editing && !isHeader) {
    return (
      <input
        ref={inputRef}
        type="text"
        className="w-full h-full px-4 py-2 border-2 border-[#3A53A3] focus:ring-2 focus:ring-[#41C1CF]"
        value={cellValue}
        onChange={e => setCellValue(e.target.value)}
        onBlur={handleEditComplete}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleEditComplete();
          } else if (e.key === 'Escape') {
            setCellValue(value);
            setEditing(false);
          }
        }}
      />
    );
  }

  return (
    <div 
      ref={cellRef}
      className={cellClassName}
      onClick={() => !isNonEditable && !isHeader && setEditing(true)}
      tabIndex={0}
      onFocus={onFocus}
      onMouseEnter={() => !isNonEditable && !isHeader && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      title={isNonEditable ? "This cell cannot be edited." : "Click to edit"}
    >
      {isHovered ? (
        <input
          type="text"
          className="w-full h-full px-4 py-2 border-2 border-[#3A53A3] focus:ring-2 focus:ring-[#41C1CF]"
          value={cellValue}
          onChange={e => setCellValue(e.target.value)}
          onBlur={() => {
            setIsHovered(false);
            handleEditComplete();
          }}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleEditComplete();
            } else if (e.key === 'Escape') {
              setCellValue(value);
              setIsHovered(false);
            }
          }}
          autoFocus
        />
      ) : (
        cellValue
      )}
    </div>
  );
}

// Legacy support
export function CsvCell(props: CsvCellProps) {
  const uniqueId = `${props.fieldCode || ''}-${Date.now()}`;
  return <EnhancedCsvCell {...props} mapping={{
    original: { row: 0, col: 0 },
    transposed: { row: 0, col: 0 },
    fieldCode: props.fieldCode || '',
    columnHeader: props.columnHeader || '',
    fieldType: props.fieldType || '',
    uniqueId
  }} />;
}

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