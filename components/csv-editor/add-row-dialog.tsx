'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

const FIELD_TYPES = [
  'TAG', 'NAM', 'QTY', 'CAT', 
  'GEN', 'IMG', 'REM', 'TIM'
];

interface AddRowDialogProps {
  onAddRow: (fieldType: string) => void;
}

export function AddRowDialog({ onAddRow }: AddRowDialogProps) {
  const [selectedType, setSelectedType] = useState('GEN');
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleAddRow = () => {
    onAddRow(selectedType);
    setDialogOpen(false);
    setSelectedType('GEN');
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
            Add New Row
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4 py-6">
          <div className="flex flex-col gap-3">
            <label 
              htmlFor="field-type" 
              className="text-sm font-semibold text-gray-700"
            >
              Field Type
            </label>
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
        </div>
        <DialogFooter className="pt-4 border-t gap-2">
          <Button 
            variant="outline" 
            onClick={() => setDialogOpen(false)}
            className="bg-white hover:bg-gray-50"
          >
            Cancel
          </Button>
          <Button 
            onClick={handleAddRow}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            Add Field
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}