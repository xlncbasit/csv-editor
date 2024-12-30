import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useSearchParams } from 'next/navigation';
import { Plus, X } from 'lucide-react';
import HierarchicalCodesetEditor from '../codeset/hierarchial-codeset-selector';

interface CodesetValue {
  codeset: string;
  type: string;
  application: string;
  name: string;
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
  const [values, setValues] = useState<string[]>(() => 
    initialValues ? initialValues.split('#') : ['']
  );
  const [codesets, setCodesets] = useState<CodesetValue[]>([]);
  const [selectedCodeset, setSelectedCodeset] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [newCodeset, setNewCodeset] = useState({
    codeset: '',
    type: '',
    application: '',
    name: ''
  });
  const handleCodesetSelect = (value: string) => {
    setSelectedCodeset(value);
    // Update the UI to show the selected codeset
    toast({
      title: "Codeset Selected",
      description: `Selected codeset: ${value}`,
    });
  };


  useEffect(() => {
    if (listType === 'Codeset' && open) {
      loadCodesets();
    }
  }, [listType, open]);

  const loadCodesets = async () => {
    try {
      setLoading(true);
      const org_key = searchParams.get('org_key');
      const module_key = searchParams.get('module_key');
      
      const response = await fetch(
        `/edit/api/codesets?org_key=${org_key}&module_key=${module_key}`
      );
      const data = await response.json();
      
      if (data.success) {
        setCodesets(data.codesets);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load codesets",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddCodeset = async () => {
    try {
      const org_key = searchParams.get('org_key');
      const module_key = searchParams.get('module_key');
      
      const response = await fetch(
        `/edit/api/codesets?org_key=${org_key}&module_key=${module_key}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ newCodeset })
        }
      );

      if (response.ok) {
        toast({
          title: "Success",
          description: "New codeset added successfully"
        });
        loadCodesets();
        setNewCodeset({
          codeset: '',
          type: '',
          application: '',
          name: ''
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add new codeset",
        variant: "destructive"
      });
    }
  };

  if (listType === 'Codeset') {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-xl bg-white">
          <DialogHeader>
            <DialogTitle>Codeset Management</DialogTitle>
          </DialogHeader>
          
          <Tabs defaultValue="select" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="select">Select Codeset</TabsTrigger>
              <TabsTrigger value="add">Add New Codeset</TabsTrigger>
            </TabsList>
            
            <TabsContent value="select">
              < HierarchicalCodesetEditor
                  onSelect={handleCodesetSelect}
                  selectedValue={selectedCodeset}
               />
            </TabsContent>
            
            <TabsContent value="add">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Codeset ID</label>
                    <Input
                      value={newCodeset.codeset}
                      onChange={e => setNewCodeset({
                        ...newCodeset,
                        codeset: e.target.value
                      })}
                      placeholder="Enter codeset ID"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Type</label>
                    <Input
                      value={newCodeset.type}
                      onChange={e => setNewCodeset({
                        ...newCodeset,
                        type: e.target.value
                      })}
                      placeholder="Enter type"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium">Application</label>
                  <Input
                    value={newCodeset.application}
                    onChange={e => setNewCodeset({
                      ...newCodeset,
                      application: e.target.value
                    })}
                    placeholder="Enter application"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <Input
                    value={newCodeset.name}
                    onChange={e => setNewCodeset({
                      ...newCodeset,
                      name: e.target.value
                    })}
                    placeholder="Enter name"
                  />
                </div>
                <Button
                  onClick={handleAddCodeset}
                  className="w-full"
                  disabled={!newCodeset.codeset || !newCodeset.name}
                >
                  Add New Codeset
                </Button>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button 
              onClick={() => {
                if (selectedCodeset) {
                  const values = codesets
                    .filter(c => c.codeset === selectedCodeset)
                    .map(c => c.name)
                    .join('#');
                  onSave(values);
                }
                onOpenChange(false);
              }}
              disabled={!selectedCodeset}
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