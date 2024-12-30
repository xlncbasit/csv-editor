// codeset-types.ts
export interface CodesetNode {
    codeset: string;
    Type: string;
    application: string;
    Name: string;
    code: string;
    description?: string;
    parentPath?: string;
    children?: CodesetNode[];
  }
  
  export interface CodesetRow {
    codeset: string;
    Type: string;
    application: string;
    Name: string;
    ACT_00000150: string;
    parentPath?: string;
  }