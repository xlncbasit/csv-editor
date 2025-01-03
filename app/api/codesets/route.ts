import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import Papa from 'papaparse';

const USER_DATA_PATH = '/FM/repo/verceldeploy/data/users';

const COLUMN_MAP = {
  Type: 2,
  Level: 3,
  parentPath: 4,
  Code: 5,
  Description: 6
} as const;


interface Codeset {
  field: string;
  Type: string;
  Level: string;
  parentPath: string;
  Code: string;
  Description: string;
}


async function appendToCSV(filePath: string, newCodeset: Partial<Codeset>) {
  try {
    // Read existing file content
    const fileContent = await fs.readFile(filePath, 'utf-8');
    const lines = fileContent.split('\n');
    
    // Preserve header rows (first 3 lines)
    const headerRows = lines.slice(0, 4);
    const dataContent = lines.slice(4);

    // Parse existing data
    const parseResult = Papa.parse<Codeset>(dataContent.join('\n'), {
      header: true,
      skipEmptyLines: true,
      transform: (value) => value?.trim() || ''
    });

    // Check for duplicates
    /* const isDuplicate = parseResult.data.some(
      row => row.field === newCodeset.field  
            //  row.Code === newCodeset.Code
    );

    if (isDuplicate) {
      throw new Error('Duplicate codeset or code found');
    } */

    // Format new row according to existing structure
    const newRow = Papa.unparse([newCodeset], {
      header: false
    });

    // Combine headers, existing data, and new row
    const updatedContent = [
      ...headerRows,
      ...dataContent,
      newRow
    ].join('\n');

    // Write back to file
    await fs.writeFile(filePath, updatedContent);

    return true;
  } catch (error) {
    console.error('Error appending to CSV:', error);
    throw error;
  }
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
  console.log('First 100 characters:', fileContent);

  const lines = fileContent.split('\n');
  const headerRow = lines[2];
  const dataContent = lines.slice(3).join('\n');
  console.log('Processing from row 4, starting with:', dataContent.slice(0, 100));


  const parseResult = Papa.parse<Codeset>(dataContent, {
    header: true,
    skipEmptyLines: 'greedy',
    transform: (value) => value?.trim() || '',
    transformHeader: (header) => {
      // Map header names to match the actual CSV structure
      const headerMap: { [key: string]: string } = {
        'field': 'field',
        'Type': 'Type',
        'Level': 'Level',
        'Parent Path': 'parentPath',
        'Code': 'Code',
        'Description': 'Description'
      };
      return headerMap[header] || header;
    }
  });

  

  console.log('parsed codeset:', parseResult )

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

    const codesets = parseResult.data.map(row => ({
      codeset: row.field,
      type: row.Type,
      level: row.Level,
      parentPath: row.parentPath,
      code: row.Code,
      description: row.Description,
      name: row.field // Using field as name for display purposes
    })).filter(item => item.codeset && item.type);

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

    /* const parseResult = await readAndParseCSV(filePath);
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
  } */

    await appendToCSV(filePath, newCodeset);

    return NextResponse.json({ 
      success: true, 
      message: 'Codeset added successfully' 
    });

  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to add codeset';
    const status = message.includes('Duplicate') ? 409 : 500;
    
    return NextResponse.json({ 
      success: false, 
      error: message 
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
    
    console.log('PUT parameters:', { org_key, module_key, nodeId, description });

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
    const updatedData = parseResult.data.map(row => {
      if (row.field === nodeId) {
        updated = true;
        return {
          ...row,
          Description: description
        };
      }
      return row;
    });


    if (!updated) {
      console.warn('Codeset not found:', nodeId);
      return NextResponse.json({ success: false, error: 'Codeset not found' }, { status: 404 });
    }

    const headerContent = (await fs.readFile(filePath, 'utf-8'))
      .split('\n')
      .slice(0, 2)
      .join('\n');


    const updatedCsv = Papa.unparse(updatedData);
    console.log('Generated updated CSV length:', updatedCsv.length);

    await fs.writeFile(filePath, `${headerContent}\n${updatedCsv}`);
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