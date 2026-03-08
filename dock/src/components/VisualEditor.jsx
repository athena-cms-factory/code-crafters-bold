import React, { useState, useEffect, useRef } from 'react';

const VisualEditor = ({ item, selectedSite, onSave, onCancel, onUpload }) => {
  const labelRef = useRef(null);
  const urlRef = useRef(null);
  const [allSites, setAllSites] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);

  const initialValueData = item.value || item.currentValue || '';
  const dockType = item.dockType || item.dataType || 'text';
  const isLink = dockType === 'link';
  const isMedia = dockType === 'media' || (!isLink && item.binding?.key?.toLowerCase().includes('image'));

  const [value, setValue] = useState('');
  const [linkData, setLinkData] = useState({ label: '', url: '' });
  const [textStyles, setTextStyles] = useState({
    color: '',
    fontSize: '',
    fontWeight: 'normal',
    fontStyle: 'normal',
    textAlign: 'left',
    fontFamily: '',
    shadowX: 0,
    shadowY: 0,
    shadowBlur: 0,
    shadowColor: 'rgba(0,0,0,0.5)'
  });

  // [v33 Debug Bridge]: Luister naar antwoorden van de site
  useEffect(() => {
    const handleSyncResponse = (event) => {
      const { type, key, value: siteValue } = event.data;
      
      // Controleer of dit antwoord voor ONS is (match op key)
      if (type === 'SITE_SYNC_RESPONSE' && key === item.binding?.key) {
        console.log('🏁 [VisualEditor] Parameters received from site:', siteValue);

        if (isLink) {
          const foundUrl = (typeof siteValue === 'object' && siteValue !== null) ? siteValue.url : siteValue;
          const foundLabel = (typeof siteValue === 'object' && siteValue !== null) ? siteValue.label : siteValue;
          setLinkData({ label: foundLabel || '', url: foundUrl || '' });
          if (labelRef.current) labelRef.current.value = foundLabel || '';
          if (urlRef.current) urlRef.current.value = foundUrl || '';
        } else if (!isMedia) {
          if (typeof siteValue === 'object' && siteValue !== null) {
            setValue(siteValue.text || siteValue.title || siteValue.label || siteValue.name || siteValue.value || '');
            setTextStyles({
              color: siteValue.color || '',
              fontSize: siteValue.fontSize || '',
              fontWeight: siteValue.fontWeight || 'normal',
              fontStyle: siteValue.fontStyle || 'normal',
              textAlign: siteValue.textAlign || 'left',
              fontFamily: siteValue.fontFamily || '',
              shadowX: siteValue.shadowX !== undefined ? siteValue.shadowX : 0,
              shadowY: siteValue.shadowY !== undefined ? siteValue.shadowY : 0,
              shadowBlur: siteValue.shadowBlur !== undefined ? siteValue.shadowBlur : 0,
              shadowColor: siteValue.shadowColor || 'rgba(0,0,0,0.5)'
            });
          } else {
            setValue(siteValue || '');
          }
        }
        setIsLoaded(true);
      }
    };

    window.addEventListener('message', handleSyncResponse);
    
    // On-Demand Sync logica
    const requestSync = () => {
      const iframe = document.querySelector('iframe');
      if (iframe && iframe.contentWindow) {
        iframe.contentWindow.postMessage({
          type: 'DOCK_REQUEST_SYNC',
          file: item.binding?.file,
          index: item.binding?.index,
          key: item.binding?.key
        }, '*');
      }
    };

    // STARTUP SEQUENCE:
    // 1. Toon de modal (is mount)
    // 2. Wacht heel even tot React klaar is
    // 3. Vraag data op
    const timer = setTimeout(() => {
        requestSync();
        // Fallback als de site niet reageert binnen 1 sec: gebruik initial data
        setTimeout(() => {
            if (!isLoaded) {
                console.warn('⚠️ Site sync timeout, falling back to initial values');
                const val = typeof initialValueData === 'object' ? (initialValueData.text || initialValueData.label || '') : initialValueData;
                setValue(val);
                if (typeof initialValueData === 'object') {
                    setTextStyles(prev => ({ ...prev, ...initialValueData }));
                }
                setIsLoaded(true);
            }
        }, 1000);
    }, 100);

    return () => {
      window.removeEventListener('message', handleSyncResponse);
      clearTimeout(timer);
    };
  }, [item.binding?.key, isLink, isMedia]);

  const handleSave = () => {
    let finalData;
    if (isLink) {
      finalData = {
        label: labelRef.current ? labelRef.current.value : linkData.label,
        url: urlRef.current ? urlRef.current.value : linkData.url
      };
    } else if (isMedia) {
      finalData = value;
    } else {
      // Check if we have any active styles
      const hasStyles = textStyles.color || textStyles.fontSize || textStyles.fontWeight !== 'normal' || 
                        textStyles.fontStyle !== 'normal' || textStyles.textAlign !== 'left' || 
                        textStyles.fontFamily || textStyles.shadowBlur > 0 || textStyles.shadowX !== 0 || textStyles.shadowY !== 0;

      if (hasStyles) {
        finalData = {
          text: value,
          ...textStyles
        };
      } else {
        finalData = value;
      }
    }
    onSave(finalData, {});
  };

  const getPreviewUrl = (filename) => {
    if (!filename) return '';
    if (filename.startsWith('http')) return filename;

    // Construct URL from selected site
    const baseUrl = selectedSite?.url || '';
    const cleanBase = baseUrl.replace(/\/$/, '');
    return `${cleanBase}/images/${filename}`.replace(/\/+/g, '/').replace('http:/', 'http://').replace('https:/', 'https://');
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Use the upload logic from DockFrame if available or a direct upload
    const formData = new FormData();
    formData.append('file', file);

    const baseUrl = selectedSite?.url || '';
    const cleanBase = baseUrl.replace(/\/$/, '');
    const uploadUrl = `${cleanBase}/__athena/upload`;

    try {
      const res = await fetch(uploadUrl, {
        method: 'POST',
        headers: { 'X-Filename': file.name },
        body: file
      });
      const data = await res.json();
      if (data.success) {
        setValue(data.filename);
        // Direct save for media usually feels better
        // onUpload(data.filename);
      }
    } catch (err) {
      console.error("Upload failed:", err);
      alert("Upload mislukt.");
    }
  };

  const fontOptions = [
    { label: 'Default', value: '' },
    { label: 'Sans Serif', value: 'ui-sans-serif, system-ui, sans-serif' },
    { label: 'Serif', value: 'ui-serif, Georgia, Cambria, serif' },
    { label: 'Mono', value: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace' },
    { label: 'Inter', value: '"Inter", sans-serif' },
    { label: 'Poppins', value: '"Poppins", sans-serif' },
    { label: 'Montserrat', value: '"Montserrat", sans-serif' },
    { label: 'Playfair', value: '"Playfair Display", serif' }
  ];

  const shadowString = `${textStyles.shadowX}px ${textStyles.shadowY}px ${textStyles.shadowBlur}px ${textStyles.shadowColor}`;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-md p-4">
      <div className="bg-white dark:bg-slate-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 dark:border-slate-700 animate-in zoom-in duration-150 max-h-[90vh] flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center shrink-0">
          <h3 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tighter">Text Editor v8.4.1</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600"><i className="fa-solid fa-xmark"></i></button>
        </div>

        <div className="p-8 space-y-6 overflow-y-auto">
          {isLink ? (
            <>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Button Label</label>
                <input
                  ref={labelRef}
                  type="text"
                  defaultValue={linkData.label}
                  className="w-full p-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-bold outline-none"
                />
              </div>
              <div className="space-y-2 relative">
                <label className="text-[10px] font-black uppercase text-slate-400">URL / Link Target</label>
                <input
                  ref={urlRef}
                  type="text"
                  defaultValue={linkData.url}
                  onFocus={requestSiteSync} // DIT IS DE KEY: Vraag bij klik!
                  className="w-full p-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono text-sm outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="#anchor or https://..."
                />
                <button
                  onClick={requestSiteSync}
                  className="absolute right-4 bottom-4 text-[10px] text-blue-500 font-bold hover:underline"
                >
                  <i className="fa-solid fa-rotate mr-1"></i> SYNC
                </button>
              </div>
              {allSites.length > 0 && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-2">
                  <label className="text-[10px] font-black uppercase text-blue-500">Quick Select</label>
                  <select
                    onChange={(e) => { if (urlRef.current) urlRef.current.value = e.target.value; }}
                    className="w-full p-3 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white text-xs outline-none"
                  >
                    <option value="" className="dark:bg-black">-- Kies een site --</option>
                    {allSites.filter(s => s.liveUrl).map(s => (
                      <option key={s.id} value={s.liveUrl} className="dark:bg-black">{s.name} ({s.liveUrl})</option>
                    ))}
                  </select>
                </div>
              )}
            </>
          ) : isMedia ? (
            <div className="space-y-4">
              <div className="aspect-video bg-slate-100 dark:bg-black rounded-2xl overflow-hidden border-2 border-slate-200 dark:border-slate-800 flex items-center justify-center group relative">
                {value ? (
                  <img src={getPreviewUrl(value)} alt="Preview" className="max-h-full object-contain" />
                ) : (
                  <div className="text-slate-400">Geen afbeelding</div>
                )}
                <label className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-white font-bold uppercase text-xs">
                  Upload Nieuw
                  <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                </label>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black uppercase text-slate-400">Bestandsnaam</label>
                <input
                  type="text"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-700 rounded-2xl text-slate-900 dark:text-white font-mono text-xs"
                />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-800 rounded-2xl">
                <div className="space-y-4">
                  <div className="flex flex-wrap gap-4">
                    {/* Color */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Color</label>
                      <input
                        type="color"
                        value={textStyles.color || '#000000'}
                        onChange={(e) => setTextStyles(prev => ({ ...prev, color: e.target.value }))}
                        className="w-10 h-10 rounded-lg cursor-pointer border border-slate-200 bg-transparent"
                      />
                    </div>

                    {/* Font Size */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Size (px)</label>
                      <input
                        type="number"
                        placeholder="Auto"
                        value={textStyles.fontSize}
                        onChange={(e) => setTextStyles(prev => ({ ...prev, fontSize: e.target.value }))}
                        className="w-20 p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold"
                      />
                    </div>

                    {/* Font Family */}
                    <div className="space-y-1 flex-1 min-w-[120px]">
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Font</label>
                      <select
                        value={textStyles.fontFamily}
                        onChange={(e) => setTextStyles(prev => ({ ...prev, fontFamily: e.target.value }))}
                        className="w-full p-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-bold outline-none"
                      >
                        {fontOptions.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    {/* Font Style / Weight */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Style</label>
                      <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        <button
                          onClick={() => setTextStyles(prev => ({ ...prev, fontWeight: prev.fontWeight === 'bold' ? 'normal' : 'bold' }))}
                          className={`p-2 text-xs w-10 h-10 ${textStyles.fontWeight === 'bold' ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          title="Bold"
                        >B</button>
                        <button
                          onClick={() => setTextStyles(prev => ({ ...prev, fontStyle: prev.fontStyle === 'italic' ? 'normal' : 'italic' }))}
                          className={`p-2 text-xs w-10 h-10 italic ${textStyles.fontStyle === 'italic' ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                          title="Italic"
                        >I</button>
                      </div>
                    </div>

                    {/* Alignment */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase text-slate-400 block">Align</label>
                      <div className="flex bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
                        {['left', 'center', 'right'].map(align => (
                          <button
                            key={align}
                            onClick={() => setTextStyles(prev => ({ ...prev, textAlign: align }))}
                            className={`p-2 text-xs w-10 h-10 ${textStyles.textAlign === align ? 'bg-blue-500 text-white' : 'hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            title={align.charAt(0).toUpperCase() + align.slice(1)}
                          >
                            <i className={`fa-solid fa-align-${align}`}></i>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 md:pt-0 md:border-l md:border-slate-200 md:dark:border-slate-800 md:pl-6">
                  <label className="text-[10px] font-black uppercase text-blue-500 block">Text Shadow</label>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400">X-Offset ({textStyles.shadowX}px)</label>
                      <input type="range" min="-20" max="20" value={textStyles.shadowX} onChange={(e) => setTextStyles(prev => ({ ...prev, shadowX: parseInt(e.target.value) }))} className="w-full accent-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400">Y-Offset ({textStyles.shadowY}px)</label>
                      <input type="range" min="-20" max="20" value={textStyles.shadowY} onChange={(e) => setTextStyles(prev => ({ ...prev, shadowY: parseInt(e.target.value) }))} className="w-full accent-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400">Blur ({textStyles.shadowBlur}px)</label>
                      <input type="range" min="0" max="30" value={textStyles.shadowBlur} onChange={(e) => setTextStyles(prev => ({ ...prev, shadowBlur: parseInt(e.target.value) }))} className="w-full accent-blue-500" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] uppercase text-slate-400">Shadow Color</label>
                      <div className="flex gap-2">
                        <input type="color" value={textStyles.shadowColor.startsWith('rgba') ? '#000000' : textStyles.shadowColor} onChange={(e) => setTextStyles(prev => ({ ...prev, shadowColor: e.target.value }))} className="w-8 h-8 rounded cursor-pointer border border-slate-200 bg-transparent" />
                        <button onClick={() => setTextStyles(prev => ({ ...prev, shadowColor: 'rgba(0,0,0,0.5)' }))} className="text-[8px] font-bold text-slate-400 hover:text-blue-500 underline uppercase">Reset</button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400">Content</label>
                <textarea
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full p-6 bg-slate-50 dark:bg-black border border-slate-200 dark:border-slate-700 rounded-2xl min-h-[150px] text-slate-900 dark:text-white resize-none outline-none focus:ring-2 focus:ring-blue-500"
                  style={{
                    color: textStyles.color,
                    fontSize: textStyles.fontSize ? `${textStyles.fontSize}px` : undefined,
                    fontWeight: textStyles.fontWeight,
                    fontStyle: textStyles.fontStyle,
                    textAlign: textStyles.textAlign,
                    fontFamily: textStyles.fontFamily,
                    textShadow: shadowString
                  }}
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-4 shrink-0">
          <button onClick={onCancel} className="px-6 py-3 text-slate-500 font-bold hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl">Cancel</button>
          <button onClick={handleSave} className="px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white font-black rounded-xl shadow-xl shadow-blue-500/20 active:scale-95 transition-all">SAVE CHANGES</button>
        </div>
      </div>
    </div>
  );
};

export default VisualEditor;
