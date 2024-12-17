import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';

const USER_DATA_PATH = '/FM/repo/verceldeploy/data/users';
const TOMCAT_PATH = process.env.TOMCAT_PATH || '/opt/tomcat/webapps/ROOT/upload/configfiles';

export async function POST(request: Request) {
  try {
    const { csvContent, org_key, module_key } = await request.json();

    if (!csvContent || !org_key || !module_key) {
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters'
      }, { status: 400 });
    }

    // Save to original location
    const originalFilePath = path.join(
      USER_DATA_PATH,
      org_key,
      module_key,
      'config.csv'
    );

    // Save to Tomcat directory
    const tomcatFilePath = path.join(
      TOMCAT_PATH,
      org_key,
      module_key,
      'config.csv'
    );

    // Ensure directories exist
    await fs.mkdir(path.dirname(originalFilePath), { recursive: true });
    await fs.mkdir(path.dirname(tomcatFilePath), { recursive: true });

    // Save files
    await Promise.all([
      fs.writeFile(originalFilePath, csvContent, 'utf-8'),
      fs.writeFile(tomcatFilePath, csvContent, 'utf-8')
    ]);

    return NextResponse.json({
      success: true,
      message: 'CSV saved successfully to both locations'
    });

  } catch (error) {
    console.error('Error saving CSV:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to save CSV file'
    }, { status: 500 });
  }
}