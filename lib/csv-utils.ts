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

export interface ParseCsvResult {
  headers: string[];
  rows: CsvRow[];
  headerRows: string[][];
}

/**
 * Parse a CSV line handling quoted fields and escapes
 */
export function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let field = '';
  let inQuotes = false;
  let escapedQuote = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];
    
    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        field += '"';
        i++; // Skip next quote
        continue;
      }
      inQuotes = !inQuotes;
      continue;
    }
    
    if (char === ',' && !inQuotes) {
      fields.push(field.trim());
      field = '';
      continue;
    }
    
    field += char;
  }
  
  fields.push(field.trim());
  return fields;
}

/**
 * Parse CSV string content into structured data
 */
export function parseCsvString(csvContent: string): ParseCsvResult {
  try {
    console.log('Parsing CSV content:', csvContent.substring(0, 100));
    const lines = csvContent
      .split(/\r?\n/)
    
    console.log('Number of lines:', lines.length);
      
    
    if (!lines.length) {
      return { headers: [], rows: [], headerRows: [] };
    }

    // Extract header rows and content
    const headerRows = lines.slice(0, 3).map(line => parseCsvLine(line));
    const headers = parseCsvLine(lines[3] || '');
    console.log('Extracted headers:', headers);
    
    // Parse data rows starting from 4th row (index 3)
    const rows = lines.slice(3).map((line, index) => {
      const fields = parseCsvLine(line);
      return {
        id: `row-${index}`,
        data: fields
      };
    });


    return { headers, rows, headerRows };
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw error;
  }
}


/**
 * Download data as CSV file
 */
export function downloadCsv(
  rows: CsvRow[], 
  headers: string[], 
  headerRows: string[][] = []
) {
  try {
    // Create final rows array starting with header rows
    const preparedRows = [
      ...headerRows,
      
      ...rows.map(row => row.data)
    ];

    // Remove duplicates by filtering rows with same content

    const csvContent = preparedRows
      .map(row => row
        .map(cell => {
          if (!cell) return '';
          const needsQuotes = /[",\n\r]/.test(cell);
          return needsQuotes ? `"${cell.replace(/"/g, '""')}"` : cell;
        })
        .join(',')
      )
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, 'data.csv');
  } catch (error) {
    console.error('CSV download error:', error);
    throw error;
  }
}


/**
 * Format a row of data for CSV output
 */
function formatCsvRow(row: string[]): string {
  return row.map(cell => {
    if (!cell) return '';
    const needsQuotes = /[",\n\r]/.test(cell);
    return needsQuotes ? `"${cell.replace(/"/g, '""')}"` : cell;
  }).join(',');
}

/**
 * Transpose data considering field codes and visibility options
 */
export function transposeData(
  headers: string[], 
  rows: CsvRow[], 
  options: TransposeOptions = {}
): CsvRow[] {
  try {
    const fieldNames = rows[0]?.data || [];
    const dataRows = rows.slice(1);
    
    // Create transposed structure
    const result = headers
      .map((header, headerIndex) => {
        // Skip hidden fields
        if (options?.hiddenFields?.[header]) return null;
        
        // Skip empty columns if hideEmpty is true
        if (options?.hideEmpty && 
            dataRows.every(row => !row.data[headerIndex])) {
          return null;
        }
        
        // Build row data
        const rowData = headerIndex === 0 && !options?.hideFieldCode
          ? dataRows.map(row => row.data[0])
          : dataRows.map(row => row.data[headerIndex] || '');

        return {
          id: `transposed-${headerIndex}`,
          data: [fieldNames[headerIndex] || '', ...rowData]
        };
      })
      .filter((row): row is CsvRow => row !== null);

    return result;
  } catch (error) {
    console.error('Transpose error:', error);
    return [];
  }
}

/**
 * Convert transposed data back to original format
 */
export function untransposeData(transposedRows: CsvRow[]): UntransposeResult {
  try {
    const headers = transposedRows.map(row => row.data[0] || '');
    const dataRowCount = Math.max(...transposedRows.map(row => row.data.length - 1));
    
    const rows: CsvRow[] = Array.from({ length: dataRowCount }, (_, rowIndex) => {
      const rowData = transposedRows.map(tRow => {
        const value = tRow.data[rowIndex + 1] || '';
        return value;
      });

      return {
        id: `untransposed-${rowIndex}`,
        data: rowData
      };
    });

    return { headers, rows };
  } catch (error) {
    console.error('Untranspose error:', error);
    throw error;
  }
}

/**
 * Validate CSV data structure
 */
export function validateCsvData(headers: string[], rows: CsvRow[]): boolean {
  if (!headers.length || !rows.length) return false;
  
  const fieldCount = headers.length;
  return rows.every(row => 
    row.data.length === fieldCount && 
    row.data.every(cell => typeof cell === 'string')
  );
}

/**
 * Get statistics for a column
 */
export function getColumnStats(rows: CsvRow[], columnIndex: number) {
  try {
    const values = rows.map(row => row.data[columnIndex]).filter(Boolean);
    return {
      total: values.length,
      unique: new Set(values).size,
      empty: rows.length - values.length,
      numeric: values.every(v => !isNaN(Number(v))),
      maxLength: Math.max(...values.map(v => v.length)),
    };
  } catch (error) {
    console.error('Stats error:', error);
    throw error;
  }
}

/**
 * Sanitize cell value to prevent formula injection
 */
export function sanitizeCsvValue(value: string): string {
  return value
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/^[\-+=@]/g, "'$&"); // Prevent formula injection
}