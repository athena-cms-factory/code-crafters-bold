import React from 'react';

const HelpModal = ({ onClose }) => {
  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="bg-slate-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[85vh] overflow-hidden border border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-700 flex justify-between items-center">
          <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
            <i className="fa-solid fa-circle-question text-slate-400"></i>
            Save & Publish Protocol
          </h3>
          <button onClick={onClose} className="text-slate-500 hover:text-white transition-colors">
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto max-h-[calc(85vh-60px)] space-y-5 text-sm text-slate-300">
          
          {/* Flow */}
          <div className="flex items-center gap-1 text-[10px] font-mono justify-center flex-wrap">
            <span className="bg-slate-800 px-2 py-1 rounded">Dock bewerking</span>
            <span className="text-slate-600">→</span>
            <span className="bg-slate-800 px-2 py-1 rounded">automatisch op schijf</span>
            <span className="text-slate-600">→</span>
            <span className="bg-slate-800 px-2 py-1 rounded">Sync → Sheets</span>
            <span className="text-slate-600">→</span>
            <span className="bg-slate-800 px-2 py-1 rounded">Push → GitHub</span>
            <span className="text-slate-600">→</span>
            <span className="bg-slate-800 px-2 py-1 rounded">Live</span>
          </div>

          <div className="h-px bg-slate-800"></div>

          {/* Stap 0 */}
          <div>
            <p className="text-white font-bold mb-1">Bewerkingen (automatisch opgeslagen)</p>
            <p className="leading-relaxed">
              Alle bewerkingen via de Dock (tekst, velden, padding, layout, secties) worden 
              <strong className="text-white"> automatisch </strong> naar de lokale JSON-bestanden geschreven. 
              Geen knop nodig. Gebruik <strong className="text-white">Undo/Redo</strong> bij fouten.
            </p>
          </div>

          <div className="h-px bg-slate-800"></div>

          {/* De 4 stappen */}
          <div className="space-y-4">
            <p className="text-white font-bold text-xs uppercase tracking-widest">Volgorde bij afsluiten sessie:</p>

            <div className="flex gap-3 items-start">
              <span className="text-slate-500 font-mono text-lg leading-none mt-0.5">1</span>
              <div>
                <p className="text-white font-bold">Controleer Preview</p>
                <p><strong className="text-slate-300">⟳</strong> knop (header). Kijk of alles klopt.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="text-slate-500 font-mono text-lg leading-none mt-0.5">2</span>
              <div>
                <p className="text-white font-bold">Sync to Google Sheets</p>
                <p>Groene knop (sidebar). Stuurt lokale data naar de Sheet. Wacht op ✅.</p>
                <p className="text-slate-400 mt-0.5">Let op: overschrijft de huidige Sheet-inhoud.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="text-slate-500 font-mono text-lg leading-none mt-0.5">3</span>
              <div>
                <p className="text-white font-bold">Push to GitHub</p>
                <p>Paarse knop (header). Vul commit bericht in. Wacht op ✅.</p>
                <p className="text-slate-400 mt-0.5">Workflow detecteert sites/ wijzigingen → subtree push → auto-build.</p>
              </div>
            </div>

            <div className="flex gap-3 items-start">
              <span className="text-slate-500 font-mono text-lg leading-none mt-0.5">4</span>
              <div>
                <p className="text-white font-bold">Controleer Live</p>
                <p>Groene <strong className="text-slate-300">Live</strong> knop (header). Wacht 1-2 min voor GitHub Actions.</p>
              </div>
            </div>
          </div>

          <div className="h-px bg-slate-800"></div>

          {/* Fouten */}
          <div>
            <p className="text-white font-bold mb-2">Vermijd</p>
            <div className="space-y-1.5 text-[11px]">
              <p>• <strong className="text-white">Pushen zonder Sync</strong> — Sheets raakt uit sync. Altijd eerst Sync.</p>
              <p>• <strong className="text-white">Pull na lokale wijzigingen</strong> — overschrijft je werk. Eerst Sync.</p>
              <p>• <strong className="text-white">Vergeten te pushen</strong> — wijzigingen bestaan alleen lokaal.</p>
              <p>• <strong className="text-white">Browser sluiten tijdens Sync/Push</strong> — wacht op bevestiging.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default HelpModal;
