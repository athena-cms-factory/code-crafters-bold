import React, { useState } from 'react';

const SectionToolbar = ({ sectionTitle, tableName, onConfigChange }) => {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div 
      className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
    >
      <div className="flex gap-2 bg-white/95 backdrop-blur-sm shadow-lg rounded-lg p-2 border border-slate-200">
        <button
          className="p-2 hover:bg-slate-100 rounded transition-colors"
          title="Velden configureren"
          onClick={() => {
            // TODO: Open field configuration modal
            console.log('Configure fields for:', tableName);
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
          </svg>
        </button>
        
        <button
          className="p-2 hover:bg-slate-100 rounded transition-colors"
          title="Sectie hernoemen"
          onClick={() => {
            // TODO: Rename section
            console.log('Rename section:', sectionTitle);
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        <button
          className="p-2 hover:bg-slate-100 rounded transition-colors"
          title="Sectie verbergen"
          onClick={() => {
            // TODO: Hide section
            console.log('Hide section:', sectionTitle);
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default SectionToolbar;
