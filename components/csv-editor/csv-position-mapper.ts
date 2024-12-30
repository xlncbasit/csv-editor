import { CsvRow, CellMapping, MappedCell, CellPosition } from './types';
import { FieldMetadata } from './types';
export class CsvPositionMapper {
  private mappings: Map<string, CellMapping> = new Map();
  private originalData: CsvRow[];
  private headers: string[];

  constructor(originalData: CsvRow[], headers: string[]) {
    this.originalData = originalData;
    this.headers = headers;
    this.generateMappings();
  }

  private fieldMetadata: Map<string, FieldMetadata> = new Map();
  private updateFieldMetadata() {
    this.originalData.forEach(row => {
      const fieldCode = row.data[0];
      const fieldType = row.data[1]; // Field type is in column 1
      
      if (fieldCode && fieldType) {
        this.fieldMetadata.set(fieldCode, {
          fieldType,
          columnHeader: this.headers[1]?.toLowerCase() || '',
        });
      }
    });
  }
  public getCellMetadata(fieldCode: string): FieldMetadata | undefined {
    return this.fieldMetadata.get(fieldCode);
  }


  

  private generateMappings() {
    this.mappings.clear();
    this.updateFieldMetadata(); // Ensure metadata is updated before generating mappings
  
    this.originalData.forEach((row, originalRow) => {
      row.data.forEach((value, originalCol) => {
        const fieldCode = this.originalData[originalRow]?.data[0] || '';
        const columnHeader = this.headers[originalCol]?.toLowerCase() || '';
        
        const transposedRow = originalCol;
        const transposedCol = originalRow;
  
        const fieldMetadata = this.getCellMetadata(fieldCode);
        const fieldType = fieldMetadata?.fieldType || '';
  
        // Log the columnHeader and fieldType
        console.log(`ColumnHeader: ${columnHeader}, FieldType: ${fieldType}`);
  
        const mapping: CellMapping = {
          original: { row: originalRow, col: originalCol },
          transposed: { row: transposedRow, col: transposedCol },
          fieldCode,
          columnHeader,
          fieldType // Include fieldType in the mapping
        };
  
        const key = this.createMappingKey(originalRow, originalCol);
        this.mappings.set(key, mapping);
      });
    });
  }
  
  

  private createMappingKey(row: number, col: number): string {
    return `${row}-${col}`;
  }

  public getMappingForOriginalPosition(row: number, col: number): CellMapping | undefined {
    return this.mappings.get(this.createMappingKey(row, col));
  }

  public getMappingForTransposedPosition(row: number, col: number): CellMapping | undefined {
    return Array.from(this.mappings.values()).find(
      mapping => mapping.transposed.row === row && mapping.transposed.col === col
    );
  }

  public transposeWithMapping(): MappedCell[][] {
    const transposed: MappedCell[][] = [];

    for (let i = 0; i < this.headers.length; i++) {
      transposed[i] = [];
      for (let j = 0; j < this.originalData.length; j++) {
        const mapping = this.getMappingForOriginalPosition(j, i);
        if (mapping) {
          transposed[i][j] = {
            value: this.originalData[j].data[i],
            mapping
          };
        }
      }
    }

    return transposed;
  }

  public updateCell(
    transposedRow: number, 
    transposedCol: number, 
    newValue: string
  ): { updatedOriginal: CsvRow[]; updatedTransposed: MappedCell[][] } {
    const mapping = this.getMappingForTransposedPosition(transposedRow, transposedCol);
    
    if (!mapping) {
      throw new Error('No mapping found for this position');
    }

    const updatedOriginal = [...this.originalData];
    updatedOriginal[mapping.original.row] = {
      ...updatedOriginal[mapping.original.row],
      data: [...updatedOriginal[mapping.original.row].data]
    };
    updatedOriginal[mapping.original.row].data[mapping.original.col] = newValue;

    this.originalData = updatedOriginal;
    const updatedTransposed = this.transposeWithMapping();

    return { updatedOriginal, updatedTransposed };
  }

  public addRow(fieldType: string): {
    updatedOriginal: CsvRow[];
    updatedTransposed: MappedCell[][];
    newFieldCode: string;
  } {
    const newFieldCode = this.generateNextFieldCode();
    const newDataValue = this.generateDataValue(newFieldCode);
    
    const newRowData = new Array(this.headers.length).fill('');
    newRowData[0] = newFieldCode;
    newRowData[1] = fieldType;
    newRowData[2] = newDataValue;

    const newRow: CsvRow = {
      id: `row-${this.originalData.length + 1}`,
      data: newRowData
    };

    const updatedOriginal = [...this.originalData, newRow];
    this.originalData = updatedOriginal;
    this.generateMappings();

    const updatedTransposed = this.transposeWithMapping();

    return { updatedOriginal, updatedTransposed, newFieldCode };
  }

  public addColumn(columnName: string = ''): {
    updatedOriginal: CsvRow[];
    updatedTransposed: MappedCell[][];
    updatedHeaders: string[];
  } {
    const newHeader = columnName || `Column ${this.headers.length + 1}`;
    const updatedHeaders = [...this.headers, newHeader];
    
    const updatedOriginal = this.originalData.map(row => ({
      ...row,
      data: [...row.data, '']
    }));

    this.headers = updatedHeaders;
    this.originalData = updatedOriginal;
    this.generateMappings();

    const updatedTransposed = this.transposeWithMapping();

    return { updatedOriginal, updatedTransposed, updatedHeaders };
  }

  public deleteRow(rowIndex: number): {
    updatedOriginal: CsvRow[];
    updatedTransposed: MappedCell[][];
  } {
    const updatedOriginal = this.originalData.filter((_, index) => index !== rowIndex);
    this.originalData = updatedOriginal;
    this.generateMappings();

    const updatedTransposed = this.transposeWithMapping();

    return { updatedOriginal, updatedTransposed };
  }

  public deleteColumn(colIndex: number): {
    updatedOriginal: CsvRow[];
    updatedTransposed: MappedCell[][];
    updatedHeaders: string[];
  } {
    const updatedHeaders = this.headers.filter((_, index) => index !== colIndex);
    
    const updatedOriginal = this.originalData.map(row => ({
      ...row,
      data: row.data.filter((_, index) => index !== colIndex)
    }));

    this.headers = updatedHeaders;
    this.originalData = updatedOriginal;
    this.generateMappings();

    const updatedTransposed = this.transposeWithMapping();

    return { updatedOriginal, updatedTransposed, updatedHeaders };
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

  private generateDataValue(fieldCode: string): string {
    const number = fieldCode.replace('fieldCode', '');
    return `DATA_FIELD_${number}`;
  }

  public validateStructure(): boolean {
    const isValid = this.originalData.every(row => 
      row.data.length === this.headers.length &&
      row.data[0]?.startsWith('fieldCode')
    );

    if (!isValid) {
      throw new Error('Invalid CSV structure detected');
    }

    return true;
  }
}