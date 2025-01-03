// app/api/save-config/route.ts
import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { CsvRow } from '@/components/csv-editor/types';

const CONFIG_PATH = '/opt/tomcat/webapps/ROOT/upload/configfiles';
const CODESET_PATH = '/opt/tomcat/webapps/ROOT/upload/codesetfiles';

interface SaveConfigRequest {
  csvContent: {
    headerRows: string[][];
    rows: CsvRow[];
    headers: string[];
  }
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    const body = await request.json() as SaveConfigRequest;
    const { csvContent } = body;

    if (!org_key || !module_key) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters' 
      }, { status: 400 });
    }

    if (!csvContent?.rows?.length) {
      return NextResponse.json({
        success: false,
        error: 'Invalid CSV content'
      }, { status: 400 });
    }

    // Create timestamp for backup
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    
    // Ensure directories exist
    await fs.mkdir(CONFIG_PATH, { recursive: true });
    await fs.mkdir(CODESET_PATH, { recursive: true });

    // Prepare CSV content
    const headerContent = csvContent.headerRows
      .map(row => row.join(','))
      .join('\n');
    
    const dataContent = csvContent.rows
      .map(row => row.data.join(','))
      .join('\n');
    
    const csvString = `${headerContent}\n${dataContent}`;

    // Save config file with backup
    const configBackupPath = path.join(CONFIG_PATH, `config.csv`);
    console.log('Saving configuration to:', configBackupPath);
    await fs.writeFile(configBackupPath, csvString, 'utf-8');
    console.log('Configuration file saved successfully');

    // Save codeset file if exists
    const codesetRows = csvContent.rows.filter(row => row.data[1] === 'CAT');
    if (codesetRows.length > 0) {
      const codesetBackupPath = path.join(CODESET_PATH, `codesetvalues.csv`);
      const codesetContent = codesetRows
        .map(row => row.data.join(','))
        .join('\n');
      await fs.writeFile(codesetBackupPath, codesetContent, 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      backup: {
        config: configBackupPath,
        codeset: codesetRows.length > 0
      }
    });
  } catch (error) {
    console.error('Save config error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save configuration'
    }, { status: 500 });
  }
}