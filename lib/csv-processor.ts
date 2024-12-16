import { parseCsvString } from "./csv-utils";
import { ParseCsvResult } from "./csv-utils";

export function processCsvContent(content: string) {
    const parsed = parseCsvString(content);
    validateCsvStructure(parsed);
    return parsed;
  }
  
  export function validateCsvStructure(parsed: ParseCsvResult) {
    if (!parsed.rows.length || !parsed.headers.length) {
      throw new Error('Invalid CSV structure: Empty data');
    }
    // Add other validation rules
  }
  
  export function handleCsvError(error: Error, source: 'upload' | 'auto') {
    return {
      title: `CSV ${source === 'upload' ? 'Upload' : 'Loading'} Error`,
      description: error.message,
      variant: "destructive" as const
    };
  }