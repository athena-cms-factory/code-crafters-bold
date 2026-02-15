import React, { useState, useEffect } from 'react';

const VisualEditor = ({ item, selectedSite, onSave, onCancel, onUpload }) => {
  const [value, setValue] = useState(item.currentValue || '');
  const [initialValue] = useState(item.currentValue || '');
  const [isLoaded, setIsLoaded] = useState(false);
  
  const dockType = item.dockType || 'text';
  const isLink = dockType === 'link';
  const isMedia = dockType === 'media' || (!isLink && (
                  item.binding?.key?.toLowerCase().includes('image') || 
                  item.binding?.key?.toLowerCase().includes('afbeelding') ||
                  item.binding?.key?.toLowerCase().includes('foto') ||
                  item.binding?.key?.toLowerCase().includes('video') ||
                  item.binding?.key?.toLowerCase().includes('logo')));

  const [linkData, setLinkData] = useState(isLink ? (typeof value === 'object' ? value : { label: value, url: '' }) : null);

  // Initialiseer formatting met de waarden van het geklikte element
  const [formatting, setFormatting] = useState({
    bold: false,
    italic: false,
    fontSize: '16px',
    textAlign: 'left',
    fontFamily: 'sans-serif',
    textShadow: false,
    ...(item.currentFormatting || {})
  });

  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const sendPreview = (val, format) => {
    const iframe = document.querySelector('iframe');
    if (iframe && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'DOCK_UPDATE_TEXT',
        file: item.binding.file,
        index: item.binding.index,
        key: item.binding.key,
        value: val,
        formatting: format
      }, '*');
    }
  };

  useEffect(() => {
    // Sla de allereerste preview over (on mount) om te voorkomen dat we 
    // de site overschrijven met defaults voordat de user iets doet.
    if (!isLoaded) {
        setIsLoaded(true);
        return;
    }
    sendPreview(isLink ? linkData : value, formatting);
  }, [value, formatting, linkData]);

  const handleCancel = () => {
    // Herstel de originele staat in het iframe
    sendPreview(initialValue, item.currentFormatting || {});
    onCancel();
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') handleCancel();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel, initialValue]);

  const isVideo = value?.endsWith?.('.mp4') || value?.endsWith?.('.webm') || value?.endsWith?.('.mov');

  useEffect(() => {
    setValue(item.currentValue || '');
    if (isLink) {
        setLinkData(typeof item.currentValue === 'object' ? item.currentValue : { label: item.currentValue, url: '' });
    }
    if (item.currentFormatting) {
        setFormatting(prev => ({
            ...prev,
            ...item.currentFormatting
        }));
    }
  }, [item]);

  const handleSave = () => {
    onSave(isLink ? linkData : value, formatting);
  };

  const toggleFormat = (key) => {
    setFormatting(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateFormat = (key, val) => {
    setFormatting(prev => ({ ...prev, [key]: val }));
  };

  const fonts = [
    { name: 'Default', value: 'inherit' },
    { name: 'Sans Serif', value: 'sans-serif' },
    { name: 'Serif', value: 'serif' },
    { name: 'Monospace', value: 'monospace' },
    { name: 'Inter', value: 'Inter' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Playfair Display', value: 'Playfair Display' },
    { name: 'Montserrat', value: 'Montserrat' }
  ];

  // Uitgebreide lijst met font-sizes
  const fontSizes = ['12px', '14px', '16px', '18px', '20px', '24px', '32px', '40px', '48px', '56px', '64px', '72px', '80px', '96px', '120px'];

  const getPreviewStyles = () => {
    const styles = {
        fontWeight: formatting.bold ? 'bold' : 'normal',
        fontStyle: formatting.italic ? 'italic' : 'normal',
        fontSize: formatting.fontSize,
        textAlign: formatting.textAlign,
        fontFamily: formatting.fontFamily === 'inherit' ? 'sans-serif' : formatting.fontFamily,
    };

    if (formatting.textShadow) {
        styles.textShadow = '2px 1px 1px rgba(0, 0, 0, 1)';
    }

    return styles;
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (!isMedia) return;
    const file = e.dataTransfer.files[0];
    if (file && (file.type.startsWith('image/') || file.type.startsWith('video/'))) {
      await uploadFile(file);
      return;
    }
    const url = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('url');
    if (url && (url.startsWith('http') || url.includes('/images/'))) {
      let finalValue = url;
      if (url.includes('/images/')) finalValue = url.split('/images/').pop().split('?')[0];
      setValue(finalValue);
    }
  };

  const uploadFile = async (file) => {
    setIsUploading(true);
    try {
      let baseUrl = selectedSite?.url || (typeof selectedSite === 'string' ? `http://localhost:4000/${selectedSite}/` : "http://localhost:4000/");
      const cleanBase = baseUrl.replace(/\/$/, '');
      const url = `${cleanBase}/__athena/upload`;
      const res = await fetch(url, { method: 'POST', headers: { 'x-filename': file.name }, body: file });
      if (!res.ok) throw new Error(`Server responded with ${res.status}`);
      const data = await res.json();
      if (data.success) setValue(data.filename);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    } finally { setIsUploading(false); }
  };

  const getPreviewUrl = (val) => {
    if (!val || val.startsWith('http') || val.startsWith('data:')) return val;
    let baseUrl = selectedSite?.url || (typeof selectedSite === 'string' ? `http://localhost:4000/${selectedSite}/` : "http://localhost:4000/");
    return `${baseUrl.replace(/\/$/, '')}/images/${val}`;
  };

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div 
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-200 p-6 border border-slate-200 dark:border-slate-700"
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            <i className={`fa-solid ${isMedia ? 'fa-photo-film' : (isLink ? 'fa-link' : 'fa-pen-to-square')} mr-2 text-accent`}></i>
            {isMedia ? 'Change Media' : (isLink ? 'Edit Link' : 'Edit Text')}
          </h3>
          <button onClick={handleCancel} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"><i className="fa-solid fa-xmark text-xl"></i></button>
        </div>

        <div className="mb-6">
          <label className="text-xs uppercase font-bold text-slate-400 mb-2 block">
            {item.binding.key} <span className="text-slate-300 font-normal">({item.binding.file})</span>
          </label>
          
          {isMedia ? (
            <div className="space-y-4">
              <div className={`aspect-video rounded-xl overflow-hidden flex flex-col items-center justify-center border-4 border-dashed transition-all duration-300 ${isDragging ? 'bg-blue-100 border-blue-500 scale-105' : 'bg-slate-100 dark:bg-slate-900 border-slate-300 dark:border-slate-700'}`}>
                {isUploading ? (
                    <div className="text-center"><i className="fa-solid fa-circle-notch fa-spin text-blue-500 text-3xl mb-2"></i><p className="text-sm font-bold text-slate-600">Uploading...</p></div>
                ) : (
                    <>
                        {isVideo ? <video src={getPreviewUrl(value)} className="w-full h-full object-contain" controls autoPlay muted loop /> : <img src={getPreviewUrl(value) || 'placeholder.jpg'} alt="Preview" className="max-h-[180px] max-w-full object-contain mb-2" />}
                        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mt-2">Drop Zone</p>
                    </>
                )}
              </div>
              <input type="text" value={value} onChange={(e) => setValue(e.target.value)} className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100" placeholder="Or paste a URL..." />
            </div>
          ) : isLink ? (
             <div className="space-y-4">
               <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">Label</label>
                  <input 
                    type="text" 
                    value={linkData.label} 
                    onChange={(e) => setLinkData(prev => ({ ...prev, label: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                    placeholder="Button Text..."
                    autoFocus
                  />
               </div>
               <div>
                  <label className="text-[10px] uppercase font-bold text-slate-400 mb-1 block">URL / Link Target</label>
                  <input 
                    type="text" 
                    value={linkData.url} 
                    onChange={(e) => setLinkData(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full p-3 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100"
                    placeholder="https://... or /contact"
                  />
               </div>
             </div>
          ) : (
             <div className="space-y-4">
               <div className="flex flex-wrap items-center gap-2 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg">
                 {/* Font Family */}
                 <select value={formatting.fontFamily} onChange={(e) => updateFormat('fontFamily', e.target.value)} className="text-xs p-1.5 bg-white dark:bg-slate-800 border border-slate-200 rounded text-slate-900 dark:text-white">
                    {fonts.map(f => <option key={f.value} value={f.value}>{f.name}</option>)}
                 </select>

                 {/* Fine-grained Font Size Selector */}
                 <div className="flex items-center bg-white dark:bg-slate-800 border border-slate-200 rounded overflow-hidden">
                    <input 
                        type="text" 
                        value={formatting.fontSize} 
                        onChange={(e) => updateFormat('fontSize', e.target.value)}
                        className="text-xs p-1.5 w-14 bg-transparent border-none focus:outline-none text-slate-900 dark:text-white"
                        placeholder="Size"
                    />
                    <select 
                        value={fontSizes.includes(formatting.fontSize) ? formatting.fontSize : ''} 
                        onChange={(e) => updateFormat('fontSize', e.target.value)} 
                        className="text-xs p-1.5 bg-transparent border-l border-slate-100 focus:outline-none w-8 text-slate-400"
                    >
                        <option value="">...</option>
                        {fontSizes.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                 </div>

                 <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                 <button onClick={() => toggleFormat('bold')} className={`p-1.5 rounded ${formatting.bold ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-300'}`} title="Maak de geselecteerde tekst dikgedrukt (Bold)."><i className="fa-solid fa-bold"></i></button>
                 <button onClick={() => toggleFormat('italic')} className={`p-1.5 rounded ${formatting.italic ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-300'}`} title="Maak de geselecteerde tekst schuingedrukt (Italic)."><i className="fa-solid fa-italic"></i></button>
                 <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                 
                 {/* Text Shadow Button */}
                 <button 
                    onClick={() => toggleFormat('textShadow')} 
                    className={`p-1.5 rounded ${formatting.textShadow ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/30' : 'text-slate-600 dark:text-slate-300'}`} 
                    title="Voeg een subtiele schaduw of contour toe aan de tekst voor betere leesbaarheid op drukke achtergronden."
                 >
                    <i className="fa-solid fa-circle-half-stroke"></i>
                 </button>

                 <div className="w-px h-4 bg-slate-200 dark:bg-slate-700"></div>
                 <button onClick={() => updateFormat('textAlign', 'left')} className={`p-1.5 rounded ${formatting.textAlign === 'left' ? 'bg-blue-100 text-blue-600' : ''}`} title="Lijn de tekst links uit."><i className="fa-solid fa-align-left"></i></button>
                 <button onClick={() => updateFormat('textAlign', 'center')} className={`p-1.5 rounded ${formatting.textAlign === 'center' ? 'bg-blue-100 text-blue-600' : ''}`} title="Lijn de tekst centraal uit."><i className="fa-solid fa-align-center"></i></button>
                 <button onClick={() => updateFormat('textAlign', 'right')} className={`p-1.5 rounded ${formatting.textAlign === 'right' ? 'bg-blue-100 text-blue-600' : ''}`} title="Lijn de tekst rechts uit."><i className="fa-solid fa-align-right"></i></button>
               </div>

               <textarea 
                 value={value}
                 onChange={(e) => setValue(e.target.value)}
                 className="w-full p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-accent focus:outline-none min-h-[150px] text-base leading-relaxed resize-none text-slate-900 dark:text-slate-100"
                 style={getPreviewStyles()}
                 autoFocus
                 title="Typ hier je nieuwe tekst. Je ziet de wijzigingen direct in de website preview op de achtergrond."
               />
             </div>
          )}
        </div>

        <div className="flex justify-end gap-3">
          <button onClick={handleCancel} className="px-4 py-2 text-slate-500 font-bold hover:bg-slate-100 rounded-lg" title="Sluit de editor zonder de wijzigingen op te slaan. Je wijzigingen gaan verloren.">Cancel</button>
          <button onClick={handleSave} disabled={isUploading} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg shadow-lg active:scale-95" title="Sla je wijzigingen op. De nieuwe tekst of afbeelding wordt direct verwerkt in de website bestanden.">Save</button>
        </div>
      </div>
    </div>
  );
};

export default VisualEditor;
