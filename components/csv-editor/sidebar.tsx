'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

interface ParameterBoxProps {
  label: string;
  value: string;
}

const ParameterBox = ({ label, value }: ParameterBoxProps) => (
  <div className="bg-[#fdbb11] rounded-lg border-4 border-black p-3">
    <div className="font-bold text-large text-black mb-1">
      {label}:
    </div>
    <div className="text-blac break-words font-medium">
      {value || 'Not specified'}
    </div>
  </div>
);

function SidebarContent() {
  const searchParams = useSearchParams();
  
  const parameters = [
    { label: 'orgKey', value: searchParams.get('org_key') || 'ingentas.io' },
    { label: 'userKey', value: searchParams.get('user_key') || 'srklite12@gmail.com' },
    { label: 'moduleKey', value: searchParams.get('module_key') || 'FM_INFO_PRODUCT' },
    { label: 'industry', value: searchParams.get('industry') || 'Manufacturing' },
    { label: 'subIndustry', value: searchParams.get('subindustry') || 'Robotics and Automation' }
  ];

  return (
    <div className="h-ar w-64 bg-[#3A53A3] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="h-16 p-4 border-b-4 border-black bg-black">
        <div className="text-white text-xl font-bold">
          fieldmobi.ai
        </div>
      </div>

      {/* Parameters Section */}
      <div className="p-5 space-y-6">
        <h2 className="text-white font-semibold text-lg mb-6">
          Configuration Parameters
        </h2>
        
        <div className="space-y-4">
          {parameters.map((param) => (
            <ParameterBox 
              key={param.label}
              label={param.label}
              value={param.value}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function SidebarSkeleton() {
  return (
    <div className="h-screen w-64 bg-[#3A53A3] flex flex-col flex-shrink-0">
      <div className="p-4 border-b-4 border-black bg-black">
        <div className="text-white text-xl font-bold">fieldmobi.ai</div>
      </div>
      <div className="p-5 space-y-6">
        <div className="h-6 w-48 bg-gray-600 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div 
              key={i} 
              className="h-20 bg-gray-600 rounded-lg animate-pulse" 
              style={{ animationDelay: `${i * 100}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

export default function Sidebar() {
  return (
    <Suspense fallback={<SidebarSkeleton />}>
      <SidebarContent />
    </Suspense>
  );
}