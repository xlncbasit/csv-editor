// hooks/use-group-sync.ts
import { useState } from 'react';
import { useToast } from './use-toast';

export const useGroupSync = () => {
  const [syncing, setSyncing] = useState(false);
  const { toast } = useToast();

  const syncWithGroup = async (
    orgKey: string | null, 
    moduleKey: string | null,
    configContent: string,
    fieldData: {
      fieldType: string;
      label: string;
      customization: 'NEW' | 'CHANGE';
      dataValue: string;
    }
  ) => {
    if (!orgKey || !moduleKey) {
      toast({
        title: "Error",
        description: "Missing organization or module key",
        variant: "destructive"
      });
      return false;
    }

    try {
      setSyncing(true);
      console.log('Starting group sync:', { orgKey, moduleKey, fieldData });
      
      const response = await fetch(
        `/edit/api/sync-group?org_key=${orgKey}&module_key=${moduleKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ configContent, fieldData })
        }
      );

      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Sync failed');

      toast({
        title: "Success",
        description: "Field synchronized with group configurations"
      });

      return true;
    } catch (error) {
      console.error('Sync failed:', error);
      toast({
        title: "Sync Failed",
        description: error instanceof Error ? error.message : "Failed to sync with group",
        variant: "destructive"
      });
      return false;
    } finally {
      setSyncing(false);
    }
  };

  return {
    syncWithGroup,
    syncing
  };
};