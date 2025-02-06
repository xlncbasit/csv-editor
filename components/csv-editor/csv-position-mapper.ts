// csv-position-mapper.ts
import { CsvRow, CellMapping, MappedCell } from './types';

interface Position {
 row: number;
 col: number;
}

interface PositionMapping {
 originalRow: number; 
 originalCol: number;
 transposedRow: number;
 transposedCol: number;
}

interface UpdateResult {
 updatedOriginal: CsvRow[];
 updatedTransposed: MappedCell[][];
 mapping?: CellMapping;
}

export class CsvPositionMapper {
 private mappings: Map<string, CellMapping> = new Map();
 private originalData: CsvRow[];
 private headers: string[];
 private fieldCodeMap: Map<number, string> = new Map();
 private filteredToOriginalMap: Map<string, PositionMapping> = new Map();
 private maxColumns: number;
 private updateLock: boolean = false;
 private pendingUpdates: Array<() => Promise<void>> = [];

 constructor(originalData: CsvRow[], headers: string[]) {
   this.originalData = originalData;
   this.headers = headers;
   this.maxColumns = Math.max(...originalData.map(row => row.data.length), headers.length);
   this.initFieldCodeMap();
   this.generateMappings();
 }

 private validateFieldFormat(fieldType: string, label: string): void {
   const validTypes = ['TAG', 'NAM', 'QTY', 'CAT', 'GEN', 'IMG', 'REM', 'TIM'];
   if (!validTypes.includes(fieldType)) {
     throw new Error('Invalid field type');
   }

   if (!label || label.length > 50 || !/^[a-zA-Z0-9_\s-]+$/.test(label)) {
     throw new Error('Invalid label format');
   }

   if (this.isDuplicateLabel(label)) {
     throw new Error('Label already exists');
   }
 }

 private isDuplicateLabel(label: string): boolean {
   return this.originalData.some(row => 
     row.data[3]?.toLowerCase() === label.toLowerCase()
   );
 }

 private async processUpdate<T>(update: () => Promise<T>): Promise<T> {
  if (this.updateLock) {
    return new Promise<T>((resolve) => {
      this.pendingUpdates.push(async () => {
        const result = await update();
        resolve(result);
      });
    });
  }

  this.updateLock = true;
  try {
    const result = await update();
    while (this.pendingUpdates.length > 0) {
      const nextUpdate = this.pendingUpdates.shift();
      if (nextUpdate) await nextUpdate();
    }
    return result;
  } finally {
    this.updateLock = false;
  }
}

 private createMappingKey(originalRow: number, originalCol: number, fieldCode: string): string {
   return `${fieldCode}:${originalRow}:${originalCol}`;
 }

 private createFilteredKey(filteredRow: number, filteredCol: number): string {
   return `filtered-${filteredRow}-${filteredCol}`;
 }

 private initFieldCodeMap(): void {
   this.fieldCodeMap.clear();
   this.originalData.forEach((row, index) => {
     if (row.data[0]) {
       this.fieldCodeMap.set(index, row.data[0]);
     }
   });
 }

 private generateMappings(): void {
   this.mappings.clear();
   this.originalData.forEach((row, originalRow) => {
     const fieldCode = row.data[0] || `row-${originalRow}`;
     const normalizedData = [...row.data];
     while (normalizedData.length < this.maxColumns) {
       normalizedData.push('');
     }

     for (let originalCol = 0; originalCol < this.maxColumns; originalCol++) {
       const mapping: CellMapping = {
         original: { row: originalRow, col: originalCol },
         transposed: { row: originalCol, col: originalRow },
         fieldCode: fieldCode,
         columnHeader: (this.headers[originalCol] || '').toLowerCase(),
         fieldType: normalizedData[1] || '',
         uniqueId: `${fieldCode}-${originalRow}-${originalCol}`
       };
       this.mappings.set(this.createMappingKey(originalRow, originalCol, fieldCode), mapping);
     }
   });
 }

 public async updateCell(filteredRow: number, filteredCol: number, newValue: string): Promise<UpdateResult> {
  return this.processUpdate<UpdateResult>(async () => {
    const positions = this.getPositionMapping(filteredRow, filteredCol);
    if (!positions) throw new Error('Invalid position');

    const { originalRow, originalCol } = positions;
    const cellMapping = this.getMapping(filteredRow, filteredCol);
    
    const updatedOriginal = this.originalData.map(row => ({
      ...row,
      data: [...row.data]
    }));

    updatedOriginal[originalRow].data[originalCol] = newValue;
    this.originalData = updatedOriginal;
    this.generateMappings();

    return {
      updatedOriginal,
      updatedTransposed: this.transposeWithMapping(),
      mapping: cellMapping
    };
  });
}

public async addRow(fieldType: string, label: string) {
  return this.processUpdate(async () => {
    this.validateFieldFormat(fieldType, label);

    const newFieldCode = this.generateNextFieldCode();
    const newDataValue = `DATA_FIELD_${newFieldCode.replace('fieldCode', '')}`;
    
    const newRowData = new Array(this.headers.length).fill('');
    newRowData[0] = newFieldCode;
    newRowData[1] = fieldType;
    newRowData[2] = newDataValue;
    newRowData[3] = label;
    newRowData[26] = 'NEW';

    const updatedOriginal = [
      ...this.originalData,
      { id: `row-${this.originalData.length + 1}`, data: newRowData }
    ];

    this.originalData = updatedOriginal;
    this.generateMappings();

    return {
      updatedOriginal,
      updatedTransposed: this.transposeWithMapping(),
      newFieldCode
    };
  });
}

 public transposeWithMapping(): MappedCell[][] {
   const transposed = this.createInitialTransposedArray();
   return this.filterAndMapTransposed(transposed);
 }

 private createInitialTransposedArray(): MappedCell[][] {
   const transposed: MappedCell[][] = [];
   const rowCount = Math.max(...this.originalData.map(row => row.data.length));
   
   for (let i = 0; i < rowCount; i++) {
     transposed[i] = new Array(this.originalData.length);
     this.originalData.forEach((row, originalRow) => {
       const fieldCode = row.data[0];
       const value = row.data[i] || '';
       const mapping = this.getMapping(originalRow, i) || this.createDefaultMapping(originalRow, i, fieldCode);
       transposed[i][originalRow] = { value, mapping };
     });
   }
   
   return transposed;
 }

 private filterAndMapTransposed(transposed: MappedCell[][]): MappedCell[][] {
   const filtered: MappedCell[][] = [];
   let filteredRowIndex = 0;

   transposed.forEach((row, transposedRow) => {
     if (this.shouldShowRow(row)) {
       filtered[filteredRowIndex] = [];
       let filteredColIndex = 0;

       row.forEach((cell, transposedCol) => {
         if (this.shouldShowColumn(transposedCol)) {
           const key = this.createFilteredKey(filteredRowIndex, filteredColIndex);
           this.filteredToOriginalMap.set(key, {
             originalRow: cell.mapping.original.row,
             originalCol: cell.mapping.original.col,
             transposedRow,
             transposedCol
           });

           filtered[filteredRowIndex][filteredColIndex] = cell;
           filteredColIndex++;
         }
       });
       filteredRowIndex++;
     }
   });

   return filtered;
 }

 private generateNextFieldCode(): string {
   const existingNumbers = this.originalData
     .map(row => row.data[0])
     .filter(code => /^fieldCode\d+$/.test(code))
     .map(code => parseInt(code.replace('fieldCode', ''), 10))
     .filter(num => !isNaN(num));

   const nextNumber = (Math.max(0, ...existingNumbers) + 1);
   return `fieldCode${String(nextNumber).padStart(3, '0')}`;
 }

 public getMapping(filteredRow: number, filteredCol: number): CellMapping | undefined {
   const positions = this.getPositionMapping(filteredRow, filteredCol);
   if (!positions) return undefined;

   const { originalRow, originalCol } = positions;
   const fieldCode = this.originalData[originalRow]?.data[0] || '';
   return this.mappings.get(this.createMappingKey(originalRow, originalCol, fieldCode));
 }

 public getPositionMapping(filteredRow: number, filteredCol: number): PositionMapping | undefined {
   return this.filteredToOriginalMap.get(this.createFilteredKey(filteredRow, filteredCol));
 }

 public validatePosition(filteredRow: number, filteredCol: number): boolean {
   return !!this.getPositionMapping(filteredRow, filteredCol);
 }

 private shouldShowRow(row: MappedCell[]): boolean {
   if (!row[0]) return false;
   const hiddenValues = ['Link Setup', 'Update Setup', 'multi_group', 'hidden', 'visibility'];
   return !hiddenValues.includes(row[0].value.toLowerCase().trim()) && 
          row.some(cell => cell.value.trim() !== '');
 }

 private shouldShowColumn(colIndex: number): boolean {
   return colIndex !== 1;
 }

 private createDefaultMapping(row: number, col: number, fieldCode: string): CellMapping {
   return {
     original: { row, col },
     transposed: { row: col, col: row },
     fieldCode: fieldCode || `row-${row}`,
     columnHeader: (this.headers[col] || '').toLowerCase(),
     fieldType: '',
     uniqueId: `default-${row}-${col}`
   };
 }
}