import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { Label } from '@/components/ui/label';

interface AddCodesetDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  existingCodesets: string[];
}

export function AddCodesetDialog({
  open,
  onOpenChange,
  onSuccess,
  existingCodesets
}: AddCodesetDialogProps) {
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState('');
  const [description, setDescription] = useState('');
  const { toast } = useToast();
  const searchParams = useSearchParams();

  const generateNextField = (): string => {
    const numbers = existingCodesets
      .map(code => parseInt(code.replace('field', '')))
      .filter(num => !isNaN(num));
    
    const nextNum = numbers.length > 0 
      ? Math.max(...numbers) + 1 
      : 1;
    
    return `field${String(nextNum).padStart(3, '0')}`;
  };

  const generateCode = (desc: string): string => {
    return desc.toUpperCase().replace(/\s+/g, '_');
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const newField = generateNextField();
      const code = generateCode(description);
      
      const response = await fetch(
        `/edit/api/codesets?org_key=${searchParams.get('org_key')}&module_key=${searchParams.get('module_key')}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            newCodeset: {
              field: newField,
              Type: type,
              Level: 'LEVEL_001',
              Code: code,
              Description: description
            }
          })
        }
      );

      if (!response.ok) throw new Error('Failed to add codeset');

      toast({
        title: 'Success',
        description: `Added new codeset: ${newField}`
      });

      onSuccess();
      onOpenChange(false);
      setType('');
      setDescription('');
    } catch (error) {
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to add codeset',
        variant: 'destructive'
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
            <Label>Type</Label>
            <Input
              value={type}
              onChange={(e) => setType(e.target.value)}
              placeholder="Enter type"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Description</Label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter description"
            />
          </div>

          {description && (
            <div className="text-sm text-muted-foreground">
              Code will be: {generateCode(description)}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            onClick={handleSubmit}
            disabled={loading || !type.trim() || !description.trim()}
          >
            {loading ? 'Adding...' : 'Add Codeset'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}