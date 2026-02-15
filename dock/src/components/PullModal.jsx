import React, { useState } from 'react';

const PullModal = ({ onConfirm, onCancel }) => {
  const [isChecked, setIsChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200 border border-slate-200 dark:border-slate-700">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4 text-blue-600 dark:text-blue-400">
            <i className="fa-solid fa-cloud-arrow-down text-3xl"></i>
            <h3 className="text-xl font-bold">Pull from Google Sheets</h3>
          </div>
          
          <p className="text-sm text-slate-600 dark:text-slate-400 mb-6 leading-relaxed">
            Zorg dat de Google Sheet correct is ingesteld:
          </p>

          <div className="space-y-2 mb-8 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <i className="fa-solid fa-check text-blue-500 text-xs"></i>
              <span>Bestand &gt; Delen &gt; Publiceren op internet</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <i className="fa-solid fa-check text-blue-500 text-xs"></i>
              <span>Klik op 'Publiceren' en bevestig</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-700 dark:text-slate-300">
              <i className="fa-solid fa-check text-blue-500 text-xs"></i>
              <span>Gedeeld met 'Iedereen met de link'</span>
            </div>
          </div>

          <label className="flex items-center gap-3 mb-8 p-3 rounded-xl border border-blue-100 dark:border-blue-900/30 bg-blue-50/30 dark:bg-blue-900/10 cursor-pointer hover:bg-blue-50 transition-colors" title="Vink dit aan nadat je hebt gecontroleerd of de Google Sheet correct is gepubliceerd op internet. Dit is nodig om de gegevens te kunnen ophalen.">
            <input 
              type="checkbox" 
              checked={isChecked} 
              onChange={() => setIsChecked(!isChecked)}
              className="w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            <span className="text-sm font-bold text-blue-800 dark:text-blue-200">Controle uitgevoerd</span>
          </label>

          <div className="flex gap-3">
            <button 
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-200 font-bold rounded-xl transition-all"
              title="Sluit dit venster zonder gegevens op te halen. Er verandert niets aan je huidige data."
            >
              Annuleren
            </button>
            <button 
              onClick={onConfirm}
              disabled={!isChecked}
              className={`flex-1 py-3 px-4 font-bold rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${
                isChecked 
                ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none' 
                : 'bg-slate-200 text-slate-400 cursor-not-allowed shadow-none'
              }`}
              title={isChecked ? "Haal nu de gegevens op uit Google Sheets en werk de lokale website bij. Je huidige lokale wijzigingen worden overschreven (er wordt wel een backup gemaakt)." : "Vink eerst 'Controle uitgevoerd' aan om door te gaan."}
            >
              <i className="fa-solid fa-cloud-arrow-down"></i>
              Pull Data
            </button>
          </div>
          
          <p className="text-[10px] text-slate-400 mt-4 text-center italic">
            Waarschuwing: Dit overschrijft je lokale wijzigingen. Er wordt automatisch een backup gemaakt.
          </p>
        </div>
      </div>
    </div>
  );
};

export default PullModal;