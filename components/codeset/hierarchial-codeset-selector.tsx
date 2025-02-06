import React, { useState, useEffect, useCallback } from 'react';
import { Table } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchParams } from 'next/navigation';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Save } from 'lucide-react';

interface CodesetNode {
  codeset: string;
  type: string;
  level: string;
  parentPath: string;
  code: string;
  description: string;
  name: string;
  listValues?: string[];
}

interface HierarchicalCodesetSelectorProps {
  onSelect: (value: string) => void;
  selectedValue?: string;
}

export default function HierarchicalCodesetSelector({ 
  onSelect, 
  selectedValue 
}: HierarchicalCodesetSelectorProps) {
  const [codesetData, setCodesetData] = useState<CodesetNode[]>([]);
  const [tableData, setTableData] = useState<CodesetNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>(selectedValue || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [editMode, setEditMode] = useState(false);
  const { toast } = useToast();
  const searchParams = useSearchParams();

  // Memoized API calls
  const loadCodesets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const org_key = searchParams.get('org_key');
      const module_key = searchParams.get('module_key');
      const response = await fetch(
        `/edit/api/codesets?org_key=${org_key}&module_key=${module_key}`,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'Cache-Control': 'no-cache'
          }
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      
      if (data.success) {
        const processedCodesets = data.codesets
          .map((item: CodesetNode) => ({
            ...item,
            displayName: `${item.name} (${item.parentPath || 'Root'})`,
            listValues: item.description ? [item.description] : ['']
          }))
          .sort((a: CodesetNode, b: CodesetNode) => {
            const pathCompare = (a.parentPath || '').localeCompare(b.parentPath || '');
            if (pathCompare !== 0) return pathCompare;
            if (a.level && b.level) {
              return parseInt(a.level) - parseInt(b.level);
            }
            return a.name.localeCompare(b.name);
          });
        
        setCodesetData(processedCodesets);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to load codesets';
      setError(message);
      toast({
        title: "Error",
        description: message,
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  }, [searchParams, toast]);

  const handleDescriptionUpdate = useCallback(async (nodeId: string, newDescription: string) => {
    try {
      const org_key = searchParams.get('org_key');
      const module_key = searchParams.get('module_key');
      
      const response = await fetch(
        `/edit/api/codesets?org_key=${org_key}&module_key=${module_key}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ nodeId, description: newDescription })
        }
      );

      if (response.ok) {
        toast({ 
          title: "Success", 
          description: "Description updated successfully" 
        });
        
        setCodesetData(prevData => 
          prevData.map(item => 
            item.codeset === nodeId ? 
            { ...item, description: newDescription, listValues: [newDescription] } : 
            item
          )
        );
        
        setTableData(prevData => 
          prevData.map(item =>
            item.codeset === nodeId ?
            { ...item, description: newDescription, listValues: [newDescription] } :
            item
          )
        );
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update description",
        variant: "destructive"
      });
    }
  }, [searchParams, toast]);

  // Effects
  useEffect(() => {
    loadCodesets();
  }, [loadCodesets]);

  useEffect(() => {
    if (selectedValue && codesetData.length > 0) {
      const selectedNode = codesetData.find(item => item.codeset === selectedValue);
      if (selectedNode) {
        setSelectedPath(selectedValue);
        const relatedItems = codesetData.filter(
          item => (item.parentPath || 'Root') === selectedNode.parentPath
        );
        setTableData(relatedItems);
      }
    }
  }, [selectedValue, codesetData]);

  // Memoized derived data
  const filteredCodesets = React.useMemo(() => {
    return codesetData.filter(codeset => 
      codeset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      codeset.parentPath?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      codeset.description?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [codesetData, searchTerm]);

  const uniqueCodesets = React.useMemo(() => {
    const groupedByPath = filteredCodesets.reduce((acc, item) => {
      const path = item.parentPath || 'Root';
      if (!acc[path]) {
        acc[path] = [];
      }
      acc[path].push(item);
      return acc;
    }, {} as Record<string, CodesetNode[]>);
    
    return Object.entries(groupedByPath)
      .map(([parentPath, items]) => ({
        parentPath,
        codeset: items[0].codeset,
        items: items,
        totalItems: items.length
      }))
      .sort((a, b) => a.parentPath.localeCompare(b.parentPath));
  }, [filteredCodesets]);

  const handleSelect = useCallback((value: string) => {
    setSelectedPath(value);
    const selected = uniqueCodesets.find(item => item.codeset === value);
    
    if (selected) {
      onSelect(selected.parentPath);
      const relatedItems = codesetData.filter(
        item => (item.parentPath || 'Root') === selected.parentPath
      );
      setTableData(relatedItems);
    }
    onSelect(value);
  }, [uniqueCodesets, codesetData, onSelect]);

  if (loading) return (
    <div className="flex justify-center items-center p-8">
      <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
    </div>
  );

  if (error) return (
    <div className="p-4 text-red-500">
      <p>{error}</p>
      <Button 
        onClick={loadCodesets}
        variant="outline" 
        className="mt-4"
      >
        Retry Loading
      </Button>
    </div>
  );

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow h-[60vh] overflow-hidden flex flex-col">
      <div className="space-y-4">
        <Input
          placeholder="Search codesets..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full"
        />
        
        <Select
          onValueChange={handleSelect}
          value={selectedPath}
        >
          <SelectTrigger className="w-full bg-white border-gray-200">
            <SelectValue placeholder="Choose a codeset" />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-72">
              {uniqueCodesets.map((group) => (
                <SelectItem 
                  key={group.codeset}
                  value={group.codeset}
                  className="py-2 px-4 hover:bg-gray-100"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{group.parentPath}</span>
                    <span className="text-sm text-gray-500">
                      {group.totalItems} items
                    </span>
                  </div>
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
      </div>

      {selectedPath && tableData.length > 0 && (
        <div className="border rounded-lg flex-1 overflow-auto">
          <Table>
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Level</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Description</th>
                <th className="px-4 py-2 w-24"></th>
              </tr>
            </thead>
            <tbody>
              {tableData.map((item) => (
                <tr key={item.codeset} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{item.name}</td>
                  <td className="px-4 py-3">{item.level}</td>
                  <td className="px-4 py-3">
                    <Input
                      value={item.description || ''}
                      onChange={(e) => {
                        if (editMode) {
                          setTableData(prevData => 
                            prevData.map(tableItem =>
                              tableItem.codeset === item.codeset ?
                              { ...tableItem, description: e.target.value } :
                              tableItem
                            )
                          );
                        }
                      }}
                      onBlur={() => {
                        if (editMode) {
                          handleDescriptionUpdate(item.codeset, item.description);
                        }
                      }}
                      disabled={!editMode}
                      className="w-full"
                      placeholder="Enter description"
                    />
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setEditMode(!editMode)}
                    >
                      {editMode ? <Save className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      )}
    </div>
  );
}