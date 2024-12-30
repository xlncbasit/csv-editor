import React, { useState, useEffect } from 'react';
import { Table } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

interface CodesetNode {
  codeset: string;
  Type: string;
  application: string;
  Name: string;
  code: string;
  parentPath?: string;
  listValues?: string[];
  children?: CodesetNode[];
}

interface HierarchicalCodesetSelectorProps {
  onSelect: (value: string) => void;
  selectedValue?: string;
}

export default function HierarchicalCodesetSelector({ onSelect, selectedValue }: HierarchicalCodesetSelectorProps) {
  const [codesetData, setCodesetData] = useState<CodesetNode[]>([]);
  const [filteredData, setFilteredData] = useState<CodesetNode[]>([]);
  const [selectedPath, setSelectedPath] = useState<string>('');
  const { toast } = useToast();
  const searchParams = useSearchParams();

  useEffect(() => {
    loadCodesets();
  }, []);

  const loadCodesets = async () => {
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
        // Process codesets and sort by codeset name
        const processedCodesets = data.codesets
          .map((item: CodesetNode) => ({
            ...item,
            listValues: item.code ? item.code.split('#') : []
          }))
          .sort((a: CodesetNode, b: CodesetNode) => 
            a.codeset.localeCompare(b.codeset)
          );
        
        setCodesetData(processedCodesets);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load codesets",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (selectedPath && codesetData.length) {
      const filtered = codesetData.filter(item => 
        item.parentPath === selectedPath || 
        (item.parentPath && item.parentPath.startsWith(selectedPath + '#'))
      );
      setFilteredData(filtered);
    }
  }, [selectedPath, codesetData]);

  const handleCodeUpdate = async (nodeId: string, newCode: string) => {
    try {
      const response = await fetch('/api/codesets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodeId,
          code: newCode
        })
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Values updated successfully"
        });
        
        const updatedData = codesetData.map(item => 
          item.codeset === nodeId ? 
          { ...item, code: newCode, listValues: newCode.split('#') } : 
          item
        );
        setCodesetData(updatedData);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update values",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-4 p-4 bg-white rounded-lg shadow">
      <div className="flex flex-col space-y-2">
        <label className="text-sm font-medium text-gray-700">Select Codeset</label>
        <Select
          onValueChange={setSelectedPath}
          value={selectedPath}
        >
          <SelectTrigger className="w-full bg-white border-gray-200">
            <SelectValue placeholder="Choose a codeset" />
          </SelectTrigger>
          <SelectContent>
            <ScrollArea className="h-72">
              {codesetData.map((codeset, index) => (
                <SelectItem 
                  key={`${codeset.codeset}-${index}`}
                  value={codeset.codeset}
                  className="py-2 px-4 hover:bg-gray-100"
                >
                  <div className="flex flex-col">
                    <span className="font-medium">{codeset.codeset} - {codeset.Type}</span>
                    {codeset.parentPath && (
                      <span className="text-sm text-gray-500">
                        Parent: {codeset.parentPath}
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </ScrollArea>
          </SelectContent>
        </Select>
      </div>

      {selectedPath && filteredData.length > 0 && (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-2 text-left font-medium text-gray-700">Name</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Type</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Parent Path</th>
                <th className="px-4 py-2 text-left font-medium text-gray-700">Values</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.map((item) => (
                <tr key={item.codeset} className="border-t hover:bg-gray-50">
                  <td className="px-4 py-3">{item.Name}</td>
                  <td className="px-4 py-3">{item.Type}</td>
                  <td className="px-4 py-3">{item.parentPath}</td>
                  <td className="px-4 py-3">
                    <Accordion type="single" collapsible>
                      <AccordionItem value="values">
                        <AccordionTrigger className="text-sm hover:no-underline">
                          {item.listValues?.length || 0} values
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {item.listValues?.map((value, index) => (
                              <div key={index} className="flex items-center gap-2">
                                <Input
                                  value={value}
                                  onChange={(e) => {
                                    const newValues = [...(item.listValues || [])];
                                    newValues[index] = e.target.value;
                                    handleCodeUpdate(item.codeset, newValues.join('#'));
                                  }}
                                  className="flex-1"
                                />
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
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