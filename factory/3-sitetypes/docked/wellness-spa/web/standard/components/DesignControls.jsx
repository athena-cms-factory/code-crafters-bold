import React, { useState, useEffect, useCallback } from 'react';

/**
 * DesignControls
 * Zwevend paneel om de 'vibe' van de site aan te passen.
 * NU: Zonder flitsen, met live preview!
 */
export default function DesignControls({ settings: initialSettings }) {
  if (!import.meta.env.DEV) return null;

  const [isOpen, setIsOpen] = useState(false);
  const [localSettings, setLocalSettings] = useState(initialSettings);

  // Synchroniseer lokale staat als props veranderen (bijv. na een externe sync)
  useEffect(() => {
    setLocalSettings(initialSettings);
  }, [initialSettings]);

  // Live preview functie: past CSS variabelen direct toe op de document root
  const applyLivePreview = useCallback((settings) => {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', settings.primary_color || '#0f172a');
    root.style.setProperty('--accent-color', settings.accent_color || '#3b82f6');
    root.style.setProperty('--bg-site', settings.bg_color || '#ffffff');
    
    if (settings.theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, []);

  const updateStyle = async (key, value) => {
    // 1. Update lokale staat voor onmiddellijke UI reactie
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    
    // 2. Pas live preview toe (geen refresh nodig!)
    applyLivePreview(newSettings);

    // 3. Sla op naar JSON op de achtergrond
    try {
      const baseUrl = import.meta.env.BASE_URL || '/';
      const apiUrl = `${baseUrl}__athena/update-json`.replace(/\/+/g, '/');
      await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
            file: 'site_settings', 
            index: 0, 
            key, 
            value 
        })
      });
      // Geen window.location.reload() meer!
    } catch (err) { console.error("❌ Opslaan mislukt:", err); }
  };

  return (
    <div className="fixed bottom-6 left-6 z-[1000] flex flex-col items-start gap-4">
      {isOpen && (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-700 w-64 animate-in slide-in-from-bottom-4 duration-300">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Site Design</h3>
            <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">LIVE</span>
          </div>
          
          <div className="space-y-6">
            {/* THEMA TOGGLE */}
            <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Thema</label>
                <div className="flex bg-slate-100 dark:bg-slate-900 p-1 rounded-full">
                    <button 
                        onClick={() => updateStyle('theme', 'light')}
                        className={`flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all ${localSettings.theme !== 'dark' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                    >Light</button>
                    <button 
                        onClick={() => updateStyle('theme', 'dark')}
                        className={`flex-1 py-1.5 rounded-full text-[10px] font-bold transition-all ${localSettings.theme === 'dark' ? 'bg-white/10 shadow-sm text-white' : 'text-slate-400'}`}
                    >Dark</button>
                </div>
            </div>

            {/* KLEUREN */}
            <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Primary Color</label>
                <div className="flex items-center gap-3">
                    <input 
                        type="color" 
                        value={localSettings.primary_color || '#0f172a'} 
                        onChange={(e) => updateStyle('primary_color', e.target.value)}
                        className="w-full h-10 rounded-xl cursor-pointer border-2 border-slate-100 dark:border-slate-700 bg-transparent overflow-hidden"
                    />
                </div>
            </div>

            <div>
                <label className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Background Color</label>
                <input 
                    type="color" 
                    value={localSettings.bg_color || '#ffffff'} 
                    onChange={(e) => updateStyle('bg_color', e.target.value)}
                    className="w-full h-10 rounded-xl cursor-pointer border-2 border-slate-100 dark:border-slate-700 bg-transparent overflow-hidden"
                />
            </div>
          </div>
          
          <p className="mt-6 text-[9px] text-slate-400 italic leading-tight">
            Wijzigingen worden direct opgeslagen in site_settings.json
          </p>
        </div>
      )}

      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all ${isOpen ? 'bg-slate-800 text-white rotate-90' : 'bg-blue-600 text-white hover:scale-110 active:scale-95'}`}
      >
        <i className={`fa-solid ${isOpen ? 'fa-xmark' : 'fa-palette'} text-xl`}></i>
      </button>
    </div>
  );
}
