import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { CsvRow } from '@/components/csv-editor/types';
import { ConfigSyncManager } from '@/lib/configSync';

// Constants
const TOMCAT_CONFIG_PATH = '/opt/tomcat/webapps/ROOT/upload/configfiles';
const TOMCAT_CODESET_PATH = '/opt/tomcat/webapps/ROOT/upload/codefiles';
const BASE_PATH = 'C:/Users/ASUS/erp-setup-tool - vercel/data/users';

// Initialize sync manager
const syncManager = new ConfigSyncManager();

// Types
interface SaveConfigRequest {
  csvContent: {
    headerRows: string[][];
    rows: CsvRow[];
    headers: string[];
  };
  syncGroup?: boolean;
}

// Utility Functions
function validateCsvRow(row: string, expectedLength: number): string[] {
  const cells = row.split(',');
  while (cells.length < expectedLength) {
    cells.push('');
  }
  return cells.slice(0, expectedLength); // Ensure we don't exceed expected length
}

function normalizeLineEndings(content: string): string {
  return content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

function logObject(label: string, obj: any) {
  console.log(`${label}:`, JSON.stringify(obj, null, 2));
}

// Helper Functions
async function saveToLocation(
  csvString: string, 
  configPath: string, 
  codesetPath: string, 
  codesetContent: string,
): Promise<void> {
  console.log('Saving configuration to:', configPath);
  try {
    // Create backup before saving
    

    // Save main files
    console.log('Creating directory:', path.dirname(configPath));
    await fs.mkdir(path.dirname(configPath), { recursive: true });
    
    console.log('Writing config file');
    await fs.writeFile(configPath, csvString, 'utf-8');
    
    if (codesetContent) {
      console.log('Writing codeset file to:', codesetPath);
      await fs.writeFile(codesetPath, codesetContent, 'utf-8');
    }
    
    console.log('Files saved successfully');
  } catch (error) {
    console.error('Save operation failed:', error);
    throw new Error(`Failed to save to ${configPath}: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function syncGroupConfigs(
  orgKey: string,
  moduleKey: string,
  csvString: string,
  codesetContent: string,
  configFilename: string,
  configContent: string,
  codesetFilename: string
): Promise<void> {
  console.log('\n=== Starting Group Sync Process ===');
  logObject('Parameters', { orgKey, moduleKey, configFilename });
  
  const groupInfo = syncManager.getModuleGroup(moduleKey);
  if (!groupInfo) return;

  const relatedModules = Object.entries(groupInfo.group.modules)
    .filter(([key]) => key !== moduleKey);
  console.log('Found related modules:', relatedModules.map(([key]) => key));

  const sourceLines = normalizeLineEndings(csvString).split('\n');
const sourceHeaders = sourceLines.slice(0, 4);
const sourceRows = sourceLines.slice(4);

const dataFieldMap = new Map();
sourceRows.forEach((row: string) => {
  const cells = validateCsvRow(row, sourceHeaders[0].split(',').length);
  if (cells[2]) {  // If data value exists
    dataFieldMap.set(cells[2], {
      label: cells[3],
      fieldType: cells[1]
    });
    console.log('Mapped:', cells[2], '->', cells[3]);
  }
});

  // Process each module
  for (const [targetModule, moduleConfig] of relatedModules) {
    try {
      console.log(`\n=== Processing ${targetModule} ===`);
      const targetConfigPath = path.join(BASE_PATH, orgKey, targetModule, configFilename);
      
      const targetContent = await fs.readFile(targetConfigPath, 'utf-8');
      const targetLines = normalizeLineEndings(targetContent).split('\n');
      const targetHeaders = targetLines.slice(0, 4);
      let targetRows = targetLines.slice(4);
      let changes = 0;

      // Update target rows
      
      targetRows = targetRows.map(row => {
        const cells = validateCsvRow(row, targetHeaders[0].split(',').length);
        const dataValue = cells[2];
        const dataField = cells[2];
        const sourceField = dataFieldMap.get(dataValue);
        const sourceData = dataFieldMap.get(dataField);
        
        if (sourceData) {
          console.log(`Found match for ${dataField}`);
          console.log(`Current label: ${cells[3]}`);
          console.log(`Source label: ${sourceData.label}`);
          
          if (cells[3] !== sourceData.label) {
            cells[3] = sourceData.label;
            cells[26] = 'CHANGE';
            console.log(`Updated label to: ${sourceData.label}`);
            return cells.join(',');
          }
        }
        return row;
      });


      if (changes > 0) {
        console.log(`\nSaving ${changes} changes to ${targetModule}`);
        const updatedContent = [...targetHeaders, ...targetRows].join('\n');
        const targetCodesetPath = path.join(BASE_PATH, orgKey, targetModule, codesetFilename);
        
        await saveToLocation(
          updatedContent, 
          targetConfigPath, 
          targetCodesetPath, 
          codesetContent
        );
        console.log('✓ Updates saved successfully');
      } else {
        console.log('\nNo label changes required');
      }

    } catch (error) {
      console.error(`Error processing ${targetModule}:`, error);
      throw error;
    }
  }
}

// Main API Route Handler
export async function POST(request: Request) {
  console.log('\n=== Starting Configuration Save Process ===');
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    const originalFilename = searchParams.get('filename');
    
    logObject('Request parameters', { org_key, module_key, originalFilename });
    
    const { csvContent, syncGroup = false } = await request.json() as SaveConfigRequest;

    // Validate request
    if (!org_key || !module_key || !csvContent?.rows?.length) {
      console.error('Invalid request parameters');
      return NextResponse.json({
        success: false,
        error: 'Missing required parameters or invalid CSV content'
      }, { status: 400 });
    }

    // Prepare filenames
    const configFilename = originalFilename || 'config.csv';
    const codesetFilename = configFilename.includes('config') 
      ? 'codesetvalues.csv' 
      : configFilename.replace('config', 'codesetvalues');

    logObject('File names', { configFilename, codesetFilename });

    // Generate content
    const csvString = [
      ...csvContent.headerRows.map(row => row.join(',')),
      ...csvContent.rows.map(row => row.data.join(','))
    ].join('\n');

    // Process codesets
    const codesetRows = csvContent.rows.filter(row => row.data[1] === 'CAT');
    const codesetContent = codesetRows.length > 0 
      ? codesetRows.map(row => row.data.join(',')).join('\n')
      : '';

    logObject('Content statistics', {
      csvRowCount: csvContent.rows.length,
      codesetRowCount: codesetRows.length
    });

    // Create directories
    await fs.mkdir(TOMCAT_CONFIG_PATH, { recursive: true });
    await fs.mkdir(TOMCAT_CODESET_PATH, { recursive: true });
    await fs.mkdir(path.join(BASE_PATH, org_key, module_key), { recursive: true });

    // Define paths
    const tomcatConfigPath = path.join(TOMCAT_CONFIG_PATH, configFilename);
    const tomcatCodesetPath = path.join(TOMCAT_CODESET_PATH, codesetFilename);
    const fmConfigPath = path.join(BASE_PATH, org_key, module_key, configFilename);
    const fmCodesetPath = path.join(BASE_PATH, org_key, module_key, codesetFilename);

    logObject('Save paths', {
      tomcatConfig: tomcatConfigPath,
      fmConfig: fmConfigPath
    });

    // Save primary configuration
    console.log('\nSaving primary configuration...');
    await Promise.all([
      saveToLocation(csvString, tomcatConfigPath, tomcatCodesetPath, codesetContent),
      saveToLocation(csvString, fmConfigPath, fmCodesetPath, codesetContent)
    ]);
    console.log('Primary configuration saved successfully');

    // Handle group sync
    let syncError = null;
    let syncResults = null;

    if (syncGroup) {
      console.log('\nInitiating group synchronization...');
      try {
        await syncGroupConfigs(
          org_key, 
          module_key, 
          csvString, 
          codesetContent, 
          configFilename,
          csvString, // Add the configContent parameter
          codesetFilename
        );
        console.log('Group synchronization completed successfully');
      } catch (error) {
        console.error('Group sync failed:', error);
        syncError = error instanceof Error ? error.message : 'Group sync failed';
      }
    }

    // Return response
    return NextResponse.json({
      success: true,
      message: syncError 
        ? 'Configuration saved but group sync failed' 
        : 'Configuration saved successfully',
      syncError,
      paths: {
        tomcat: { config: tomcatConfigPath, codeset: tomcatCodesetPath },
        fm: { config: fmConfigPath, codeset: fmCodesetPath }
      },
      metadata: {
        timestamp: new Date().toISOString(),
        originalFilename: configFilename,
        rowCount: csvContent.rows.length,
        codesetCount: codesetRows.length,
        groupSynced: syncGroup && !syncError,
        syncResults: syncResults
      }
    });

  } catch (error) {
    console.error('\n=== Save Configuration Error ===');
    console.error('Error details:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to save configuration',
      timestamp: new Date().toISOString(),
      errorDetails: process.env.NODE_ENV === 'development' ? {
        name: error instanceof Error ? error.name : 'Unknown Error',
        stack: error instanceof Error ? error.stack : undefined
      } : undefined
    }, { status: 500 });
  } finally {
    console.log('\n=== Save Configuration Process Complete ===');
  }
}

// Export additional utility functions for testing
