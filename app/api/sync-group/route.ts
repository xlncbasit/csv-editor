import { NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs/promises';
import { ConfigSyncManager } from '@/lib/configSync';

const BASE_PATH = '/FM/repo/verceldeploy/data/users';
const syncManager = new ConfigSyncManager();

interface FieldMapping {
  data: string;
  label: string;
  type: string;
  customization: string;
  list_type?: string;
  list_value?: string;
}

interface SyncRequest {
  configContent: string;
  fieldData: {
    fieldType: string;
    label: string;
    customization: 'NEW' | 'CHANGE';
    dataValue: string;
  };
}

interface CsvRow {
  data: string[];
  id: string;
}

async function readAndParseConfig(filePath: string) {
  console.log('\n=== Reading Configuration ===');
  console.log('File path:', filePath);
  
  const content = await fs.readFile(filePath, 'utf-8');
  const lines = content.split('\n').map(line => line.trim());
  const headers = lines.slice(0, 4);
  const dataRows = lines.slice(4);
  
  console.log('Configuration Stats:');
  console.log('- Header rows:', headers.length);
  console.log('- Data rows:', dataRows.length);

  const fieldMappings = new Map<string, FieldMapping>();
  dataRows.forEach(row => {
    const cells = row.split(',').map(cell => cell.trim());
    if (cells.length >= 27) {
      fieldMappings.set(cells[2], {
        data: cells[2],
        label: cells[3],
        type: cells[1],
        customization: cells[26],
        list_type: cells[8],
        list_value: cells[9]
      });
    }
  });
  
  return { content, headers, dataRows, fieldMappings };
}

async function validateModuleAccess(orgKey: string, moduleKey: string) {
  try {
    const configPath = path.join(BASE_PATH, orgKey, moduleKey, 'config.csv');
    await fs.access(configPath);
    return true;
  } catch {
    console.error(`Module ${moduleKey} not accessible for ${orgKey}`);
    return false;
  }
}

async function syncGroupConfigs(orgKey: string, moduleKey: string, rows: CsvRow[], fieldData: SyncRequest['fieldData']) {
  console.log('\n========== Starting Group Sync ==========');
  console.log('Source:', { orgKey, moduleKey, fieldData });

  const groupInfo = syncManager.getModuleGroup(moduleKey);
  if (!groupInfo) {
    console.log('No group configuration found for module');
    return;
  }

  // Convert rows to CSV content
  const csvContent = rows.map(row => row.data.join(',')).join('\n');
  const sourceLines = csvContent.split('\n');
  const sourceDataFields = new Map<string, FieldMapping>();

  // Extract all fields with their current state
  sourceLines.slice(4).forEach(row => {
    const cells = row.split(',').map(cell => cell.trim());
    if (cells.length >= 27) {
      sourceDataFields.set(cells[2], {
        data: cells[2],
        label: cells[3],
        type: cells[1],
        customization: cells[26],
        list_type: cells[8],
        list_value: cells[9]
      });
    }
  });

  // Get all modules in the same group
  const relatedModules = Object.entries(groupInfo.group.modules)
    .filter(([key]) => key !== moduleKey);

  console.log('Related modules to sync:', relatedModules.map(([key]) => key));

  const results = [];

  // Process each related module
  for (const [targetModule, moduleConfig] of relatedModules) {
    try {
      console.log(`\n=== Processing ${targetModule} ===`);
      
      // Validate access
      if (!(await validateModuleAccess(orgKey, targetModule))) {
        results.push({
          module: targetModule,
          success: false,
          error: 'Module not accessible'
        });
        continue;
      }

      const configPath = path.join(BASE_PATH, orgKey, targetModule, 'config.csv');
      const { headers, dataRows, fieldMappings: targetFields } = await readAndParseConfig(configPath);
      let updatedRows = [...dataRows];
      let changes = 0;

      // Get field to update based on DATA value
      const targetFieldIndices = dataRows.reduce((acc, row, index) => {
        const cells = row.split(',').map(cell => cell.trim());
        if (cells[2] === fieldData.dataValue) {
          acc.push(index);
        }
        return acc;
      }, [] as number[]);

      for (const targetIndex of targetFieldIndices) {
        if (targetIndex === -1) continue;

        const targetCells = updatedRows[targetIndex].split(',').map(cell => cell.trim());
        let modified = false;

        // Update fields based on module's sync configuration
        if (moduleConfig.syncFields.includes('label')) {
          console.log('Updating label:', {
            from: targetCells[3],
            to: fieldData.label
          });
          targetCells[3] = fieldData.label;
          modified = true;
        }

        if (moduleConfig.syncFields.includes('listType')) {
          const sourceField = sourceDataFields.get(fieldData.dataValue);
          if (sourceField?.list_type) {
            console.log('Updating list type:', {
              from: targetCells[8],
              to: sourceField.list_type
            });
            targetCells[8] = sourceField.list_type;
            modified = true;
          }
        }

        if (moduleConfig.syncFields.includes('listValues')) {
          const sourceField = sourceDataFields.get(fieldData.dataValue);
          if (sourceField?.list_value) {
            console.log('Updating list values:', {
              from: targetCells[9],
              to: sourceField.list_value
            });
            targetCells[9] = sourceField.list_value;
            modified = true;
          }
        }

        if (modified) {
          // Update customization status
          targetCells[26] = fieldData.customization;
          updatedRows[targetIndex] = targetCells.join(',');
          changes++;
        }
      }

      if (changes > 0) {
        const updatedContent = [...headers, ...updatedRows].join('\n');
        await fs.writeFile(configPath, updatedContent, 'utf8');
        console.log(`Updated ${changes} fields in ${targetModule}`);
        
        results.push({
          module: targetModule,
          success: true,
          changes
        });
      } else {
        console.log(`No changes needed for ${targetModule}`);
        results.push({
          module: targetModule,
          success: true,
          changes: 0
        });
      }
      
    } catch (error) {
      console.error(`Error processing ${targetModule}:`, error);
      results.push({
        module: targetModule,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  return results;
}

export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const org_key = searchParams.get('org_key');
    const module_key = searchParams.get('module_key');
    
    if (!org_key || !module_key) {
      throw new Error('Missing required parameters');
    }

    const { configContent, fieldData }: SyncRequest = await request.json();
    
    // Parse and validate the config content
    const rows = JSON.parse(configContent) as CsvRow[];
    if (!rows.length) {
      throw new Error('Invalid configuration content');
    }

    console.log('\n=== Starting Sync Process ===');
    console.log('Organization:', org_key);
    console.log('Module:', module_key);
    console.log('Field Data:', fieldData);

    const results = await syncGroupConfigs(org_key, module_key, rows, fieldData);

    return NextResponse.json({ 
      success: true,
      results,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Sync failed:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Sync failed',
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}