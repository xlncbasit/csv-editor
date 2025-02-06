import { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Loader2 } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { useCodesetManager } from '@/hooks/use-codeset-manager';

interface AddCodesetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function AddCodesetDialog({
  open,
  onOpenChange,
  onSuccess
}: AddCodesetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [newCodeset, setNewCodeset] = useState({
    field: '',
    Type: '',
    Level: 'Level_001',
    parentPath: '',
    Code: '',
    Description: ''
  });

  const { toast } = useToast();
  const searchParams = useSearchParams();
  const { 
    fetchExistingCodesets, 
    generateNextFieldNumber,
    validateFieldNumber,
    reset,
  } = useCodesetManager();

  const generateFieldNumber = useCallback(async () => {
    try {
      const org_key = searchParams.get('org_key');
      const module_key = searchParams.get('module_key');
      
      if (!org_key || !module_key) {
        throw new Error('Missing required parameters');
      }

      const existingFields = await fetchExistingCodesets(org_key, module_key);
      const nextField = generateNextFieldNumber(existingFields);
      
      setNewCodeset(prev => ({
        ...prev,
        field: nextField
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to generate field number';
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    }
  }, [fetchExistingCodesets, generateNextFieldNumber, searchParams, toast]);

  useEffect(() => {
    if (open) {
      generateFieldNumber();
    } else {
      setNewCodeset({
        field: '',
        Type: '',
        Level: 'Level_001',
        parentPath: '',
        Code: '',
        Description: ''
      });
      reset();
    }
  }, [open, generateFieldNumber, reset]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const org_key = searchParams.get('org_key');
      const module_key = searchParams.get('module_key');

      if (!newCodeset.field || !validateFieldNumber(newCodeset.field)) {
        throw new Error('Invalid field number');
      }

      const response = await fetch(
        `/edit/api/codesets?org_key=${org_key}&module_key=${module_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newCodeset })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add codeset');
      }

      toast({
        title: "Success",
        description: `Added new codeset with field number ${newCodeset.field}`
      });

      onSuccess();
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add codeset",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Codeset Value</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Field Number (Auto-generated)</Label>
            <Input
              value={newCodeset.field}
              readOnly
              className="bg-gray-50 cursor-not-allowed font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Type</Label>
            <Input
              value={newCodeset.Type}
              onChange={(e) => setNewCodeset({...newCodeset, Type: e.target.value.toUpperCase()})}
              placeholder="e.g., ACTIVITY"
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label>Parent Path</Label>
            <Input
              value={newCodeset.parentPath}
              onChange={(e) => setNewCodeset({...newCodeset, parentPath: e.target.value.toUpperCase()})}
              placeholder="e.g., ACTIVITY#CLEANINGUPD"
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label>Code</Label>
            <Input
              value={newCodeset.Code}
              onChange={(e) => setNewCodeset({...newCodeset, Code: e.target.value.toUpperCase()})}
              placeholder="e.g., PC_CLEANING"
              className="uppercase"
            />
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={newCodeset.Description}
              onChange={(e) => setNewCodeset({...newCodeset, Description: e.target.value})}
              placeholder="e.g., Post-Construction Cleanup"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={loading || !newCodeset.Type || !newCodeset.Code}
            className="w-full"
          >
            {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Add Codeset
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}