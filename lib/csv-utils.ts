import { saveAs } from 'file-saver';

export interface CsvRow {
  id: string;
  data: string[];
}

export interface TransposeOptions {
  hideFieldCode?: boolean;
  hideEmpty?: boolean;
  hiddenFields?: {[key: string]: boolean};
}

export interface UntransposeResult {
  headers: string[];
  rows: CsvRow[];
}

/**
 * Parses a CSV string into an array of CsvRow objects
 */
export function parseCsvString(csvContent: string): CsvRow[] {
  try {
    // Split by newline but handle different line endings
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim());
    
    return lines.map((line, index) => ({
      id: `row-${index}`,
      // Handle quoted cells and special characters
      data: parseCsvLine(line),
    }));
  } catch (error) {
    console.error('Error parsing CSV string:', error);
    return [];
  }
}

/**
 * Parses a single CSV line, handling quoted fields and special characters
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        // Handle escaped quotes
        field += '"';
        i++;
      } else {
        // Toggle quote state
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      // End of field
      fields.push(field.trim());
      field = '';
    } else {
      field += char;
    }
  }
  
  // Add the last field
  fields.push(field.trim());
  return fields;
}

/**
 * Downloads data as a CSV file
 */
export function downloadCsv(rows: CsvRow[], headers: string[], filename: string = 'data.csv') {
  try {
    // Prepare rows for CSV format
    const preparedRows = rows.map(row => 
      row.data.map(cell => {
        // Escape quotes and wrap in quotes if needed
        if (cell.includes('"') || cell.includes(',') || cell.includes('\n')) {
          return `"${cell.replace(/"/g, '""')}"`;
        }
        return cell;
      })
    );

    // Create CSV content starting with headers
    const csvContent = [
      headers.map(header => {
        if (header.includes('"') || header.includes(',') || header.includes('\n')) {
          return `"${header.replace(/"/g, '""')}"`;
        }
        return header;
      }).join(','),
      ...preparedRows.map(row => row.join(','))
    ].join('\n');
    
    // Create and download blob
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
  } catch (error) {
    console.error('Error downloading CSV:', error);
    throw new Error('Failed to download CSV file');
  }
}

/**
 * Transposes the data matrix, with options to hide certain fields
 */
export function transposeData(
  headers: string[], 
  rows: CsvRow[], 
  options?: TransposeOptions
): CsvRow[] {
  try {
    // Log the skipped row (row 2)
    if (rows[0]) {
      console.log('Skipping configuration row:', rows[0].data.join(','));
    }

    const filteredRows = rows.filter((_, index) => index !== 0);

    return headers
      .map((header, headerIndex) => {
        if (options?.hiddenFields?.[header]) return null;
        if (options?.hideFieldCode && headerIndex === 0) return null;
        
        if (options?.hideEmpty && 
            filteredRows.every(row => !row.data[headerIndex] || row.data[headerIndex].trim() === '')) {
          return null;
        }

        return {
          id: `transposed-${headerIndex}`,
          data: [header, ...filteredRows.map(row => row.data[headerIndex] || '')],
        };
      })
      .filter((row): row is CsvRow => row !== null);
  } catch (error) {
    console.error('Error transposing data:', error);
    return [];
  }
}

/**
 * Reverses the transpose operation
 */
export function untransposeData(transposedRows: CsvRow[]): UntransposeResult {
  try {
    // Extract headers from first position of each transposed row
    const headers = transposedRows.map(row => row.data[0]);
    
    // Calculate number of original rows
    const rowCount = transposedRows[0]?.data.length - 1 || 0;
    
    // Create original rows
    const rows: CsvRow[] = Array.from({ length: rowCount }, (_, rowIndex) => ({
      id: `row-${rowIndex}`,
      data: transposedRows.map(transposedRow => transposedRow.data[rowIndex + 1] || ''),
    }));

    return { headers, rows };
  } catch (error) {
    console.error('Error untransposing data:', error);
    return { headers: [], rows: [] };
  }
}

/**
 * Validates if the provided data matches expected CSV format
 */
export function validateCsvData(headers: string[], rows: CsvRow[]): boolean {
  try {
    // Check if all rows have the same number of columns as headers
    return headers.length > 0 && 
           rows.every(row => row.data.length === headers.length) &&
           rows.every(row => row.data.every(cell => typeof cell === 'string'));
  } catch (error) {
    console.error('Error validating CSV data:', error);
    return false;
  }
}

/**
 * Gets column statistics (useful for analysis)
 */
export function getColumnStats(rows: CsvRow[], columnIndex: number) {
  try {
    const values = rows.map(row => row.data[columnIndex]).filter(Boolean);
    return {
      total: values.length,
      unique: new Set(values).size,
      empty: rows.length - values.length,
    };
  } catch (error) {
    console.error('Error getting column stats:', error);
    return { total: 0, unique: 0, empty: 0 };
  }
}