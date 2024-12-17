'use client';

import Image from 'next/image';
import { useSearchParams } from 'next/navigation';

interface ParameterBoxProps {
  label: string;
  value: string;
}

const ParameterBox = ({ label, value }: ParameterBoxProps) => (
  <div className="bg-[#fdbb11] rounded-lg border-4 border-black p-3">
    <div className="font-bold text-black text-sm mb-1">
      {label}:
    </div>
    <div className="text-black text-sm break-words font-medium">
      {value || 'Not specified'}
    </div>
  </div>
);

export default function Sidebar() {
  const searchParams = useSearchParams();
  
  const parameters = [
    { label: 'orgKey', value: searchParams.get('org_key') || 'ingentas.io' },
    { label: 'userKey', value: searchParams.get('user_key') || 'srklite12@gmail.com' },
    { label: 'moduleKey', value: searchParams.get('module_key') || 'FM_INFO_PRODUCT' },
    { label: 'industry', value: searchParams.get('industry') || 'Manufacturing' },
    { label: 'subIndustry', value: searchParams.get('subindustry') || 'Robotics and Automation' }
  ];

  return (
    <div className="h-screen w-64 bg-[#3A53A3] flex flex-col flex-shrink-0">
      {/* Logo */}
      <div className="p-4 border-b-4 border-black bg-black">
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