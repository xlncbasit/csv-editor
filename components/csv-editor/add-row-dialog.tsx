'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useGroupSync } from '@/hooks/use-group-sync';

const FIELD_TYPES = [
  'TAG', 'NAM', 'QTY', 'CAT', 
  'GEN', 'IMG', 'REM', 'TIM'
];

interface AddRowDialogProps {
  onAddRow: (fieldType: string, label: string, syncWithGroup: boolean) => void;
}

export function AddRowDialog({ onAddRow }: AddRowDialogProps) {
  const [selectedType, setSelectedType] = useState('');
  const [label, setLabel] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [syncWithGroup, setSyncWithGroup] = useState(false);
  const { syncing } = useGroupSync();
  const { toast } = useToast();

  const handleAddRow = () => {
    if (selectedType && label.trim()) {
      try {
        onAddRow(selectedType, label.trim(), syncWithGroup);
        setDialogOpen(false);
        setSelectedType('');
        setLabel('');
        setSyncWithGroup(false);
      } catch (error) {
        toast({
          title: "Error",
          description: error instanceof Error ? error.message : "Failed to add field",
          variant: "destructive"
        });
      }
    }
  };

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm"
          className="bg-white hover:bg-gray-50"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Field
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-white border shadow-lg">
        <DialogHeader className="pb-4 border-b">
          <DialogTitle className="text-xl font-semibold text-gray-900">
            Add New Field
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-6">
          <div className="space-y-2">
            <Label htmlFor="field-type" className="text-sm font-semibold text-gray-700">
              Field Type
            </Label>
            <Select 
              value={selectedType} 
              onValueChange={setSelectedType}
            >
              <SelectTrigger 
                id="field-type" 
                className="w-full bg-white border focus:ring-2 focus:ring-gray-200"
              >
                <SelectValue placeholder="Select field type" />
              </SelectTrigger>
              <SelectContent className="bg-white border">
                {FIELD_TYPES.map((type) => (
                  <SelectItem 
                    key={type} 
                    value={type}
                    className="hover:bg-gray-50"
                  >
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="field-label" className="text-sm font-semibold text-gray-700">
              Field Label
            </Label>
            <Input
              id="field-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="Enter field label"
              className="w-full border focus:ring-2 focus:ring-gray-200"
            />
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox 
              id="sync-group"
              checked={syncWithGroup}
              onCheckedChange={(checked) => setSyncWithGroup(checked as boolean)}
              disabled={syncing}
            />
            <Label 
              htmlFor="sync-group"
              className="text-sm text-gray-600"
            >
              Sync this field with group configurations
              {syncing && <span className="ml-2 text-blue-500">(Syncing...)</span>}
            </Label>
          </div>
          
          {syncWithGroup && (
            <div className="text-sm text-gray-500 bg-blue-50 p-3 rounded-md">
              This will add the field to all related configurations in the same group.
            </div>
          )}
        </div>
        
        <DialogFooter className="pt-4 border-t gap-2">
          <Button 
            variant="outline" 
            onClick={() => {
              setDialogOpen(false);
              setSelectedType('');
              setLabel('');
              setSyncWithGroup(false);
            }}
            className="bg-white hover:bg-gray-50"
            disabled={syncing}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddRow}
            disabled={!selectedType || !label.trim() || syncing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {syncing ? 'Adding...' : 'Add Field'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}