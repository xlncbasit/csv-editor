import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { CsvRow } from '@/components/csv-editor/types';

const TOMCAT_CONFIG_PATH = '/opt/tomcat/webapps/ROOT/upload/configfiles';
const TOMCAT_CODESET_PATH = '/opt/tomcat/webapps/ROOT/upload/codefiles';
const BASE_PATH = '/FM/repo/verceldeploy/data/users';

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

    if (!org_key || !module_key || !csvContent?.rows?.length) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required parameters or invalid CSV content' 
      }, { status: 400 });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvString = [
      ...csvContent.headerRows.map(row => row.join(',')),
      ...csvContent.rows.map(row => row.data.join(','))
    ].join('\n');

    // Save to Tomcat directories
    await fs.mkdir(TOMCAT_CONFIG_PATH, { recursive: true });
    await fs.mkdir(TOMCAT_CODESET_PATH, { recursive: true });
    
    const tomcatConfigPath = path.join(TOMCAT_CONFIG_PATH, 'config.csv');
    await fs.writeFile(tomcatConfigPath, csvString, 'utf-8');

    // Save to FM repo directory
    const fmConfigPath = path.join(BASE_PATH, org_key, module_key, 'config.csv');
    const fmCodesetPath = path.join(BASE_PATH, org_key, module_key, 'codesetvalues.csv');
    
    await fs.mkdir(path.dirname(fmConfigPath), { recursive: true });
    await fs.writeFile(fmConfigPath, csvString, 'utf-8');

    // Handle codesets
    const codesetRows = csvContent.rows.filter(row => row.data[1] === 'CAT');
    if (codesetRows.length > 0) {
      const codesetContent = codesetRows.map(row => row.data.join(',')).join('\n');
      
      await fs.writeFile(path.join(TOMCAT_CODESET_PATH, 'codesetvalues.csv'), codesetContent, 'utf-8');
      await fs.writeFile(fmCodesetPath, codesetContent, 'utf-8');
    }

    return NextResponse.json({
      success: true,
      message: 'Configuration saved successfully',
      paths: {
        tomcat: {
          config: tomcatConfigPath,
          codeset: path.join(TOMCAT_CODESET_PATH, 'codesetvalues.csv')
        },
        fm: {
          config: fmConfigPath,
          codeset: fmCodesetPath
        }
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