import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import Papa from 'papaparse';

const USER_DATA_PATH = 'data/users';

interface Codeset {
  codeset: string;
  type: string;
  application: string;
  name: string;
  code: string;
  parentPath: string;
  ACT_00000150?: string;
  ACT_00000141?: string;
}

const getFilePath = (org_key: string | null, module_key: string | null) => {
  console.log('Getting file path for:', { org_key, module_key });
  if (!org_key || !module_key) {
    throw new Error('Invalid path: org_key and module_key are required');
  }
  const filePath = path.join( USER_DATA_PATH, org_key, module_key, 'codesetvalues.csv');
  console.log('Constructed file path:', filePath);
  return filePath;
};

const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    console.log('File exists at path:', filePath);
    return true;
  } catch (error) {
    console.error('File access error:', error);
    return false;
  }
};

const readAndParseCSV = async (filePath: string) => {
  console.log('Reading and parsing CSV from:', filePath);
  const fileContent = await fs.readFile(filePath, 'utf-8');
  console.log('File content length:', fileContent.length);
  console.log('First 100 characters:', fileContent.slice(0, 100));

  const parseResult = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value?.trim() || ''
  });

  console.log('Parse result:', {
    rowCount: parseResult.data.length,
    errors: parseResult.errors,
    meta: parseResult.meta
  });

  if (parseResult.errors.length > 0) {
    console.error('Parse errors:', parseResult.errors);
    throw new Error('CSV parsing failed');
  }

  return parseResult;
};

export async function GET(request: Request) {
  console.log('GET request received:', request.url);
  console.log('Request headers:', Object.fromEntries(request.headers));
  
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    
    console.log('Request parameters:', { org_key, module_key });

    if (!org_key || !module_key) {
      console.warn('Missing required parameters');
      return NextResponse.json({ success: false, error: 'Missing org_key or module_key' }, { status: 400 });
    }

    const filePath = getFilePath(org_key, module_key);

    if (!(await fileExists(filePath))) {
      console.warn('File not found:', filePath);
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const parseResult = await readAndParseCSV(filePath);
    console.log('Successfully parsed CSV with rows:', parseResult.data.length);

    const codesets = parseResult.data.map((row: any) => {
      const codeset = {
        codeset: row.codeset?.trim(),
        type: row.Type?.trim(),
        application: row.application?.trim(),
        name: row.Name?.trim(),
        code: row.ACT_00000150?.trim() || row.ACT_00000141?.trim() || '',
        parentPath: row.parentPath?.trim() || ''
      };
      console.log('Processed codeset:', codeset.name);
      return codeset;
    }).filter(item => item.codeset && item.type);

    console.log('Total processed codesets:', codesets.length);

    return NextResponse.json({
      success: true,
      codesets,
      meta: {
        total: codesets.length,
        types: Array.from(new Set(codesets.map(c => c.type))),
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('GET handler error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to load codesets' 
    }, { status: 500 });
  }
}

export async function POST(request: Request) {
  console.log('POST request received:', request.url);
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    const { newCodeset } = await request.json();
    
    console.log('POST parameters:', { org_key, module_key, newCodeset });

    if (!org_key || !module_key) {
      console.warn('Missing required parameters');
      return NextResponse.json({ success: false, error: 'Missing org_key or module_key' }, { status: 400 });
    }

    const filePath = getFilePath(org_key, module_key);
    console.log('Attempting to write to:', filePath);

    if (!(await fileExists(filePath))) {
      console.warn('Target file not found:', filePath);
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const parseResult = await readAndParseCSV(filePath);
    console.log('Existing codesets:', parseResult.data.length);

    if (parseResult.data.some((row: any) => row.codeset === newCodeset.codeset)) {
      console.warn('Codeset already exists:', newCodeset.codeset);
      return NextResponse.json({ success: false, error: 'Codeset already exists' }, { status: 409 });
    }

    parseResult.data.push(newCodeset);
    const updatedCsv = Papa.unparse(parseResult.data);
    console.log('Generated updated CSV length:', updatedCsv.length);

    await fs.writeFile(filePath, updatedCsv);
    console.log('Successfully wrote updated CSV');

    return NextResponse.json({ success: true, message: 'Codeset added successfully' });

  } catch (error) {
    console.error('POST handler error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to add codeset' 
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  console.log('PUT request received:', request.url);
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    const { nodeId, code } = await request.json();
    
    console.log('PUT parameters:', { org_key, module_key, nodeId, code });

    if (!org_key || !module_key) {
      console.warn('Missing required parameters');
      return NextResponse.json({ success: false, error: 'Missing org_key or module_key' }, { status: 400 });
    }

    const filePath = getFilePath(org_key, module_key);
    console.log('Attempting to update file:', filePath);

    if (!(await fileExists(filePath))) {
      console.warn('Target file not found:', filePath);
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const parseResult = await readAndParseCSV(filePath);
    console.log('Current data rows:', parseResult.data.length);

    let updated = false;
    const updatedData = parseResult.data.map((row: any) => {
      if (row.codeset === nodeId) {
        updated = true;
        console.log('Updating codeset:', nodeId);
        return {
          ...row,
          ACT_00000141: code,
          ACT_00000150: code
        };
      }
      return row;
    });

    if (!updated) {
      console.warn('Codeset not found:', nodeId);
      return NextResponse.json({ success: false, error: 'Codeset not found' }, { status: 404 });
    }

    const updatedCsv = Papa.unparse(updatedData);
    console.log('Generated updated CSV length:', updatedCsv.length);

    await fs.writeFile(filePath, updatedCsv);
    console.log('Successfully wrote updated CSV');

    return NextResponse.json({ success: true, message: 'Codeset updated successfully' });

  } catch (error) {
    console.error('PUT handler error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update codeset' 
    }, { status: 500 });
  }
}