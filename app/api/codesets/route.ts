import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import Papa from 'papaparse';

const USER_DATA_PATH = '/FM/repo/verceldeploy/data/users';

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

// Helper function to get the file path
const getFilePath = (org_key: string | null, module_key: string | null) => {
  if (!org_key || !module_key) {
    throw new Error('Invalid path: org_key and module_key are required');
  }
  return path.join(process.cwd(), USER_DATA_PATH, org_key, module_key, 'codesetvalues.csv');
};

// Helper function to check if the file exists
const fileExists = async (filePath: string) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

// Helper function to read and parse CSV
const readAndParseCSV = async (filePath: string) => {
  const fileContent = await fs.readFile(filePath, 'utf-8');
  const parseResult = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transform: (value) => value?.trim() || ''
  });

  if (parseResult.errors.length > 0) {
    console.error('Parse errors:', parseResult.errors);
    throw new Error('CSV parsing failed');
  }

  return parseResult;
};

const printFirstHundredCharacters = async (filePath: string) => {
  try {
    const fileContent = await fs.readFile(filePath, 'utf-8');
    console.log('First 100 characters of codesetvalues.csv:', fileContent.slice(0, 100));
  } catch (error) {
    console.error('Error reading file:');
  }
};


// GET handler
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');

    if (!org_key || !module_key) {
      return NextResponse.json({ success: false, error: 'Missing org_key or module_key' }, { status: 400 });
    }

    const filePath = getFilePath(org_key, module_key);

    if (!(await fileExists(filePath))) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    // Print the first 100 characters of the file
    await printFirstHundredCharacters(filePath);

    const parseResult = await readAndParseCSV(filePath);
    const codesets = parseResult.data.map((row: any) => ({
      codeset: row.codeset?.trim(),
      type: row.Type?.trim(),
      application: row.application?.trim(),
      name: row.Name?.trim(),
      code: row.ACT_00000150?.trim() || row.ACT_00000141?.trim() || '',
      parentPath: row.parentPath?.trim() || ''
    })).filter(item => item.codeset && item.type);

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
    console.error('Codeset error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to load codesets' }, { status: 500 });
  }
}


// POST handler
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    const { newCodeset } = await request.json();

    if (!org_key || !module_key) {
      return NextResponse.json({ success: false, error: 'Missing org_key or module_key' }, { status: 400 });
    }

    const filePath = getFilePath(org_key, module_key);

    if (!(await fileExists(filePath))) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const parseResult = await readAndParseCSV(filePath);

    if (parseResult.data.some((row: any) => row.codeset === newCodeset.codeset)) {
      return NextResponse.json({ success: false, error: 'Codeset already exists' }, { status: 409 });
    }

    parseResult.data.push(newCodeset);
    const updatedCsv = Papa.unparse(parseResult.data);

    await fs.writeFile(filePath, updatedCsv);
    return NextResponse.json({ success: true, message: 'Codeset added successfully' });

  } catch (error) {
    console.error('POST error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to add codeset' }, { status: 500 });
  }
}

// PUT handler
export async function PUT(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    const { nodeId, code } = await request.json();

    if (!org_key || !module_key) {
      return NextResponse.json({ success: false, error: 'Missing org_key or module_key' }, { status: 400 });
    }

    const filePath = getFilePath(org_key, module_key);

    if (!(await fileExists(filePath))) {
      return NextResponse.json({ success: false, error: 'File not found' }, { status: 404 });
    }

    const parseResult = await readAndParseCSV(filePath);

    let updated = false;
    const updatedData = parseResult.data.map((row: any) => {
      if (row.codeset === nodeId) {
        updated = true;
        return {
          ...row,
          ACT_00000141: code,
          ACT_00000150: code
        };
      }
      return row;
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'Codeset not found' }, { status: 404 });
    }

    const updatedCsv = Papa.unparse(updatedData);
    await fs.writeFile(filePath, updatedCsv);

    return NextResponse.json({ success: true, message: 'Codeset updated successfully' });

  } catch (error) {
    console.error('PUT error:', error);
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : 'Failed to update codeset' }, { status: 500 });
  }
}
