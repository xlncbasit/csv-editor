/* import { useState, useEffect } from 'react';
import { Plus, Download, Upload, Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Table } from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { parseCsvString } from '@/lib/csv-utils';
import { useSearchParams } from 'next/navigation';

interface CsvRow {
  id: string;
  data: string[];
}

export function ConfigurationEditor() {
  const [showFieldCodes, setShowFieldCodes] = useState(true);
  const [showEmptyColumns, setShowEmptyColumns] = useState(true);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [headerRows, setHeaderRows] = useState<string[][]>([]);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const org_key = searchParams.get('org_key');
        const module_key = searchParams.get('module_key');
        console.log('Loading config with params:', { org_key, module_key });

        if (!org_key || !module_key) {
          throw new Error('Missing required parameters');
        }

        const response = await fetch(`/api/load-config?org_key=${org_key}&module_key=${module_key}`, {
          headers: {
            'Accept': 'application/json'
          }
        });
        console.log('Raw Response:', response);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        if (!data.success || !data.csvContent) {
          throw new Error(data.error || 'Could not load configuration file');
        }

        const parsed = parseCsvString(data.csvContent);
        console.log('Parsed data:', {
          headerCount: parsed.headers.length,
          rowCount: parsed.rows.length,
          headerRowCount: parsed.headerRows.length
        });

        setHeaders(parsed.headers);
        setRows(parsed.rows);
        setHeaderRows(parsed.headerRows);

        toast({
          title: "Success",
          description: `Loaded ${parsed.rows.length} rows of data`
        });

      } catch (error) {
        console.error('Load error:', error);
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to load configuration",
          variant: "destructive"
        });
      }
    };

    loadConfig();
  }, [searchParams, toast]);

  const handleUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      const { headers: newHeaders, rows: newRows, headerRows: newHeaderRows } = parseCsvString(content);
      
      setHeaders(newHeaders);
      setRows(newRows);
      setHeaderRows(newHeaderRows);

      toast({
        title: "Success",
        description: `Loaded ${newRows.length} rows from file`
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to parse CSV file",
        variant: "destructive"
      });
    }
  };

  const handleDownload = () => {
    try {
      const csvContent = rows.map(row => row.data.join(',')).join('\n');
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'config.csv';
      a.click();
      window.URL.revokeObjectURL(url);

      toast({
        title: "Success",
        description: "Configuration downloaded successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to download configuration",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="p-6 bg-[#41C1CF] min-h-screen">
      <Card className="max-w-[1200px] mx-auto p-6 rounded-xl border-none shadow-lg">
        <h1 className="text-xl font-semibold mb-2">Configuration Editor</h1>
        <p className="text-gray-600 mb-6">
          Edit your CSV files with this interactive editor. Double-click cells to edit, add rows and columns, and download your changes.
        </p>

        <div className="flex justify-between mb-6">
          <div className="flex gap-2">
            <Button variant="outline" className="bg-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Column
            </Button>
            <Button variant="outline" className="bg-white">
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
            <Button
              variant="outline"
              className="bg-white"
              onClick={() => setShowFieldCodes(!showFieldCodes)}
            >
              {showFieldCodes ? (
                <Eye className="w-4 h-4 mr-2" />
              ) : (
                <EyeOff className="w-4 h-4 mr-2" />
              )}
              Field Codes
            </Button>
            <Button
              variant="outline"
              className="bg-white"
              onClick={() => setShowEmptyColumns(!showEmptyColumns)}
            >
              {showEmptyColumns ? (
                <Eye className="w-4 h-4 mr-2" />
              ) : (
                <EyeOff className="w-4 h-4 mr-2" />
              )}
              Empty Columns
            </Button>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              className="bg-white"
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download CSV
            </Button>
            <div className="relative">
              <input
                type="file"
                onChange={handleUpload}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
                accept=".csv"
              />
              <Button variant="outline" className="bg-white">
                <Upload className="w-4 h-4 mr-2" />
                Upload CSV
              </Button>
            </div>
          </div>
        </div>

        <div className="border rounded-lg overflow-x-auto">
          <Table>
            <thead className="bg-black text-white">
              <tr>
                {headers.map((header, index) => (
                  <th key={index} className="px-4 py-2 font-normal text-left">
                    {header}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={row.id || rowIndex}>
                  {row.data.map((cell, cellIndex) => (
                    <td 
                      key={cellIndex} 
                      className="px-4 py-2 border-b"
                      onDoubleClick={() => {
                        // Handle cell edit
                      }}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </div>
  );
} */