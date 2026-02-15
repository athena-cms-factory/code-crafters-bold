import React, { useState } from 'react';

const SyncModal = ({ onConfirm, onCancel }) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-700">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-green-600 dark:text-green-400">
            <i className="fa-solid fa-cloud-arrow-up text-3xl"></i>
            <h3 className="text-xl font-bold">Sync to Google Sheets</h3>
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Klaar om je lokale wijzigingen naar de cloud te pushen? 
            Controleer de volgende punten:
          </p>

          <div className="space-y-2 mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <i className="fa-solid fa-check text-green-500 text-xs"></i>
              <span>Deelinstellingen: 'Iedereen met de link' (Lezer)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <i className="fa-solid fa-check text-green-500 text-xs"></i>
              <span>Gepubliceerd op internet via 'Bestand &gt; Delen'</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300 font-bold text-amber-600 dark:text-amber-400">
              <i className="fa-solid fa-server text-xs"></i>
              <span>Dashboard Server actief via ./launch-dashboard.sh</span>
            </div>
          </div>

          <label className="flex items-center gap-3 mb-8 p-3 rounded-xl border border-green-100 dark:border-green-900/30 bg-green-50/30 dark:bg-green-900/10 cursor-pointer hover:bg-green-50 transition-colors" title="Bevestig dat je de instellingen van je Google Sheet hebt gecontroleerd en dat de Dashboard Server draait.">
            <input 
              type="checkbox" 
              checked={isChecked} 
              onChange={() => setIsChecked(!isChecked)}
              className="w-5 h-5 rounded border-slate-300 text-green-600 focus:ring-green-500"
            />
            <span className="text-sm font-bold text-green-800 dark:text-green-200">Controle uitgevoerd</span>
          </label>

          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-bold rounded-xl transition-all"
              title="Sluit dit venster zonder je wijzigingen te synchroniseren naar de cloud."
            >
              Annuleren
            </button>
            <button 
              onClick={onConfirm}
              disabled={!isChecked}
              className={`flex-1 py-3 px-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                isChecked 
                ? 'bg-green-600 hover:bg-green-700 text-white shadow-green-200 dark:shadow-none' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
              title={isChecked ? "Stuur al je lokale Dock-wijzigingen naar de Google Sheet in de cloud. Hiermee worden je aanpassingen definitief opgeslagen in je centrale database." : "Vink eerst 'Controle uitgevoerd' aan om door te gaan."}
            >
              <i className="fa-solid fa-cloud-arrow-up"></i>
              Push to Cloud
            </button>
          </div>
          
          <p className="text-[10px] text-slate-400 mt-4 text-center italic">
            Wil je de huidige lokale wijzigingen naar de cloud pushen?
          </p>
        </div>
      </div>
    </div>
  );
};

export default SyncModal;