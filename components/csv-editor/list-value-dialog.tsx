import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, X } from 'lucide-react';

interface ListValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: string) => void;
  initialValues?: string;
  listType?: string;
}

export function ListValueDialog({ 
  open, 
  onOpenChange, 
  onSave,
  initialValues,
  listType 
}: ListValueDialogProps) {
  const [values, setValues] = useState<string[]>(() => 
    initialValues ? initialValues.split('#') : ['']
  );

  const handleAddValue = () => {
    setValues([...values, '']);
  };

  const handleRemoveValue = (index: number) => {
    setValues(values.filter((_, i) => i !== index));
  };

  const handleValueChange = (index: number, value: string) => {
    const newValues = [...values];
    newValues[index] = value;
    setValues(newValues);
  };

  const handleSave = () => {
    const filteredValues = values.filter(v => v.trim() !== '');
    if (filteredValues.length > 0) {
      onSave(filteredValues.join('#'));
    }
    onOpenChange(false);
  };

  const getPlaceholder = (index: number) => {
    if (listType === 'Codeset') {
      return 'Enter codeset value';
    }
    return `Value ${index + 1}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>
            {listType === 'Codeset' ? 'Enter Codeset Value' : 'Enter List Values'}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {values.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={value}
                onChange={(e) => handleValueChange(index, e.target.value)}
                placeholder={getPlaceholder(index)}
                className="flex-1"
              />
              {values.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleRemoveValue(index)}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          {(listType === 'Fixed' || !listType) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleAddValue}
              className="w-full"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Value
            </Button>
          )}
        </div>
        <DialogFooter>
          <Button onClick={handleSave}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}