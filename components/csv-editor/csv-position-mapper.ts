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

export class CsvPositionMapper {
  private mappings: Map<string, CellMapping> = new Map();
  private originalData: CsvRow[];
  private headers: string[];
  private fieldCodeMap: Map<number, string> = new Map();
  private filteredToOriginalMap: Map<string, {
    originalRow: number;
    originalCol: number;
    transposedRow: number;
    transposedCol: number;
  }> = new Map();
  private maxColumns: number;

  constructor(originalData: CsvRow[], headers: string[]) {
    this.originalData = originalData;
    this.headers = headers;
    this.maxColumns = Math.max(...originalData.map(row => row.data.length), headers.length);
    this.initFieldCodeMap();
    this.generateMappings();
  }

  // Private helper methods
  private initFieldCodeMap() {
    this.originalData.forEach((row, index) => {
      this.fieldCodeMap.set(index, row.data[0]);
    });
  }

  private createMappingKey(originalRow: number, originalCol: number, fieldCode: string): string {
    return `${fieldCode}:${originalRow}:${originalCol}`;
  }

  private createFilteredKey(filteredRow: number, filteredCol: number): string {
    return `filtered-${filteredRow}-${filteredCol}`;
  }

  private getMappingForOriginalPosition(originalRow: number, originalCol: number, fieldCode: string): CellMapping {
    const key = this.createMappingKey(originalRow, originalCol, fieldCode);
    const mapping = this.mappings.get(key);
    
    if (!mapping) {
      return {
        original: { row: originalRow, col: originalCol },
        transposed: { row: originalCol, col: originalRow },
        fieldCode: fieldCode,
        columnHeader: this.headers[originalCol]?.toLowerCase() || '',
        fieldType: this.originalData[originalRow]?.data[1] || '',
        uniqueId: `${fieldCode}-${originalRow}-${originalCol}`
      };
    }
    return mapping;
  }

  private generateMappings() {
    this.mappings.clear();
    this.originalData.forEach((row, originalRow) => {
      const fieldCode = row.data[0] || '';
      const paddedData = [...row.data];
      while (paddedData.length < this.maxColumns) {
        paddedData.push('');
      }

      paddedData.forEach((value, originalCol) => {
        const mapping: CellMapping = {
          original: { row: originalRow, col: originalCol },
          transposed: { row: originalCol, col: originalRow },
          fieldCode: fieldCode,
          columnHeader: this.headers[originalCol]?.toLowerCase() || '',
          fieldType: row.data[1] || '',
          uniqueId: `${fieldCode}-${originalRow}-${originalCol}`
        };
        const key = this.createMappingKey(originalRow, originalCol, fieldCode);
        this.mappings.set(key, mapping);
      });
    });
  }

  private shouldShowRow(row: MappedCell[]): boolean {
    if (!row[0]) return false;
    const hiddenValues = ['Link Setup', 'Update Setup', 'multi_group', 'hidden', 'visibility'];
    const firstCellValue = row[0].value.toLowerCase();
    return !hiddenValues.includes(firstCellValue) && row.some(cell => cell.value.trim() !== '');
  }

  private shouldShowColumn(colIndex: number): boolean {
    return colIndex !== 1;
  }

  private createInitialTransposedArray(): MappedCell[][] {
    const transposed: MappedCell[][] = [];
    const rowCount = Math.max(...this.originalData.map(row => row.data.length));
    
    for (let i = 0; i < rowCount; i++) {
      transposed[i] = new Array(this.originalData.length);
      this.originalData.forEach((row, originalRow) => {
        const fieldCode = row.data[0];
        const value = row.data[i] || '';
        const mapping = this.getMappingForOriginalPosition(originalRow, i, fieldCode);
        transposed[i][originalRow] = { value, mapping };
      });
    }
    
    return transposed;
  }

  private generateNextFieldCode(): string {
    const existingFieldCodes = this.originalData
      .map(row => row.data[0])
      .filter(code => code?.startsWith('fieldCode'))
      .map(code => {
        const numStr = code?.replace('fieldCode', '');
        return numStr ? parseInt(numStr, 10) : 0;
      });
    
    const maxNumber = Math.max(0, ...existingFieldCodes);
    const nextNumber = maxNumber + 1;
    return `fieldCode${String(nextNumber).padStart(3, '0')}`;
  }

  // Public methods
  public transposeWithMapping(): MappedCell[][] {
    const transposed = this.createInitialTransposedArray();
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

  public getPositionMapping(filteredRow: number, filteredCol: number) {
    const key = this.createFilteredKey(filteredRow, filteredCol);
    return this.filteredToOriginalMap.get(key);
  }

  public validatePosition(filteredRow: number, filteredCol: number): boolean {
    return !!this.getPositionMapping(filteredRow, filteredCol);
  }

  public getMappingForTransposedPosition(transposedRow: number, transposedCol: number): CellMapping {
    const fieldCode = this.fieldCodeMap.get(transposedCol);
    if (!fieldCode) {
      throw new Error(`No field code found for transposed column ${transposedCol}`);
    }

    const originalRow = transposedCol;
    const originalCol = transposedRow;

    const key = this.createMappingKey(originalRow, originalCol, fieldCode);
    const mapping = this.mappings.get(key);

    if (!mapping) {
      throw new Error(`No mapping found for position ${originalRow},${originalCol}`);
    }

    return mapping;
  }

  public updateCell(filteredRow: number, filteredCol: number, newValue: string) {
    const positions = this.getPositionMapping(filteredRow, filteredCol);
    if (!positions) {
      throw new Error('Invalid filtered position');
    }

    const { originalRow, originalCol } = positions;
    const cellMapping = this.getMappingForOriginalPosition(
      originalRow, 
      originalCol,
      this.originalData[originalRow]?.data[0] || ''
    );
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
  }

  public getMapping(filteredRow: number, filteredCol: number): CellMapping | undefined {
    const positions = this.getPositionMapping(filteredRow, filteredCol);
    if (!positions) return undefined;
  
    const { originalRow, originalCol } = positions;
    return this.getMappingForOriginalPosition(
      originalRow,
      originalCol,
      this.originalData[originalRow]?.data[0] || ''
    );
  }
  
  

  public addRow(fieldType: string, label:string): {
    updatedOriginal: CsvRow[];
    updatedTransposed: MappedCell[][];
    newFieldCode: string;
  } {
    const newFieldCode = this.generateNextFieldCode();
    const newDataValue = label || `DATA_FIELD_${newFieldCode.replace('fieldCode', '')}`;
    
    const newRowData = new Array(this.headers.length).fill('');
    newRowData[0] = newFieldCode;
    newRowData[1] = fieldType;
    newRowData[2] = newDataValue;
    newRowData[3] = label;

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
  }
}