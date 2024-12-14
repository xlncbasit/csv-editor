// lib/parameter-validation.ts

export interface CustomizerParams {
    org_key: string;
    user_key: string;
    module_key: string;
    industry: string;
    subindustry: string;
  }
  
  export class ParamValidationError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'ParamValidationError';
    }
  }
  
  export function validateParams(params: Partial<CustomizerParams>): CustomizerParams {
    const {
      org_key,
      user_key, 
      module_key,
      industry,
      subindustry
    } = params;
  
    // Check required params
    if (!org_key) throw new ParamValidationError('org_key is required');
    if (!user_key) throw new ParamValidationError('user_key is required');
    if (!module_key) throw new ParamValidationError('module_key is required');
    if (!industry) throw new ParamValidationError('industry is required');
    if (!subindustry) throw new ParamValidationError('subindustry is required');
  
    // Validate org_key format
    if (!/^[\w.-]+\.fieldmobi\.com$/.test(org_key)) {
      throw new ParamValidationError('Invalid org_key format. Must end with .fieldmobi.com');
    }
  
    // Validate email format for user_key
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(user_key)) {
      throw new ParamValidationError('Invalid user_key format. Must be a valid email');
    }
  
    // Validate module_key format
    if (!/^[A-Z0-9_]+$/.test(module_key)) {
      throw new ParamValidationError('Invalid module_key format. Must contain only uppercase letters, numbers and underscores');
    }
  
    return {
      org_key,
      user_key,
      module_key,
      industry,
      subindustry
    };
  }