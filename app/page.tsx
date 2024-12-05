import React from 'react';
import { CsvGrid } from '@/components/csv-editor/csv-grid';

const Home = () => {
  return (
    <main className="min-h-screen bg-[#f4f4f4]">
      <nav className="w-full bg-white shadow-sm py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <h1 className="text-xl font-bold">CSV Editor</h1>
          <div className="flex gap-4">
            <button className="bg-[#41C1CF] text-black font-medium px-6 py-2 rounded-full border-2 border-black hover:bg-[#3A53A3] hover:text-white transition-colors">
              Save Changes
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="space-y-4">
          <div className="bg-white p-6 rounded-[20px] border-2 border-black">
            <h2 className="text-xl font-bold mb-4">Your Data</h2>
            <p className="text-sm text-gray-600 mb-6">
              Edit your CSV files with this interactive editor. Double-click cells to edit, add rows and columns, and download your changes.
            </p>
            <CsvGrid />
          </div>
        </div>
      </div>
    </main>
  );
};

export default Home;