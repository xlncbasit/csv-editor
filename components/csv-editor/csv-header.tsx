'use client';

import { Plus, Upload, Download, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchParams } from 'next/navigation';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Separator } from '@/components/ui/separator';
import { AddRowDialog } from './add-row-dialog';
import { useToast } from '@/hooks/use-toast';
import { downloadCSV } from '@/lib/csv-download';

interface CsvHeaderProps {
  onAddColumn: () => void;
  onAddRow: (fieldType: string) => void;
  onDownload: () => void;
  onUpload: (file: File) => void;
  hiddenFields: {[key: string]: boolean};
  onSave: () => void;
  onToggleVisibility: (field: string) => void;
}

export function CsvHeader({ 
  onAddColumn, 
  onAddRow, 
  onDownload, 
  onUpload,
  onSave,
  hiddenFields,
  onToggleVisibility 
}: CsvHeaderProps) {
  const { toast } = useToast();
  const searchParams = useSearchParams();

  
  
  
  const handleDownload = async () => {
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    
    if (!org_key || !module_key) {
      toast({
        title: "Error",
        description: "Missing required parameters",
        variant: "destructive"
      });
      return;
    }
  
    const success = await downloadCSV(org_key, module_key, 'config');
    
    if (success) {
      toast({
        title: "Success",
        description: "CSV file downloaded successfully"
      });
    } else {
      toast({
        title: "Error",
        description: "Failed to download CSV file",
        variant: "destructive"
      });
    }
  };
  
  
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a CSV file",
        variant: "destructive",
      });
      e.target.value = '';
      return;
    }

    try {
      await onUpload(file);
      toast({
        title: "File Uploaded",
        description: "CSV file has been successfully loaded",
      });
    } catch (error) {
      toast({
        title: "Upload Failed",
        description: error instanceof Error ? error.message : "Error uploading file",
        variant: "destructive",
      });
    } finally {
      e.target.value = '';
    }
  };

  return (
    <div className="sticky top-0 z-10 w-full bg-background/0 backdrop-blur supports-[backdrop-filter]:bg-background/0">
      <div className="flex items-center justify-between border-b border-border/40 py-4">
        {/* Left side controls */}
        <div className="flex items-center gap-2">
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                {/* <Button 
                  onClick={onAddColumn} 
                  variant="outline" 
                  size="sm"
                  className="bg-white hover:bg-gray-50"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Column
                </Button> */}
              </TooltipTrigger>
              <TooltipContent>
                <p>Add a new column to the CSV</p>
              </TooltipContent>
            </Tooltip>

            

            

            <Tooltip>
              <TooltipTrigger asChild>
                {/* <Button
                  onClick={() => onToggleVisibility('fieldCode')}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50"
                >
                  {hiddenFields.fieldCode ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Field Codes
                </Button> */}
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle field code column visibility</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                {/* <Button
                  onClick={() => onToggleVisibility('empty')}
                  variant="outline"
                  size="sm"
                  className="bg-white hover:bg-gray-50"
                >
                  {hiddenFields.empty ? (
                    <EyeOff className="h-4 w-4 mr-2" />
                  ) : (
                    <Eye className="h-4 w-4 mr-2" />
                  )}
                  Empty Columns
                </Button> */}
              </TooltipTrigger>
              <TooltipContent>
                <p>Toggle empty column visibility</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Right side controls */}
        <div className="flex items-center gap-8">
          <TooltipProvider delayDuration={300}>
            {/* <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onDownload} 
                  variant="outline" 
                  size="sm"
                  className="bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download CSV
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Download as CSV file</p>
              </TooltipContent>
            </Tooltip> */}

            <AddRowDialog onAddRow={onAddRow} />
            

            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  onClick={onSave}
                  variant="outline" 
                  size="sm"
                  className="bg-green-600 hover:bg-green-700 text-white"
                >
                  Save Changes
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Save configuration changes</p>
              </TooltipContent>
            </Tooltip>

            {/* <Tooltip>
              <TooltipTrigger asChild>
                <div className="relative">
                  <input
                    type="file"
                    accept=".csv"
                    onChange={handleFileChange}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    aria-label="Upload CSV file"
                  />
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="bg-white hover:bg-gray-50"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    Upload CSV
                  </Button>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>Upload a CSV file</p>
              </TooltipContent>
            </Tooltip> */}
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}