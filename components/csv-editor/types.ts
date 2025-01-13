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