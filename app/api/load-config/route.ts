import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { join } from 'path';
import { cwd } from 'process';

const USER_DATA_PATH = 'C:/Users/ASUS/erp-setup-tool - vercel/data/users';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    const filename = searchParams.get('filename') ?? 'config.csv';

    if (!org_key || !module_key) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: org_key and module_key'
      }, { status: 400 });
    }

    const filePath = path.join(USER_DATA_PATH, org_key, module_key, filename);

    try {
      const csvContent = await fs.readFile(filePath, 'utf-8');
      return NextResponse.json({
        success: true,
        csvContent,
        filename
      });
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({
          success: false,
          error: 'Configuration file not found'
        }, { status: 404 });
      }
      throw error;
    }
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}

// Define allowed HTTP methods
export async function OPTIONS(request: Request) {
  return NextResponse.json({}, { 
    headers: {
      'Allow': 'GET, OPTIONS'
    }
  });
}