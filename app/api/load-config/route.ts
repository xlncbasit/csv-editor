import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const USER_DATA_PATH = 'data/users';

export async function GET(request: Request) {
  try {
    // Get URL parameters
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');

    console.log('Loading config for:', { org_key, module_key });


    // Validate required parameters
    if (!org_key || !module_key) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters: org_key and module_key'
      }, { status: 400 });
    }

    // Construct file path
    const filePath = path.join(USER_DATA_PATH, org_key, module_key, 'config.csv');
    console.log('Looking for file at:', filePath);

    try {
      // Read the CSV file
      const csvContent = await fs.readFile(filePath, 'utf-8');
      console.log('File loaded successfully, first 100 chars:', csvContent.substring(0, 100));

      return NextResponse.json({
        success: true,
        csvContent
      });
    } catch (error) {
      // Handle file not found or read errors
      console.error('File read error:', error);
      
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        return NextResponse.json({
          success: false,
          error: 'Configuration file not found'
        }, { status: 404 });
      }

      throw error; // Re-throw other errors
    }

  } catch (error) {
    console.error('Server error:', error);
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