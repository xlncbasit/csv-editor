import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { Plus, X, Loader2 } from 'lucide-react';
import HierarchicalCodesetEditor from '../codeset/hierarchial-codeset-selector';
import { useCodesetManager } from '@/hooks/use-codeset-manager';

interface CodesetValue {
  codeset: string;
  Type: string;
  Level: string;
  parentPath: string;
  Code: string;
  Description: string;
  field: string;
  listValues?: string[];
}

interface ListValueDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (values: string) => void;
  initialValues?: string;
  listType?: string;
  fieldCode?: string;
}

export function EnhancedListValueDialog({ 
  open, 
  onOpenChange, 
  onSave,
  initialValues,
  listType,
  fieldCode 
}: ListValueDialogProps) {
  const searchParams = useSearchParams();
  const { toast } = useToast();
  const { fetchExistingCodesets, generateNextFieldNumber } = useCodesetManager();
  const [values, setValues] = useState<string[]>(() => 
    initialValues ? initialValues.split('#').filter(v => v.trim()) : []
  );
  const [codesets, setCodesets] = useState<CodesetValue[]>([]);
  const [selectedCodeset, setSelectedCodeset] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [generatedField, setGeneratedField] = useState<string>('');
  const [newCodeset, setNewCodeset] = useState({
    field: '',
    Type: '',
    Level: 'Level_001',
    parentPath: '',
    Code: '',
    Description: ''
  });

  useEffect(() => {
    const generateFieldNumber = async () => {
      if (listType === 'Codeset' && open) {
        try {
          const org_key = searchParams.get('org_key');
          const module_key = searchParams.get('module_key');
          const existingFields = await fetchExistingCodesets(org_key, module_key);
          const nextField = generateNextFieldNumber(existingFields);
          setGeneratedField(nextField);
          setNewCodeset(prev => ({
            ...prev,
            field: nextField
          }));
          
          // Load existing codesets
          const response = await fetch(
            `/edit/api/codesets?org_key=${org_key}&module_key=${module_key}`
          );
          const data = await response.json();
          if (data.success) {
            setCodesets(data.codesets);
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Failed to initialize';
          setError(message);
          toast({
            title: "Error",
            description: message,
            variant: "destructive"
          });
        }
      }
    };

    generateFieldNumber();
  }, [open, listType]);

  const handleCodesetSelect = (value: string) => {
    setSelectedCodeset(value);
    toast({
      title: "Codeset Selected"
    });
  };

  const handleAddCodeset = async () => {
    try {
      setLoading(true);
      const org_key = searchParams.get('org_key');
      const module_key = searchParams.get('module_key');
      
      if (!generatedField || !newCodeset.Type || !newCodeset.Code) {
        throw new Error('Please fill in all required fields');
      }

      const codesetToAdd = {
        ...newCodeset,
        field: generatedField,
        Level: newCodeset.Level || 'Level_001'
      };

      const response = await fetch(
        `/edit/api/codesets?org_key=${org_key}&module_key=${module_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newCodeset: codesetToAdd })
        }
      );

      if (!response.ok) {
        throw new Error('Failed to add codeset');
      }

      toast({
        title: "Success",
        description: "New codeset added successfully"
      });
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

  if (listType === 'Codeset') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl bg-white max-h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Codeset Management</DialogTitle>
          </DialogHeader>
          
          {error && (
            <div className="p-4 text-red-500">
              <p>{error}</p>
              <Button onClick={() => setError(null)} variant="outline" className="mt-2">
                Dismiss
              </Button>
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
            </div>
          ) : (
            <Tabs defaultValue="select" className="w-full flex-1 overflow-hidden flex flex-col">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="select">Select Codeset</TabsTrigger>
                <TabsTrigger value="add">Add New Codeset</TabsTrigger>
              </TabsList>
              
              <TabsContent value="select" className="flex-1 overflow-hidden">
                <div className="h-full overflow-auto">
                  <HierarchicalCodesetEditor
                    onSelect={handleCodesetSelect}
                    selectedValue={selectedCodeset}
                    key={selectedCodeset}
                  />
                </div>
              </TabsContent>
              
              <TabsContent value="add">
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Codeset Field</label>
                      <Input
                        value={generatedField}
                        readOnly
                        className="bg-gray-50 cursor-not-allowed font-mono"
                        placeholder="Auto-generated"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Type</label>
                      <Input
                        value={newCodeset.Type}
                        onChange={e => setNewCodeset({...newCodeset, Type: e.target.value.toUpperCase()})}
                        placeholder="e.g., ACTIVITY"
                        className="uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Parent Path</label>
                      <Input
                        value={newCodeset.parentPath}
                        onChange={e => setNewCodeset({...newCodeset, parentPath: e.target.value.toUpperCase()})}
                        placeholder="e.g., ACTIVITY#CLEANINGUPD"
                        className="uppercase"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Code</label>
                      <Input
                        value={newCodeset.Code}
                        onChange={e => setNewCodeset({...newCodeset, Code: e.target.value.toUpperCase()})}
                        placeholder="e.g., PC_CLEANING"
                        className="uppercase"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Input
                      value={newCodeset.Description}
                      onChange={e => setNewCodeset({...newCodeset, Description: e.target.value})}
                      placeholder="e.g., Post-Construction Cleanup"
                    />
                  </div>

                  <Button
                    onClick={handleAddCodeset}
                    className="w-full"
                    disabled={loading || !newCodeset.Type || !newCodeset.Code}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                    Add New Codeset
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          )}
 
          <DialogFooter>
            <Button 
              onClick={() => {
                if (selectedCodeset) {
                  const selected = codesets.find(c => c.codeset === selectedCodeset);
                  if (selected) {
                    onSave(selected.parentPath || 'Root');
                  }
                }
                onOpenChange(false);
              }}
              disabled={!selectedCodeset || loading}
            >
              Use Selected Codeset
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-white">
        <DialogHeader>
          <DialogTitle>Enter List Values</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {values.map((value, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                value={value}
                onChange={(e) => {
                  const newValues = [...values];
                  newValues[index] = e.target.value;
                  setValues(newValues);
                }}
                placeholder={`Value ${index + 1}`}
                className="flex-1"
              />
              {values.length > 1 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setValues(values.filter((_, i) => i !== index))}
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          ))}
          <Button
            variant="outline"
            size="sm"
            onClick={() => setValues([...values, ''])}
            className="w-full"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Value
          </Button>
        </div>
        <DialogFooter>
          <Button onClick={() => {
            const filtered = values.filter(v => v.trim() !== '');
            if (filtered.length > 0) {
              onSave(filtered.join('#'));
            }
            onOpenChange(false);
          }}>
            Save Values
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}