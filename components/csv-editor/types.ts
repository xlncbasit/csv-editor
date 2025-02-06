export interface Position {
  row: number;
  col: number;
}

export interface CsvRow {
    id: string;
    data: string[];
  }
  
  export interface CellPosition {
    row: number;
    col: number;
  }

  export interface PositionPair {
    filtered: Position;
    absolute: Position;
  }
  
  export interface CellMapping {
    original: Position;
    transposed: Position;
    fieldCode: string;
    columnHeader: string;
    fieldType?: string;
    label?: string;
    listType?: string;
    listValues?: string[];
    uniqueId: string;

  }
  
  export interface MappedCell {
    value: string;
    mapping: CellMapping;
  }
  
  export interface CsvGridProps {
    initialData?: CsvRow[];
    onDataChange: (newData: CsvRow[]) => void;

  }
  
  export interface CellUpdateOptions {
    preserveFieldCodes?: boolean;
    validateFields?: boolean;
  }

  export interface FieldMetadata{
    fieldType: string;
    columnHeader: string;
    listType?: string;
    listValue?: string;
    
  }

  export interface GridRef {
    handleAddRow: (fieldType: string, label: string, shouldSync: boolean) => Promise<void>;
    handleSave: () => Promise<void>;
  }

  export interface CellUpdateResult {
    updatedOriginal: CsvRow[];
    updatedTransposed: MappedCell[][];
    mapping?: CellMapping;
  }