import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import Papa from 'papaparse';

const USER_DATA_PATH = 'FM/repo/verceldeploy/data/users';
const CACHE_DURATION = 5 * 60 * 1000;
const cache = new Map<string, { data: any; timestamp: number }>();

interface Codeset {
  field: string;
  Type: string;
  Level: string;
  parentPath: string;
  Code: string;
  Description: string;
}

interface ParsedData {
  data: Codeset[];
  headers: string[];
}

class CSVProcessor {
  private static sanitizeField(field: string): string {
    console.log('Sanitizing field:', field);
    field = field.trim();
    if (field.includes(',') || field.includes('"') || field.includes('\n')) {
      return `"${field.replace(/"/g, '""')}"`;
    }
    return field;
  }

  private static async readFile(filePath: string): Promise<string[]> {
    console.log('Reading file from:', filePath);
    const content = await fs.readFile(filePath, 'utf-8');
    const lines = content.split('\n').map(line => line.trim()).filter(Boolean);
    console.log(`Read ${lines.length} lines from file`);
    return lines;
  }

  static async readAndParseCSV(filePath: string): Promise<ParsedData> {
    console.log('Starting CSV parse operation for:', filePath);
    try {
      const lines = await this.readFile(filePath);
      const headerLines = lines.slice(0, 4);
      const dataLines = lines.slice(3);
      console.log('Headers:', headerLines);
      console.log(`Processing ${dataLines.length} data lines`);

      return new Promise((resolve, reject) => {
        Papa.parse<Codeset>(dataLines.join('\n'), {
          header: true,
          skipEmptyLines: 'greedy',
          transform: value => value?.trim() || '',
          transformHeader: header => {
            console.log('Transforming header:', header);
            const headerMap: Record<string, string> = {
              'field': 'field',
              'Type': 'Type',
              'Level': 'Level',
              'Parent Path': 'parentPath',
              'Code': 'Code',
              'Description': 'Description'
            };
            return headerMap[header] || header;
          },
          complete: (results) => {
            console.log('Parse complete:', {
              totalRows: results.data.length,
              errors: results.errors.length,
              headers: results.meta.fields,
              firstRow: results.data[0],
              rawData: dataLines[0]
            });
            const validData = results.data.filter(row => 
              row.field?.trim() && 
              row.Type?.trim()
            );
            console.log(`Found ${validData.length} valid rows`);
            resolve({ data: validData, headers: headerLines });
          },
          error: (error: Error, file?: Papa.LocalFile) => {
            console.error('Parse error:', error);
            reject(new Error(`CSV Parse Error: ${error.message}`));
          }
        });
      });
    } catch (error) {
      console.error('File read error:', error);
      throw new Error(`File read error: ${error}`);
    }
  }

  static async appendToCSV(filePath: string, newCodeset: Partial<Codeset>): Promise<void> {
    console.log('Appending new codeset:', newCodeset);
    const { data, headers } = await this.readAndParseCSV(filePath);
    
    if (data.some(row => row.field === newCodeset.field)) {
      console.warn('Duplicate field detected:', newCodeset.field);
      throw new Error('Duplicate field code');
    }

    const formattedRow = [
      newCodeset.field || '',
      newCodeset.Type || '',
      newCodeset.Level || 'Level_001',
      newCodeset.parentPath || '',
      newCodeset.Code?.toUpperCase() || '',
      newCodeset.Description || ''
    ].map(this.sanitizeField).join(',');

    console.log('Formatted new row:', formattedRow);

    const updatedContent = [
      ...headers,
      ...data.map(row => 
        Object.values(row).map(this.sanitizeField).join(',')
      ),
      formattedRow
    ].join('\n');

    await fs.writeFile(filePath, updatedContent);
    console.log('Successfully appended new codeset');
  }

  static async updateCSV(filePath: string, nodeId: string, updates: Partial<Codeset>): Promise<void> {
    console.log('Updating codeset:', { nodeId, updates });
    const { data, headers } = await this.readAndParseCSV(filePath);
    const rowIndex = data.findIndex(row => row.field === nodeId);
    
    if (rowIndex === -1) {
      console.warn('Codeset not found:', nodeId);
      throw new Error('Codeset not found');
    }
    
    data[rowIndex] = { ...data[rowIndex], ...updates };
    console.log('Updated row:', data[rowIndex]);
    
    const updatedContent = [
      ...headers,
      ...data.map(row => 
        Object.values(row).map(this.sanitizeField).join(',')
      )
    ].join('\n');

    await fs.writeFile(filePath, updatedContent);
    console.log('Successfully updated codeset');
  }
}

function getCacheKey(org_key: string, module_key: string): string {
  const key = `${org_key}:${module_key}`;
  console.log('Generated cache key:', key);
  return key;
}

async function validateAccess(filePath: string): Promise<void> {
  console.log('Validating file access:', filePath);
  try {
    await fs.access(filePath);
    console.log('File access validated successfully');
  } catch {
    console.error('File not found:', filePath);
    throw new Error('File not found');
  }
}

export async function GET(request: Request) {
  console.log('GET request received:', request.url);
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');

    console.log('Request parameters:', { org_key, module_key });

    if (!org_key || !module_key) {
      console.warn('Missing required parameters');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing parameters' 
      }, { status: 400 });
    }

    const cacheKey = getCacheKey(org_key, module_key);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached data');
      return NextResponse.json(cached.data);
    }

    const filePath = path.join(USER_DATA_PATH, org_key, module_key, 'codesetvalues.csv');
    await validateAccess(filePath);

    const { data } = await CSVProcessor.readAndParseCSV(filePath);
    console.log(`Processed ${data.length} codesets`);

    const response = {
      success: true,
      codesets: data.map(row => ({
        codeset: row.field,
        type: row.Type,
        level: row.Level || 'Level_001',
        parentPath: row.parentPath,
        code: row.Code,
        description: row.Description,
        name: row.field
      })),
      meta: {
        total: data.length,
        types: Array.from(new Set(data.map(r => r.Type))),
        lastUpdated: new Date().toISOString()
      }
    };

    cache.set(cacheKey, { data: response, timestamp: Date.now() });
    console.log('Response cached and returning');
    return NextResponse.json(response);

  } catch (error) {
    console.error('GET Error:', error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    }, { status });
  }
}

export async function POST(request: Request) {
  console.log('POST request received:', request.url);
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    const { newCodeset } = await request.json();

    console.log('Request parameters:', { org_key, module_key, newCodeset });

    if (!org_key || !module_key) {
      console.warn('Missing required parameters');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing parameters' 
      }, { status: 400 });
    }

    const filePath = path.join(USER_DATA_PATH, org_key, module_key, 'codesetvalues.csv');
    await validateAccess(filePath);
    await CSVProcessor.appendToCSV(filePath, newCodeset);
    
    cache.delete(getCacheKey(org_key, module_key));
    console.log('Codeset added successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Codeset added successfully' 
    });

  } catch (error) {
    console.error('POST Error:', error);
    const status = error instanceof Error && error.message.includes('Duplicate') ? 409 : 500;
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    }, { status });
  }
}

export async function PUT(request: Request) {
  console.log('PUT request received:', request.url);
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    const { nodeId, description } = await request.json();

    console.log('Request parameters:', { org_key, module_key, nodeId, description });

    if (!org_key || !module_key) {
      console.warn('Missing required parameters');
      return NextResponse.json({ 
        success: false, 
        error: 'Missing parameters' 
      }, { status: 400 });
    }

    const filePath = path.join(USER_DATA_PATH, org_key, module_key, 'codesetvalues.csv');
    await validateAccess(filePath);
    await CSVProcessor.updateCSV(filePath, nodeId, { Description: description });
    
    cache.delete(getCacheKey(org_key, module_key));
    console.log('Codeset updated successfully');
    return NextResponse.json({ 
      success: true, 
      message: 'Codeset updated successfully' 
    });

  } catch (error) {
    console.error('PUT Error:', error);
    const status = error instanceof Error && error.message.includes('not found') ? 404 : 500;
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Server error' 
    }, { status });
  }
}