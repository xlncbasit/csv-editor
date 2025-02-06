// lib/utils/configSync.ts
import fs from 'fs/promises';
import path from 'path';
import Papa from 'papaparse';

interface ConfigData {
 fieldType: string;
 label: string; 
 customization: 'NEW' | 'CHANGE';
}

interface ModuleConfig {
 syncFields: string[];
}

interface ConfigGroup {
 modules: Record<string, ModuleConfig>;
}

interface ParsedData {
 headers: string[];
 rows: ParsedRow[];
}

interface ParsedRow {
 fieldCode: string;
 type: string;
 data: string;
 label: string;
 access_level?: string;
 message?: string;
 default?: string;
 validation?: string;
 list_type?: string;
 list_value?: string;
 multi_group?: string;
 hidden?: string;
 link_setup?: string;
 update_setup?: string;
 filter?: string;
 search?: string;
 sort?: string;
 mobile?: string;
 detail?: string;
 create?: string;
 edit?: string;
 select?: string;
 map?: string;
 card?: string;
 report?: string;
 customization?: string;
}

interface SyncResult {
  success: boolean;
  moduleKey: string;
  error?: string;
}

export class ConfigSyncManager {
  private configGroups: Record<string, ConfigGroup>;
  private baseDir: string;
  private backupDir: string;

  constructor() {
    this.baseDir = 'C:/Users/ASUS/erp-setup-tool - vercel/data/users';
    this.backupDir = path.join(this.baseDir, '_backups');
    this.configGroups = {
      CHARGES_GROUP: {
        modules: {
          'FM_ACCOUNTS_OBJECT_CHARGESLITE_MANAGER': {
            syncFields: ['fieldType', 'label', 'listType', 'listValues']
          },
          'FM_ACCOUNTS_OBJECT_CONTROLSLITE_ALL': {
            syncFields: ['label', 'listType', 'listValues']
          },
          'FM_ACCOUNTS_OBJECT_BALANCELITE_ALL': {
            syncFields: ['label', 'listType', 'listValues']
          },
          'FM_ACCOUNTS_UPDATE_CHARGESLITE_ALL': {
            syncFields: ['label']
          }
        }
      },
      ASSET_GROUP: {
        modules: {
          'FM_ASSETS_OBJECT_ASSETLITE_ALL': {
            syncFields: ['fieldType', 'label', 'listType', 'listValues']
          },
          'FM_ASSETS_OBJECT_PRODUCTLITE_ALL': {
            syncFields: ['label', 'listType', 'listValues']
          },
          'FM_ASSETS_UPDATE_ASSETLITE_ALL': {
            syncFields: ['label']
          }
        }
      },
      PRODUCT_GROUP: {
        modules: {
          'FM_MATERIAL_OBJECT_PRODUCTLITE_MANAGER': {
            syncFields: ['fieldType', 'label', 'listType', 'listValues']
          },
          'FM_MATERIAL_SUMMARY_INVENTORYLITE_ALL': {
            syncFields: ['label', 'listType', 'listValues']
          },
          'FM_MATERIAL_UPDATE_INVENTORYLITE_ALL': {
            syncFields: ['label']
          }
        }
      },
      LEADS_GROUP: {
        modules: {
          'FM_SALES_OBJECT_LEADSLITE_ALL': {
            syncFields: ['fieldType', 'label', 'listType', 'listValues']
          },
          'FM_SALES_OBJECT_LEADS2LITE_ALL': {
            syncFields: ['label', 'listType', 'listValues']
          }
        }
      }
    };
  }

  

 // configSync.ts
 public async validateGroupAccess(orgKey: string, moduleKey: string): Promise<boolean> {
  console.log('Validating group access for:', { orgKey, moduleKey });
  const groupInfo = this.getModuleGroup(moduleKey);
  if (!groupInfo) {
    console.log('No group found for module:', moduleKey);
    return false;
  }

  const relatedModules = Object.keys(groupInfo.group.modules)
    .filter(key => key !== moduleKey);
  console.log('Related modules:', relatedModules);
  
  for (const relatedModule of relatedModules) {
    const configPath = path.join(this.baseDir, orgKey, relatedModule, 'config.csv');
    console.log('Checking config path:', configPath);
    try {
      await fs.access(configPath);
      console.log('Found config for module:', relatedModule);
      return true;
    } catch (error) {
      console.log('Config not found for module:', relatedModule);
    }
  }
  return false;
}

 private async parseConfig(content: string, orgKey: string): Promise<ParsedData> {
   return new Promise((resolve, reject) => {
     const lines = content.split('\n');
     const headers = lines.slice(0, 4);
     const dataLines = lines.slice(4);

     Papa.parse(dataLines.join('\n'), {
       header: false,
       skipEmptyLines: 'greedy',
       complete: (results) => {
         const rows = results.data as string[][];
         const parsedRows = rows.map(row => ({
           fieldCode: row[0] || '',
           type: row[1] || '',
           data: row[2] || '',
           label: row[3] || '',
           access_level: row[4],
           message: row[5],
           default: row[6],
           validation: row[7],
           list_type: row[8],
           list_value: row[9],
           multi_group: row[10],
           hidden: row[11],
           link_setup: row[12],
           update_setup: row[13],
           filter: row[14],
           search: row[15],
           sort: row[16],
           mobile: row[17],
           detail: row[18],
           create: row[19],
           edit: row[20],
           select: row[21],
           map: row[22], 
           card: row[23],
           report: row[24],
           customization: row[26]
         }));

         resolve({
           headers,
           rows: parsedRows
         });
       },
       error: reject
     });
   });
 }

 private async parseConfigContent(content: string): Promise<{headers: string[], dataRows: string[]}> {
  const lines = content.split('\n').map(line => line.trim());
  const headers = lines.slice(0, 4);
  const dataRows = lines.slice(4);
  return { headers, dataRows };
}

 private generateConfig(headers: string[], rows: ParsedRow[]): string {
   const dataContent = Papa.unparse(rows.map(row => ([
     row.fieldCode,
     row.type,
     row.data,
     row.label,
     row.access_level || '',
     row.message || '',
     row.default || '',
     row.validation || '',
     row.list_type || '',
     row.list_value || '',
     row.multi_group || '',
     row.hidden || '', 
     row.link_setup || '',
     row.update_setup || '',
     row.filter || '',
     row.search || '',
     row.sort || '',
     row.mobile || '',
     row.detail || '',
     row.create || '',
     row.edit || '',
     row.select || '',
     row.map || '',
     row.card || '',
     row.report || '',
     '',
     row.customization || '',
     '', '', '', '', '', '', ''
   ])), {
     header: false,
     skipEmptyLines: false
   });

   return [...headers, dataContent].join('\n');
 }

 public getModuleGroup(moduleKey: string): { group: ConfigGroup; moduleConfig: ModuleConfig } | null {
  console.log('Checking module:', moduleKey);
  console.log('Available groups:', Object.keys(this.configGroups));

  for (const [groupName, group] of Object.entries(this.configGroups)) {
    console.log(`Checking group ${groupName}:`, Object.keys(group.modules));
    if (moduleKey in group.modules) {
      console.log('Found module in group:', groupName);
      return { group, moduleConfig: group.modules[moduleKey] };
    }
  }
  console.log('Module not found in any group');
  return null;
}

private async readConfigFile(orgKey: string, moduleKey: string): Promise<string> {
  const filePath = path.join(this.baseDir, orgKey, moduleKey, 'config.csv');
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    console.log(`Successfully read config for ${moduleKey}`);
    return content;
  } catch (error) {
    throw new Error(`Failed to read config for ${moduleKey}: ${error}`);
  }
}

private async writeConfigFile(orgKey: string, moduleKey: string, content: string): Promise<void> {
  const filePath = path.join(this.baseDir, orgKey, moduleKey, 'config.csv');
  const backupPath = path.join(this.backupDir, `${moduleKey}_${Date.now()}.csv`);
  
  try {
    // Ensure directories exist
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.mkdir(this.backupDir, { recursive: true });

    // Create backup first
    await fs.writeFile(backupPath, content, 'utf-8');
    console.log(`Backup created at ${backupPath}`);

    // Write main file
    await fs.writeFile(filePath, content, 'utf-8');
    console.log(`Config written for ${moduleKey}`);
  } catch (error) {
    throw new Error(`Failed to write config for ${moduleKey}: ${error}`);
  }
}

 private async syncModule(
   sourceModule: ModuleConfig,
   targetModule: ModuleConfig, 
   sourceConfig: ParsedRow[],
   targetConfig: ParsedRow[],
   orgKey: string
 ): Promise<ParsedRow[]> {
   const updatedConfig = [...targetConfig];

   // Handle NEW fields
   const newFields = sourceConfig.filter(row => 
     row.customization === 'NEW' && row.fieldCode && row.data
   );

   for (const newField of newFields) {
     const existingField = updatedConfig.find(row => row.data === newField.data);
     
     if (!existingField && sourceModule.syncFields.includes(newField.type)) {
       updatedConfig.push({
         ...newField,
         customization: 'NEW'
       });
     }
   }

   // Handle field updates
   for (const sourceRow of sourceConfig) {
     if (!sourceRow.data || !sourceModule.syncFields.includes(sourceRow.type)) continue;

     const targetRows = updatedConfig.filter(row => row.data === sourceRow.data);
     
     for (const targetRow of targetRows) {
       let changed = false;

       if (targetModule.syncFields.includes('label') && 
           sourceRow.label !== targetRow.label) {
         targetRow.label = sourceRow.label;
         changed = true;
       }

       if (targetModule.syncFields.includes('listType') && 
           sourceRow.list_type !== targetRow.list_type) {
         targetRow.list_type = sourceRow.list_type;
         changed = true;  
       }

       if (targetModule.syncFields.includes('listValues') &&
           sourceRow.list_value !== targetRow.list_value) {
         targetRow.list_value = sourceRow.list_value;
         changed = true;
       }

       if (changed) {
         targetRow.customization = 'CHANGE';
       }
     }
   }

   return updatedConfig;
 }

 public async syncGroupConfigurations(params: {
  orgKey: string,
  moduleKey: string,
  configContent: string,
  fieldData: ConfigData
}): Promise<SyncResult[]> {
  console.log('Starting group sync:', params);
  const results: SyncResult[] = [];

  // Validate group access
  const isValid = await this.validateGroupAccess(params.orgKey, params.moduleKey);
  if (!isValid) {
    throw new Error('Invalid group configuration access');
  }

  // Get group info
  const groupInfo = this.getModuleGroup(params.moduleKey);
  if (!groupInfo) {
    throw new Error('Module does not belong to a group');
  }

  // Get related modules
  const relatedModules = Object.entries(groupInfo.group.modules)
    .filter(([key]) => key !== params.moduleKey);

  // Process each related module
  for (const [moduleKey, moduleConfig] of relatedModules) {
    try {
      console.log(`Processing module: ${moduleKey}`);

      // Read target configuration
      const targetContent = await this.readConfigFile(params.orgKey, moduleKey);
      
      // Parse source and target configurations
      const { headers: sourceHeaders, dataRows: sourceDataRows } = 
        await this.parseConfigContent(params.configContent);
      const { headers: targetHeaders, dataRows: targetDataRows } = 
        await this.parseConfigContent(targetContent);

      // Find rows that need to be synced
      const modifiedRows = sourceDataRows.filter(row => {
        const cells = this.parseCSVRow(row);
        return cells[26] === params.fieldData.customization;
      });

      console.log(`Found ${modifiedRows.length} modified rows to sync`);

      // Process each modified row
      const updatedDataRows = [...targetDataRows];
      for (const modifiedRow of modifiedRows) {
        const cells = this.parseCSVRow(modifiedRow);
        const label = cells[3];
        const fieldType = cells[1];

        // Only sync if field type is in module's syncFields
        if (!moduleConfig.syncFields.includes(fieldType)) {
          console.log(`Skipping row with field type ${fieldType} - not in sync fields`);
          continue;
        }

        // Find matching row in target
        const rowIndex = updatedDataRows.findIndex(row => {
          const targetCells = this.parseCSVRow(row);
          return targetCells[3] === label;
        });

        if (rowIndex >= 0) {
          // Update existing row
          updatedDataRows[rowIndex] = modifiedRow;
          console.log(`Updated existing row with label: ${label}`);
        } else if (params.fieldData.customization === 'NEW') {
          // Add new row
          updatedDataRows.push(modifiedRow);
          console.log(`Added new row with label: ${label}`);
        }
      }

      // Generate updated content
      const updatedContent = [...targetHeaders, ...updatedDataRows].join('\n');

      // Write updated configuration
      await this.writeConfigFile(params.orgKey, moduleKey, updatedContent);

      results.push({
        success: true,
        moduleKey
      });

    } catch (error) {
      console.error(`Failed to sync module ${moduleKey}:`, error);
      results.push({
        success: false,
        moduleKey,
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Log final results
  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;
  console.log(`Sync completed. Success: ${successCount}, Failed: ${failCount}`);

  return results;
}

  private parseCSVRow(row: string): string[] {
    return Papa.parse(row).data[0] as string[];
  }
}