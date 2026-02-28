import React from 'react';

const RepeaterControls = ({ file, index, isHidden }) => {
  const isDev = import.meta.env.DEV;
  if (!isDev) return null;

  const getApiUrl = (path) => {
    const base = import.meta.env.BASE_URL || '/';
    return (base + '/' + path).replace(new RegExp('/+', 'g'), '/');
  };

  const handleAction = async (action) => {
    try {
      const res = await fetch(getApiUrl('__athena/update-json'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          file: file.toLowerCase(), 
          index, 
          action 
        })
      });
      const data = await res.json();
      if (data.success) {
        window.location.reload();
      }
    } catch (err) {
      console.error(`Action ${action} failed:`, err);
    }
  };

  return (
    <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-40 bg-white/90 dark:bg-slate-800/90 p-1 rounded-full shadow-lg border border-slate-200 dark:border-slate-700">
      <button 
        onClick={() => handleAction(isHidden ? 'show' : 'hide')}
        className={`p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${isHidden ? 'text-amber-500' : 'text-slate-400'}`}
        title={isHidden ? "Item tonen" : "Item verbergen"}
      >
        <i className={`fa-solid ${isHidden ? 'fa-eye-slash' : 'fa-eye'}`}></i>
      </button>
      
      <button 
        onClick={() => handleAction('remove')}
        className="p-2 rounded-full hover:bg-red-50 text-slate-400 hover:text-red-500 dark:hover:bg-red-900/30 transition-colors"
        title="Item verwijderen"
      >
        <i className="fa-solid fa-trash-can"></i>
      </button>

      <div className="flex border-l border-slate-200 dark:border-slate-700 ml-1 pl-1">
        <button 
          onClick={() => handleAction('move-up')}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
          title="Omhoog verplaatsen"
        >
          <i className="fa-solid fa-chevron-up"></i>
        </button>
        <button 
          onClick={() => handleAction('move-down')}
          className="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 hover:text-blue-500 transition-colors"
          title="Omlaag verplaatsen"
        >
          <i className="fa-solid fa-chevron-down"></i>
        </button>
      </div>
    </div>
  );
};

export default RepeaterControls;
