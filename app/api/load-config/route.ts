import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');

    if (!org_key || !module_key) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    // Construct the path to the config file
    const filePath = path.join(
      process.cwd(),
      'data',
      'users',
      org_key,
      module_key,
      'config.csv'
    );

    console.log('Attempting to read file from:', filePath);

    try {
      // Check if file exists
      await fs.access(filePath);
    } catch {
      console.log('File not found at path:', filePath);
      return NextResponse.json({
        success: false,
        error: 'Configuration file not found'
      }, { status: 404 });
    }

    // Read file content
    const csvContent = await fs.readFile(filePath, 'utf-8');
    console.log('CSV Content loaded:', csvContent);

    return NextResponse.json({
      success: true,
      csvContent
    });

  } catch (error) {
    console.error('Error loading config:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to load configuration'
    }, { status: 500 });
  }
}