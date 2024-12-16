import React from 'react';

interface SidebarParams {
  orgKey?: string;
  userKey?: string;
  moduleKey?: string;
  industry?: string;
  subIndustry?: string;
  error?: string;
}

export default function ParametersSidebar({ 
  params = {} as SidebarParams 
}: { 
  params?: SidebarParams 
}) {
  // Ensure params is an object, default to empty object if null/undefined
  const safeParams = params || {};
  
  // Define display labels for parameters
  const paramLabels: Record<string, string> = {
    orgKey: "orgKey",
    userKey: "userKey",
    moduleKey: "moduleKey",
    industry: "industry",
    subIndustry: "subIndustry"
  };

  return (
    <div className="w-64 bg-[#3A53A3] border-r-4 border-black p-5 flex-shrink-0">
      <h2 className="text-white font-semibold text-lg mb-6">
        Configuration Parameters
      </h2>
      
      <div className="space-y-4">
        {Object.entries(paramLabels).map(([key, label]) => {
          const value = safeParams[key as keyof SidebarParams];
          if (key === 'error') return null;
          
          return (
            <div 
              key={key}
              className="bg-[#fdbb11] rounded-lg border-4 border-black p-3"
            >
              <div className="font-bold text-black text-sm mb-1">
                {label}:
              </div>
              <div className="text-black text-sm break-words font-medium">
                {value || 'Not specified'}
              </div>
            </div>
          );
        })}
      </div>

      {safeParams.error && (
        <div className="mt-4 p-3 bg-red-500 text-white rounded-lg border-2 border-black">
          <span className="flex items-center gap-2">
            <div className="w-2 h-2 bg-white rounded-full" />
            {safeParams.error} error
          </span>
        </div>
      )}
    </div>
  );
}