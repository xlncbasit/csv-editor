'use client';

import { Plus, Upload, Download, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { AddRowDialog } from './add-row-dialog';

interface CsvHeaderProps {
  onAddColumn: () => void;
  onAddRow: (fieldType: string) => void;  // Updated to accept fieldType
  onDownload: () => void;
  onUpload: (file: File) => void;
  hiddenFields: {[key: string]: boolean};
  onToggleVisibility: (field: string) => void;
}

export function CsvHeader({ 
  onAddColumn, 
  onAddRow, 
  onDownload, 
  onUpload,
  hiddenFields,
  onToggleVisibility 
}: CsvHeaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type === "text/csv" || file.name.endsWith('.csv')) {
        onUpload(file);
      } else {
        alert('Please upload a CSV file');
      }
      // Reset the input
      e.target.value = '';
    }
  };

  return (
    <div className="sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex items-center justify-between border-b border-border/40 py-4">
        {/* Left side controls */}
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onAddColumn} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new column to the CSV</p>
              </TooltipContent>
            </Tooltip>

            {/* Replaced old Add Row button with new Dialog */}
            <AddRowDialog onAddRow={onAddRow} />

            <Separator orientation="vertical" className="h-6" />

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onToggleVisibility('fieldCode')}
                  variant="outline"
                  size="sm"
                >
                  {hiddenFields.fieldCode ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Field Codes
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle visibility of field code column</p>
              </TooltipContent>
            </Tooltip>
            

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  onClick={() => onToggleVisibility('empty')}
                  variant="outline"
                  size="sm"
                >
                  {hiddenFields.empty ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Empty Columns
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle visibility of empty columns</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button onClick={onDownload} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download data as CSV file</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Upload CSV file"
                  />
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload a CSV file</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

// Optional: Add aria-labels for improved accessibility
const AriaLabels = {
  addColumn: 'Add new column',
  addRow: 'Add new row',
  toggleFieldCodes: 'Toggle field codes visibility',
  toggleEmptyColumns: 'Toggle empty columns visibility',
  downloadCsv: 'Download CSV file',
  uploadCsv: 'Upload CSV file'
} as const;