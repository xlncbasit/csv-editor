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

export function parseCsvString(csvContent: string): CsvRow[] {
  try {
    const lines = csvContent
      .split(/\r?\n/)
      .filter(line => line.trim());
    
    if (!lines.length) return [];
    
    const fieldCount = parseCsvLine(lines[0]).length;
    
    return lines.map((line, index) => {
      try {
        const fields = parseCsvLine(line);
        
        // Normalize field count
        while (fields.length < fieldCount) fields.push('');
        if (fields.length > fieldCount) fields.length = fieldCount;
        
        return {
          id: `row-${index}`,
          data: fields
        };
      } catch (error) {
        console.error(`Error parsing line ${index + 1}:`, error);
        throw new Error(`Invalid CSV format at line ${index + 1}`);
      }
    });
  } catch (error) {
    console.error('CSV parsing error:', error);
    throw error;
  }
}

export function downloadCsv(rows: CsvRow[], headers: string[], filename: string = 'data.csv') {
  try {
    const preparedRows = rows.map(row => 
      row.data.map(cell => {
        if (!cell) return '';
        const needsQuotes = /[",\n\r]/.test(cell);
        return needsQuotes ? `"${cell.replace(/"/g, '""')}"` : cell;
      })
    );

    const csvContent = [
      headers.map(header => {
        const needsQuotes = /[",\n\r]/.test(header);
        return needsQuotes ? `"${header.replace(/"/g, '""')}"` : header;
      }).join(','),
      ...preparedRows.map(row => row.join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    saveAs(blob, filename);
  } catch (error) {
    console.error('CSV download error:', error);
    throw error;
  }
}

export function transposeData(
  headers: string[], 
  rows: CsvRow[], 
  options?: TransposeOptions
): CsvRow[] {
  try {
    // Get field names from third row (index 2)
    const fieldNames = rows[2]?.data || [];
    
    // Use remaining rows after first two for data
    const dataRows = rows.slice(3);
    
    const result = headers
      .map((header, headerIndex) => {
        if (options?.hiddenFields?.[header]) return null;
        
        const rowData = dataRows.map(row => row.data[headerIndex] || '');
        
        return {
          id: `transposed-${headerIndex}`,
          data: [fieldNames[headerIndex] || '', ...rowData]
        };
      })
      .filter((row): row is CsvRow => row !== null);

    return result;
  } catch (error) {
    console.error('Error transposing data:', error);
    return [];
  }
}

export function untransposeData(transposedRows: CsvRow[]): UntransposeResult {
  try {
    // Extract headers from first row
    const headers = transposedRows.map(row => row.data[0] || '');
    
    // Calculate number of data rows
    const dataRowCount = Math.max(...transposedRows.map(row => row.data.length - 1));
    
    // Create rows
    const rows: CsvRow[] = Array.from({ length: dataRowCount }, (_, rowIndex) => ({
      id: `untransposed-${rowIndex}`,
      data: transposedRows.map(tRow => tRow.data[rowIndex + 1] || '')
    }));

    return { headers, rows };
  } catch (error) {
    console.error('Untranspose error:', error);
    throw error;
  }
}

export function validateCsvData(headers: string[], rows: CsvRow[]): boolean {
  if (!headers.length || !rows.length) return false;
  
  const fieldCount = headers.length;
  return rows.every(row => 
    row.data.length === fieldCount && 
    row.data.every(cell => typeof cell === 'string')
  );
}

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

export function sanitizeCsvValue(value: string): string {
  return value
    .replace(/[\x00-\x1F\x7F-\x9F]/g, '') // Remove control characters
    .replace(/^[\-+=@]/g, "'$&"); // Prevent formula injection
}