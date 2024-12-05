import React from 'react';
import { Plus, Upload, Download } from 'lucide-react';

interface CsvHeaderProps {
  onAddColumn: () => void;
  onAddRow: () => void;
  onDownload: () => void;
  onUpload: (file: File) => void;
}

export function CsvHeader({ onAddColumn, onAddRow, onDownload, onUpload }: CsvHeaderProps) {
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onUpload(file);
    }
  };

  const buttonClass = "flex items-center gap-2 bg-[#41C1CF] text-black font-medium px-6 py-2 rounded-full border-2 border-black hover:bg-[#fdbb11] transition-colors";

  return (
    <div className="sticky top-0 z-10 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="flex items-center justify-between py-4">
        <div className="flex gap-3">
          <button onClick={onAddColumn} className={buttonClass}>
            <Plus className="w-4 h-4" />
            Add Column
          </button>
          <button onClick={onAddRow} className={buttonClass}>
            <Plus className="w-4 h-4" />
            Add Row
          </button>
        </div>
        <div className="flex gap-3">
          <button onClick={onDownload} className={buttonClass}>
            <Download className="w-4 h-4" />
            Download CSV
          </button>
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <button className={buttonClass}>
              <Upload className="w-4 h-4" />
              Upload CSV
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}