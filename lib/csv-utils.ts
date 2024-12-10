import { saveAs } from 'file-saver';

export interface CsvRow {
  id: string;
  data: string[];
}

export function parseCsvString(csvContent: string): CsvRow[] {
  const lines = csvContent.split('\n');
  return lines.map((line, index) => ({
    id: `row-${index}`,
    data: line.split(',').map(cell => cell.trim()),
  }));
}

export function downloadCsv(rows: CsvRow[], headers: string[], filename: string = 'data.csv') {
  // First, untranspose the data back to original format
  const { rows: originalRows } = untransposeData(transposeData(headers, rows));
  
  // Create CSV content starting with headers
  const csvContent = [
    headers.join(','),
    ...originalRows.map(row => row.data.join(','))
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
  saveAs(blob, filename);
}

export function transposeData(headers: string[], rows: CsvRow[]): CsvRow[] {
  return headers.map((header, headerIndex) => ({
    id: `transposed-${headerIndex}`,
    data: [header, ...rows.map(row => row.data[headerIndex] || '')],
  }));
}

export function untransposeData(transposedRows: CsvRow[]): {
  headers: string[];
  rows: CsvRow[];
} {
  // Extract headers from first position of each transposed row
  const headers = transposedRows.map(row => row.data[0]);
  
  // Calculate how many original rows we'll have (length of data array minus header)
  const rowCount = transposedRows[0]?.data.length - 1 || 0;
  
  // Create original rows
  const rows: CsvRow[] = [];
  for (let i = 0; i < rowCount; i++) {
    rows.push({
      id: `row-${i}`,
      data: transposedRows.map(row => row.data[i + 1] || ''),
    });
  }

  return { headers, rows };
}