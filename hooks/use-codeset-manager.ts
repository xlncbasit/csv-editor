import { useState } from 'react';

export const useCodesetManager = () => {
  const [existingFields, setExistingFields] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchExistingCodesets = async (org_key: string | null, module_key: string | null) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/edit/api/codesets?org_key=${org_key}&module_key=${module_key}`,
        {
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (!response.ok) throw new Error('Failed to fetch codesets');

      const data = await response.json();
      if (data.success && data.codesets) {
        const fields = data.codesets
          .filter((codeset: any) => codeset?.codeset && !isNaN(Number(codeset.codeset)))
          .map((codeset: any) => Number(codeset.codeset))
          .sort((a: number, b: number) => a - b)
          .map(String);

        console.log('Number of valid fields:', fields.length);
        console.log('Last field number:', fields[fields.length - 1]);
        
        setExistingFields(fields);
        return fields;
      }
      return [];
    } catch (error) {
      console.error('Fetch error:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  const generateNextFieldNumber = (existingFields: string[]): string => {
    try {
      if (!existingFields.length) return "1";

      const numbers = existingFields
        .map(field => parseInt(field, 10))
        .filter(num => !isNaN(num))
        .sort((a, b) => a - b);

      const maxNumber = Math.max(...numbers);
      const nextNumber = (maxNumber + 1).toString();
      
      console.log('Current max:', maxNumber);
      console.log('Next field number:', nextNumber);
      
      return nextNumber;
    } catch (error) {
      console.error('Generation error:', error);
      return "1";
    }
  };

  return {
    fetchExistingCodesets,
    generateNextFieldNumber,
    validateFieldNumber: (fieldNumber: string) => !existingFields.includes(fieldNumber),
    loading,
    error,
    existingFields
  };
};