import React, { useState, useEffect, useRef } from 'react';
import SiteSelector from './SiteSelector';
import DesignControls from './DesignControls';
import VisualEditor from './VisualEditor';
import PullModal from './PullModal';
import SyncModal from './SyncModal';

const DockFrame = () => {
  const [selectedSite, setSelectedSite] = useState('');
  const [siteStructure, setSiteStructure] = useState(null);
  const [pages, setPages] = useState([]);
  const [currentPath, setCurrentPath] = useState('/');
  const [isConnected, setIsConnected] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showPullModal, setShowPullModal] = useState(false);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef(null);

  // Sidebar Resizing State
  const [leftWidth, setLeftWidth] = useState(260);
  const [rightWidth, setRightWidth] = useState(260);
  const isResizingLeft = useRef(false);
  const isResizingRight = useRef(false);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (isResizingLeft.current) {
        const newWidth = Math.min(Math.max(180, e.clientX), 450);
        setLeftWidth(newWidth);
      }
      if (isResizingRight.current) {
        const newWidth = Math.min(Math.max(180, window.innerWidth - e.clientX), 450);
        setRightWidth(newWidth);
      }
    };

    const handleMouseUp = () => {
      isResizingLeft.current = false;
      isResizingRight.current = false;
      document.body.classList.remove('select-none');
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Undo/Redo State
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const pushToHistory = (file, index, key, oldValue, newValue, actionType = 'update') => {
    const newEntry = { file, index, key, oldValue, newValue, actionType };
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newEntry);

    // Limit history to 20 items to save RAM
    const finalHistory = newHistory.length > 20 ? newHistory.slice(-20) : newHistory;
    setHistory(finalHistory);
    setHistoryIndex(finalHistory.length - 1);
    console.log("📜 History added:", newEntry);
  };

  const undo = async () => {
    if (historyIndex < 0) return;
    const entry = history[historyIndex];
    console.log("⏪ Undoing:", entry.actionType, entry);

    if (entry.actionType === 'delete') {
      // Undo a delete = Restore the item
      await saveData(entry.file, entry.index, null, entry.oldValue, null, true, 'restore');
    } else if (entry.actionType === 'add') {
      // Undo an add = Delete the item
      await saveData(entry.file, entry.index, null, null, null, true, 'delete');
    } else {
      // Standard update
      await saveData(entry.file, entry.index, entry.key, entry.oldValue, null, true);
    }

    setHistoryIndex(prev => prev - 1);
    setTimeout(forceRefresh, 100);
  };

  const redo = async () => {
    if (historyIndex >= history.length - 1) return;
    const nextIndex = historyIndex + 1;
    const entry = history[nextIndex];
    console.log("⏩ Redoing:", entry.actionType, entry);

    if (entry.actionType === 'delete') {
      await saveData(entry.file, entry.index, null, null, null, true, 'delete');
    } else if (entry.actionType === 'add') {
      await saveData(entry.file, entry.index, null, null, null, true, 'add');
    } else {
      await saveData(entry.file, entry.index, entry.key, entry.newValue, null, true);
    }

    setHistoryIndex(nextIndex);
    setTimeout(forceRefresh, 100);
  };

  // Helper voor API URL
  const getSiteApiUrl = () => {
    if (!selectedSite) return null;
    // Support both object (new) and string (legacy) formats
    const baseUrl = selectedSite.url || (typeof selectedSite === 'string' ? `http://localhost:5000/${selectedSite}/` : '');
    if (!baseUrl) return null;

    const cleanBase = baseUrl.replace(/\/$/, '');
    return `${cleanBase}/__athena/update-json`;
  };

  // Laden van MPA manifest indien beschikbaar
  useEffect(() => {
    if (!selectedSite) {
      setPages([]);
      return;
    }

    const baseUrl = selectedSite.url || (typeof selectedSite === 'string' ? `http://localhost:5000/${selectedSite}/` : '');
    const cleanBase = baseUrl.replace(/\/$/, '');
    const manifestUrl = `${cleanBase}/data/pages-manifest.json`;

    fetch(manifestUrl)
      .then(res => res.json())
      .then(data => {
        console.log("📄 Pages loaded:", data.length);
        setPages(data);
      })
      .catch(err => {
        console.debug("ℹ️ No multi-page manifest found for this site (SPA mode)");
        setPages([]);
      });
  }, [selectedSite]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (historyIndex >= 0) {
          e.preventDefault();
          undo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        if (historyIndex < history.length - 1) {
          e.preventDefault();
          redo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyIndex, history]);

  // Listen for messages from the docked site
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'SITE_READY') {
        console.debug('✅ Site connected to Dock:', event.data);
        setSiteStructure(event.data.structure);

        // Normalize path: ensure it starts with / and remove trailing slashes
        let path = event.data.structure.currentPath || '/';
        if (!path.startsWith('/')) path = '/' + path;
        if (path.length > 1 && path.endsWith('/')) path = path.slice(0, -1);

        setCurrentPath(path);
        setIsConnected(true);

        // We verwijderen de automatische resync die kleuren overschrijft
        // setTimeout(() => {
        //    window.dispatchEvent(new CustomEvent('athena-resync-colors'));
        // }, 500);
      } else if (event.data?.type === 'DOCK_TRIGGER_REFRESH') {
        forceRefresh();
      }

      if (event.data.type === 'SITE_CLICK') {
        setEditingItem(event.data);
      }

      if (event.data.type === 'SITE_SAVE') {
        const { binding, value } = event.data;
        saveData(binding.file, binding.index, binding.key, value);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [selectedSite]);

  const handleNavigate = (path) => {
    if (iframeRef.current) {
      // Normalize path
      let cleanPath = path.startsWith('/') ? path : '/' + path;

      console.log("✈️ Sending navigate command:", cleanPath);
      iframeRef.current.contentWindow.postMessage({
        type: 'ATHENA_NAVIGATE',
        payload: { path: cleanPath }
      }, '*');
      setCurrentPath(cleanPath);
    }
  };

  const forceRefresh = () => {
    console.log("🔄 Forcing iframe refresh via Key Update...");
    setIsConnected(false);
    setRefreshKey(prev => prev + 1);
  };

  // Send color update to site
  const updateColor = (key, value, shouldSave = true) => {
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage({
        type: 'DOCK_UPDATE_COLOR',
        key,
        value
      }, '*');

      if (shouldSave) {
        let file = 'site_settings';
        if (key.startsWith('header_') || key === 'content_top_offset') file = 'header_settings';
        else if (key.startsWith('hero_') || key === 'title') file = 'hero';

        const oldValue = siteStructure?.data?.[file]?.[key] || siteStructure?.data?.site_settings?.[key];
        pushToHistory(file, 0, key, oldValue, value);
        saveData(file, 0, key, value);
      }
    }
  };

  // Save changes via API
  const saveData = async (file, index, key, value, formatting = null, silent = false, action = null) => {
    try {
      const url = getSiteApiUrl();
      if (!url) return;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file, index, key, value, formatting, action })
      });
      if (!res.ok) throw new Error(`Server returned ${res.status}`);
      if (!silent) console.log('✅ Saved:', file, key, value, formatting ? '(with styles)' : '', action ? `(Action: ${action})` : '');
    } catch (err) {
      console.error('❌ Save failed:', err);
    }
  };

  const handleEditorSave = async (newValue, newFormatting = null) => {
    if (!editingItem) return;

    const { file, index, key } = editingItem.binding;

    // Capture old value for history
    const oldValue = (siteStructure?.data?.[file] && Array.isArray(siteStructure.data[file]))
      ? siteStructure.data[file][index]?.[key]
      : siteStructure?.data?.[file]?.[key];

    pushToHistory(file, index, key, oldValue, newValue);

    // 1. Optimistic update in iframe
    if (iframeRef.current) {
      iframeRef.current.contentWindow.postMessage({
        type: 'DOCK_UPDATE_TEXT',
        file,
        index,
        key,
        value: newValue,
        formatting: newFormatting
      }, '*');
    }

    // 2. Optimistic update in Sidebar (Local State)
    setSiteStructure(prev => {
      if (!prev) return prev;
      const newData = { ...prev.data };
      // Zorg dat we niet crashen als de structuur onverwacht anders is
      if (newData[file] && newData[file][index]) {
        // Maak een kopie van het item en update de specifieke key
        const updatedItems = [...newData[file]];
        updatedItems[index] = { ...updatedItems[index], [key]: newValue };
        newData[file] = updatedItems;
      }
      return { ...prev, data: newData };
    });

    // 3. Persist
    console.log("💾 Saving data to server...");
    await saveData(file, index, key, newValue, newFormatting);

    // 4. Force reload after a short delay to ensure filesystem is synced
    // We verhogen dit naar 2000ms voor meer stabiliteit op Chromebooks
    // De timestamp in de URL zorgt dat we de nieuwste data krijgen
    console.log("⏳ Waiting for filesystem sync before reload...");
    setTimeout(() => {
      forceRefresh();
      setEditingItem(null);
    }, 2000);
  };

  // Send section move command
  const moveSection = (section, direction) => {
    console.log(`🚀 Triggering move: ${section} -> ${direction}`);
    saveSectionMove(section, direction);
  };

  const toggleSectionVisibility = (sectionId) => {
    console.log(`👁️ Toggling visibility for: ${sectionId}`);
    const sectionIndex = siteStructure?.data?.section_settings?.findIndex(s => s.id === sectionId);
    if (sectionIndex === -1 || sectionIndex === undefined) {
      console.warn(`⚠️ Cannot find section index for ${sectionId} in section_settings`);
      return;
    }
    const currentVisible = siteStructure.data.section_settings[sectionIndex].visible !== false;
    saveData('section_settings', sectionIndex, 'visible', !currentVisible);
    
    // Refresh to show/hide in iframe
    setTimeout(() => forceRefresh(), 500);
  };

  const saveSectionMove = async (key, direction) => {
    try {
      const url = getSiteApiUrl();
      if (!url) return;
      const currentOrder = siteStructure?.sections?.map(s => s.toLowerCase()) || [];

      console.log(`↔️ Moving section via ${url}:`, key, direction, "Current order:", currentOrder);

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reorder-sections',
          key,
          direction,
          value: currentOrder
        })
      });

      if (response.ok) {
        console.log('✅ Move successful, refreshing iframe...');
        setTimeout(forceRefresh, 300);
      } else {
        console.error('❌ Move failed on server:', response.status);
      }
    } catch (err) { console.error('❌ Network error during move:', err); }
  };

  const updateLayout = async (section, layout) => {
    try {
      const url = getSiteApiUrl();
      if (!url) return;
      console.log(`📐 Updating layout for ${section} to ${layout} via ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: 'layout_settings', index: 0, key: section, value: layout })
      });
      if (response.ok) {
        console.log('✅ Layout update successful');
        setTimeout(forceRefresh, 300);
      } else {
        console.error('❌ Layout update failed');
      }
    } catch (err) { console.error('❌ Network error during layout update:', err); }
  };

  const addItem = async (tableName) => {
    try {
      const url = getSiteApiUrl();
      if (!url) return;
      console.log(`➕ Adding item to ${tableName} via ${url}`);

      const index = siteStructure?.data?.[tableName]?.length || 0;
      pushToHistory(tableName, index, null, null, null, 'add');

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: tableName.toLowerCase(), action: 'add' })
      });
      if (res.ok) setTimeout(forceRefresh, 300);
    } catch (err) { console.error(err); }
  };

  const syncToSheets = async () => {
    if (!selectedSite) return;

    // GOVERNANCE CHECK
    if (selectedSite.governance_mode === 'client-mode') {
      alert("🔒 CLIENT MODE ACTIVE\n\nPush to Sheet is disabled because content is managed by the client.\nPlease use the Google Sheet to update content.");
      return;
    }

    setShowSyncModal(true);
  };

  const handleSyncConfirm = async () => {
    setShowSyncModal(false);
    const siteId = typeof selectedSite === 'string' ? selectedSite : (selectedSite.id || selectedSite.name);

    // UI Feedback
    const btn = document.getElementById('cloud-sync-btn');
    const originalContent = btn ? btn.innerHTML : 'Sync to Google Sheets';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Syncing...';
    }

    try {
      const dashboardPort = import.meta.env.VITE_DASHBOARD_PORT || '5001';
      const hostname = window.location.hostname;
      const res = await fetch(`http://${hostname}:${dashboardPort}/api/sync-to-sheets/${siteId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Succesvol gesynchroniseerd naar Google Sheets!\n\nVergeet niet de site te verversen om de wijzigingen te zien.");
      } else {
        alert("❌ Sync mislukt: " + data.error + "\n\nTip: Controleer of de Sheet is 'Gepubliceerd op internet'.");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Netwerkfout tijdens sync. Is de dashboard server (poort 4001) actief?");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    }
  };

  const pullFromSheets = async () => {
    if (!selectedSite) return;
    setShowPullModal(true);
  };

  const handlePullConfirm = async () => {
    setShowPullModal(false);
    const siteId = typeof selectedSite === 'string' ? selectedSite : (selectedSite.id || selectedSite.name);

    // UI Feedback
    const btn = document.getElementById('cloud-pull-btn');
    const originalContent = btn ? btn.innerHTML : 'Pull from Google Sheets';
    if (btn) {
      btn.disabled = true;
      btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin mr-1"></i> Pulling...';
    }

    try {
      const dashboardPort = import.meta.env.VITE_DASHBOARD_PORT || '5001';
      const hostname = window.location.hostname;
      const res = await fetch(`http://${hostname}:${dashboardPort}/api/pull-from-sheets/${siteId}`, {
        method: 'POST'
      });
      const data = await res.json();
      if (data.success) {
        alert("✅ Data successfully pulled from Google Sheets! (Backup created in site folder)");
        forceRefresh();
      } else {
        alert("❌ Pull failed: " + data.error);
      }
    } catch (err) {
      console.error(err);
      alert("❌ Network error during pull.");
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalContent;
      }
    }
  };

  const deleteItem = async (tableName, index) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;
    try {
      const url = getSiteApiUrl();
      if (!url) return;
      console.log(`🗑️ Deleting item ${index} from ${tableName} via ${url}`);

      const deletedItem = siteStructure?.data?.[tableName]?.[index];
      pushToHistory(tableName.toLowerCase(), index, null, deletedItem, null, 'delete');

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ file: tableName.toLowerCase(), action: 'delete', index })
      });
      if (res.ok) setTimeout(forceRefresh, 300);
    } catch (err) { console.error(err); }
  };

  const updateFieldConfig = async (tableName, config) => {
    try {
      const url = getSiteApiUrl();
      if (!url) return;
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update-section-config',
          section: tableName,
          config
        })
      });
      if (res.ok) setTimeout(forceRefresh, 300);
    } catch (err) { console.error(err); }
  };

  const moveField = (tableName, field, direction) => {
    const data = siteStructure?.data || {};
    const displayConfig = data.display_config || { sections: {} };
    const sectionConfig = displayConfig.sections?.[tableName] || { visible_fields: [], hidden_fields: [] };

    let fields = [...(sectionConfig.visible_fields || [])];

    // Als de lijst leeg is, vul hem dan eerst met alle beschikbare velden van het eerste item
    if (fields.length === 0) {
      const sample = data[tableName]?.[0] || {};
      const technicalFields = ['absoluteIndex', '_hidden', 'id', 'pk', 'uuid'];
      Object.keys(sample).forEach(k => {
        if (!technicalFields.some(tf => k.toLowerCase().includes(tf)) && !k.toLowerCase().includes('foto') && !k.toLowerCase().includes('image')) {
          fields.push(k);
        }
      });
    }

    const idx = fields.indexOf(field);
    if (idx === -1) return;

    const newIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (newIdx >= 0 && newIdx < fields.length) {
      const temp = fields[idx];
      fields[idx] = fields[newIdx];
      fields[newIdx] = temp;
      updateFieldConfig(tableName, { ...sectionConfig, visible_fields: fields });
    }
  };

  const toggleFieldVisibility = (tableName, field) => {
    const data = siteStructure?.data || {};
    const displayConfig = data.display_config || { sections: {} };
    const sectionConfig = displayConfig.sections?.[tableName] || { visible_fields: [], hidden_fields: [] };

    let visible = Array.isArray(sectionConfig.visible_fields) ? [...sectionConfig.visible_fields] : [];
    let hidden = Array.isArray(sectionConfig.hidden_fields) ? [...sectionConfig.hidden_fields] : [];

    if (visible.includes(field)) {
      visible = visible.filter(f => f !== field);
      hidden.push(field);
    } else if (hidden.includes(field)) {
      hidden = hidden.filter(f => f !== field);
    } else {
      // Standaard gedrag: als het nergens staat, is het zichtbaar. Dus we zetten het in hidden om het te verbergen.
      hidden.push(field);
    }

    updateFieldConfig(tableName, {
      visible_fields: visible,
      hidden_fields: hidden
    });
  };

  const handleDeploy = async () => {
    if (!selectedSite) return;
    const url = getSiteApiUrl();
    if (!url) return;

    if (!confirm(`Wil je ${selectedSite.name} nu deployen naar GitHub?\n\nDit kan even duren (aanmaken repo + pushen).`)) return;

    setIsConnected(false); // Toon even als "bezig"
    try {
      console.log(`🚀 Deploying site via ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'deploy-to-github' })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Deployment succesvol!\n\nRepo: ${result.repoUrl}\nLive: ${result.liveUrl}\n\nDe site wordt nu gebouwd door GitHub Actions.`);
        window.location.reload();
      } else {
        alert(`❌ Deployment mislukt: ${result.error}`);
      }
    } catch (err) {
      console.error('❌ Network error during deploy:', err);
      alert('❌ Fout bij verbinden met de site server.');
    } finally {
      setIsConnected(true);
    }
  };

  const handlePush = async () => {
    if (!selectedSite) return;
    const url = getSiteApiUrl();
    if (!url) return;

    const commitMsg = prompt("Voer een commit bericht in voor je wijzigingen:", "Update via Athena Dock");
    if (commitMsg === null) return; // Gebruiker annuleerde

    setIsConnected(false);
    try {
      console.log(`📤 Pushing updates for ${selectedSite.id} via ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deploy-to-github',
          commitMsg: commitMsg || "Update via Athena Dock"
        })
      });

      const result = await response.json();
      if (result.success) {
        alert(`✅ Wijzigingen gepusht naar GitHub!`);
        // Geen reload nodig bij een simpele push
      } else {
        alert(`❌ Push mislukt: ${result.error}`);
      }
    } catch (err) {
      console.error('❌ Network error during push:', err);
      alert('❌ Fout bij verbinden met de site server.');
    } finally {
      setIsConnected(true);
    }
  };

  // Vite preview server verwacht de projectnaam als base path
  const siteUrl = selectedSite?.url ? `${selectedSite.url}${selectedSite.url.includes('?') ? '&' : '?'}t=${refreshKey}` : null;

  return (
    <div className="dock-container h-screen flex flex-col bg-slate-100">
      {/* ... header remains same ... */}
      <header className="bg-slate-900 text-white p-4 flex items-center justify-between shadow-lg z-50">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-bold">⚓ Athena Dock</h1>
          <SiteSelector
            selectedSite={selectedSite}
            onSelectSite={setSelectedSite}
          />
        </div>

        <div className="flex items-center gap-4">
          <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700">
            <button
              onClick={undo}
              disabled={historyIndex < 0}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-all ${historyIndex < 0 ? 'text-slate-600 cursor-not-allowed' : 'text-white hover:bg-slate-700'}`}
              title="Maak de laatste actie ongedaan. Gebruik dit als je per ongeluk iets hebt gewijzigd of verwijderd (Sneltoets: Ctrl+Z)."
            >
              <i className="fa-solid fa-rotate-left"></i> Undo
            </button>
            <div className="w-px h-4 bg-slate-700 mx-1 self-center"></div>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className={`px-3 py-1 rounded text-xs flex items-center gap-1 transition-all ${historyIndex >= history.length - 1 ? 'text-slate-600 cursor-not-allowed' : 'text-white hover:bg-slate-700'}`}
              title="Voer de actie die je zojuist ongedaan hebt gemaakt opnieuw uit (Sneltoets: Ctrl+Y)."
            >
              Redo <i className="fa-solid fa-rotate-right"></i>
            </button>
          </div>

          <button
            onClick={forceRefresh}
            className="px-3 py-1 bg-slate-700 hover:bg-slate-600 text-xs text-white rounded shadow border border-slate-600"
            title="Herlaad de website-weergave in het midden van het scherm. Gebruik dit als wijzigingen niet direct zichtbaar zijn."
          >
            ⟳ Refresh Preview
          </button>

          {selectedSite && (
            <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 gap-1">
              <a
                href={siteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-[10px] text-white rounded font-bold flex items-center gap-1 transition-all"
                title="Open de lokale werkversie van deze website in een nieuw browsertabblad."
              >
                <i className="fa-solid fa-laptop-code"></i> Preview
              </a>

              {selectedSite.liveUrl && (
                <a
                  href={selectedSite.liveUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1 bg-green-600 hover:bg-green-500 text-[10px] text-white rounded font-bold flex items-center gap-1 transition-all"
                  title="Open de live productie website die voor iedereen op internet zichtbaar is."
                >
                  <i className="fa-solid fa-globe"></i> Live
                </a>
              )}

              {selectedSite.repoUrl ? (
                <>
                  <button
                    onClick={handlePush}
                    className="px-3 py-1 bg-violet-600 hover:bg-violet-500 text-[10px] text-white rounded font-bold flex items-center gap-1 transition-all"
                    title="Verstuur je wijzigingen naar GitHub om de live website bij te werken. De website wordt daarna automatisch opnieuw opgebouwd."
                  >
                    <i className="fa-solid fa-code-commit"></i> Push to GitHub
                  </button>
                  <a
                    href={selectedSite.repoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3 py-1 bg-slate-600 hover:bg-slate-500 text-[10px] text-white rounded font-bold flex items-center gap-1 transition-all"
                    title="Bekijk de technische broncode van dit project op GitHub."
                  >
                    <i className="fa-brands fa-github"></i> GitHub
                  </a>
                </>
              ) : (
                <button
                  onClick={handleDeploy}
                  className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-[10px] text-white rounded font-bold flex items-center gap-1 transition-all"
                  title="Maak een nieuwe plek op internet (GitHub repository) aan voor deze website en publiceer hem voor de eerste keer."
                >
                  <i className="fa-solid fa-cloud-arrow-up"></i> Deploy to GitHub
                </button>
              )}
            </div>
          )}

          {isConnected ? (
            <span className="flex items-center gap-2 text-green-400" title="De Dock is verbonden met de website en klaar voor bewerkingen.">
              <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
              Connected
            </span>
          ) : (
            <span className="flex items-center gap-2 text-amber-400" title="De Dock probeert verbinding te maken met de website server...">
              <span className="w-2 h-2 bg-amber-400 rounded-full"></span>
              Connecting...
            </span>
          )}
        </div>
      </header>

      {/* Main Dock Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar - Design Controls */}
        <aside 
          style={{ width: `${leftWidth}px` }}
          className="bg-white border-r border-slate-200 overflow-y-auto relative flex-shrink-0"
        >
          <DesignControls
            onColorChange={updateColor}
            siteStructure={siteStructure}
          />
          {/* Left Resizer */}
          <div 
            onMouseDown={() => { isResizingLeft.current = true; document.body.classList.add('select-none'); }}
            className="absolute right-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors z-50"
            title="Sleep naar links of rechts om het zijpaneel groter of kleiner te maken."
          />
        </aside>

        {/* Center - Site Preview in Iframe */}
        <main className="flex-1 bg-slate-200 p-4 lg:p-8 flex items-center justify-center relative min-w-0">
          <div className="h-full w-full bg-white rounded-lg shadow-2xl overflow-hidden relative" title="Interactieve weergave van je website. Klik op tekst of afbeeldingen om ze aan te passen.">
            <iframe
              key={refreshKey}
              ref={iframeRef}
              src={siteUrl}
              className="w-full h-full border-0"
              title="Site Preview"
              onLoad={() => setIsConnected(false)}
            />
          </div>

          {editingItem && (
            <VisualEditor
              key={`${editingItem.binding?.file || 'file'}-${editingItem.binding?.key || 'key'}-${editingItem.binding?.index || 0}`}
              item={editingItem}
              selectedSite={selectedSite}
              onSave={handleEditorSave}
              onCancel={() => setEditingItem(null)}
              onUpload={(filename) => handleEditorSave(filename)}
            />
          )}

          {showPullModal && (
            <PullModal
              onConfirm={handlePullConfirm}
              onCancel={() => setShowPullModal(false)}
            />
          )}

          {showSyncModal && (
            <SyncModal
              onConfirm={handleSyncConfirm}
              onCancel={() => setShowSyncModal(false)}
            />
          )}
        </main>

        {/* Right Sidebar - Section Tools */}
        <aside 
          style={{ width: `${rightWidth}px` }}
          className="bg-white border-l border-slate-200 overflow-y-auto relative flex-shrink-0"
        >
          {/* Right Resizer */}
          <div 
            onMouseDown={() => { isResizingRight.current = true; document.body.classList.add('select-none'); }}
            className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-blue-400 transition-colors z-50"
            title="Sleep naar links of rechts om het zijpaneel groter of kleiner te maken."
          />
          
          <div className="p-4">
            {/* Cloud Sync (v6.8) */}
            <div className="mb-6 pb-6 border-b border-slate-100 space-y-2">
            {selectedSite?.governance_mode === 'client-mode' ? (
              <button
                disabled
                className="w-full py-3 bg-slate-300 text-slate-500 font-bold rounded-xl shadow-inner cursor-not-allowed flex items-center justify-center gap-2"
                title="Sincronisatie is geblokkeerd omdat de klant de inhoud beheert via Google Sheets. Pas de data direct in de Sheet aan."
              >
                <i className="fa-solid fa-lock"></i>
                Push Locked (Client Mode)
              </button>
            ) : (
              <button
                id="cloud-sync-btn"
                onClick={syncToSheets}
                className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all flex items-center justify-center gap-2"
                title="Sla je lokale Dock-wijzigingen op in de cloud (Google Sheets). Hiermee worden je aanpassingen definitief en gedeeld."
              >
                <i className="fa-solid fa-cloud-arrow-up"></i>
                Sync to Google Sheets
              </button>
            )}

            <button
              id="cloud-pull-btn"
              onClick={pullFromSheets}
              className="w-full py-2 bg-white hover:bg-slate-50 text-slate-600 font-bold rounded-xl border border-slate-200 shadow-sm transition-all flex items-center justify-center gap-2 text-xs"
              title="Haal de nieuwste gegevens op uit Google Sheets. Let op: dit overschrijft je huidige lokale Dock-wijzigingen!"
            >
              <i className="fa-solid fa-cloud-arrow-down text-blue-500"></i>
              Pull from Google Sheets
            </button>

            <p className="text-[10px] text-slate-400 mt-2 text-center italic">
              Sync stuurt Dock-wijzigingen naar de cloud. Pull haalt cloud-updates op.
            </p>
          </div>

          {/* Page Switcher (v6.6 MPA) */}
          {pages.length > 0 && (
            <div className="mb-8 pb-6 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800 mb-4 flex items-center gap-2" title="Lijst van alle beschikbare pagina's op deze website. Klik op een pagina om deze te bekijken en te bewerken.">
                <i className="fa-solid fa-file-lines text-blue-500"></i> Pages
              </h3>
              <div className="space-y-1 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {pages.map(page => {
                  const path = page.path === '/home' ? '/' : page.path;
                  const isActive = currentPath === path;
                  return (
                    <button
                      key={page.path}
                      onClick={() => handleNavigate(path)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-all flex items-center justify-between group ${isActive
                          ? 'bg-blue-600 text-white font-bold shadow-md'
                          : 'hover:bg-slate-50 text-slate-600'
                        }`}
                      title={`Navigeer naar de ${page.title} pagina.`}
                    >
                      <span className="truncate capitalize">{page.title}</span>
                      {isActive && <span className="w-1.5 h-1.5 bg-white rounded-full"></span>}
                      {!isActive && <span className="text-[9px] text-slate-300 group-hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity italic">view</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-lg text-slate-800">Section Tools</h3>
            <button
              onClick={() => forceRefresh()}
              className="text-[10px] bg-slate-100 hover:bg-slate-200 p-1 rounded uppercase font-bold text-slate-500"
              title="Scan de website opnieuw om nieuwe of gewijzigde secties te detecteren."
            >
              Scan
            </button>
          </div>
          {siteStructure?.sections?.length > 0 ? (
            siteStructure.sections.map(section => (
              <div key={section} className="mb-6 p-4 bg-slate-50 border border-slate-200 rounded-xl shadow-sm" title={`Beheersectie voor de '${section}' op je pagina.`}>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-bold text-slate-800 capitalize truncate" title={`Sectie: ${section}`}>
                    {section === 'hero' ? 'Hero Settings' : 
                     section === 'header_settings' ? 'Header Settings' : 
                     section === 'site_settings' ? 'Site Settings' : section}
                  </span>
                  <div className="flex gap-1 items-center">
                    <button
                      onClick={() => toggleSectionVisibility(section)}
                      className={`p-1 rounded mr-1 ${siteStructure?.data?.section_settings?.find(s => s.id === section)?.visible === false ? 'text-slate-300 bg-slate-100 hover:bg-slate-200' : 'text-blue-500 bg-blue-50 hover:bg-blue-100'}`}
                      title={siteStructure?.data?.section_settings?.find(s => s.id === section)?.visible === false ? "Sectie is verborgen op de site. Klik om te tonen." : "Sectie is zichtbaar op de site. Klik om te verbergen."}
                    >
                      {siteStructure?.data?.section_settings?.find(s => s.id === section)?.visible === false ? (
                        <i className="fa-solid fa-eye-slash text-[10px]"></i>
                      ) : (
                        <i className="fa-solid fa-eye text-[10px]"></i>
                      )}
                    </button>
                    <div className="flex gap-1">
                    <button
                      onClick={() => moveSection(section, 'up')}
                      className="p-1 hover:bg-slate-200 text-slate-500 rounded"
                      title="Verplaats deze sectie één plek omhoog op de pagina."
                    >
                      ↑
                    </button>
                    <button
                      onClick={() => moveSection(section, 'down')}
                      className="p-1 hover:bg-slate-200 text-slate-500 rounded"
                      title="Verplaats deze sectie één plek omlaag op de pagina."
                    >
                      ↓
                    </button>
                  </div>
                </div>
              </div>

                <div className="space-y-4">
                  {/* Layout Selector */}
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Layout</label>
                      <select
                        className="w-full text-xs p-2 bg-white border border-slate-200 rounded-lg text-slate-600 focus:outline-none focus:border-blue-400"
                        onChange={(e) => updateLayout(section, e.target.value)}
                        value={siteStructure?.layouts?.[section] || 'grid'}
                        title="Kies de visuele indeling voor deze sectie (bijv. Raster, Lijst of Z-Patroon)."
                      >
                        <option value="grid">Grid (Raster)</option>
                        <option value="list">List (Lijst)</option>
                        <option value="z-pattern">Z-Pattern (Z-Vorm)</option>
                        <option value="focus">Focus (Eén groot item)</option>
                      </select>
                    </div>
                    <div className="w-24">
                      <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Padding (y)</label>
                      <input 
                        type="range" 
                        min="0" 
                        max="80" 
                        step="4"
                        className="w-full accent-blue-500"
                        value={siteStructure?.data?.section_settings?.find(s => s.id === section)?.padding || 32}
                        onChange={(e) => {
                          const idx = siteStructure?.data?.section_settings?.findIndex(s => s.id === section);
                          if (idx !== -1) {
                            saveData('section_settings', idx, 'padding', parseInt(e.target.value));
                            // Refresh content to show new padding
                            setTimeout(() => forceRefresh(), 100);
                          }
                        }}
                      />
                    </div>
                  </div>

                  {/* Field Management (NEW) */}
                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Field Management</label>
                    <div className="space-y-1 bg-white p-2 rounded-lg border border-slate-100 max-h-40 overflow-y-auto">
                      {(siteStructure?.data?.[section]?.[0] ? Object.keys(siteStructure.data[section][0]) : [])
                        .filter(k => !['absoluteIndex', '_hidden', 'id', 'pk', 'uuid'].some(tf => k.toLowerCase().includes(tf)))
                        .filter(k => !k.toLowerCase().includes('foto') && !k.toLowerCase().includes('image'))
                        .sort((a, b) => {
                          const order = siteStructure?.data?.display_config?.sections?.[section]?.visible_fields || [];
                          const idxA = order.indexOf(a);
                          const idxB = order.indexOf(b);
                          if (idxA === -1 && idxB === -1) return 0;
                          if (idxA === -1) return 1;
                          if (idxB === -1) return -1;
                          return idxA - idxB;
                        })
                        .map(field => {
                          const displayConfig = siteStructure?.data?.display_config || { sections: {} };
                          const config = displayConfig.sections?.[section] || { visible_fields: [], hidden_fields: [] };

                          const isHidden = Array.isArray(config.hidden_fields) && config.hidden_fields.includes(field);
                          const isVisible = !isHidden;

                          return (
                            <div key={field} className="flex items-center justify-between text-[10px] p-1.5 bg-white mb-1 rounded border border-slate-100 shadow-sm" title={`Veld: ${field}`}>
                              <span className={`truncate flex-1 ${isVisible ? 'text-slate-700 font-bold' : 'text-slate-300 italic line-through'}`}>{field}</span>
                              <div className="flex gap-1">
                                <button
                                  onClick={() => { console.log('↑ Clicked', field); moveField(section, field, 'up'); }}
                                  className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-all cursor-pointer"
                                  title="Verplaats dit veld omhoog in de weergave."
                                >
                                  <i className="fa-solid fa-chevron-up text-[8px]"></i>
                                </button>
                                <button
                                  onClick={() => { console.log('↓ Clicked', field); moveField(section, field, 'down'); }}
                                  className="p-1.5 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded transition-all cursor-pointer"
                                  title="Verplaats dit veld omlaag in de weergave."
                                >
                                  <i className="fa-solid fa-chevron-down text-[8px]"></i>
                                </button>
                                <button
                                  onClick={() => { console.log('👁 Clicked', field); toggleFieldVisibility(section, field); }}
                                  className={`p-1.5 rounded transition-all cursor-pointer ${isVisible ? 'text-green-500 hover:bg-green-50' : 'text-slate-300 hover:bg-slate-100'}`}
                                  title={isVisible ? 'Verberg dit veld op de website' : 'Toon dit veld op de website'}
                                >
                                  <i className={`fa-solid ${isVisible ? 'fa-eye' : 'fa-eye-slash'}`}></i>
                                </button>
                              </div>
                            </div>
                          );
                        })
                      }
                    </div>
                  </div>

                  {/* Item Management */}
                  <div>
                    <label className="text-[9px] uppercase font-black text-slate-400 block mb-1">Items ({siteStructure?.data?.[section]?.length || 0})</label>
                    <div className="max-h-32 overflow-y-auto mb-2 space-y-1 border-y border-slate-100 py-2">
                      {siteStructure?.data?.[section]?.map((item, index) => {
                        // Slimmere titel bepaling
                        let title = item.naam || item.titel || item.header || item.kop;
                        if (!title) {
                          // Zoek eerste beste string veld dat niet een url/afbeelding is
                          const stringKey = Object.keys(item).find(k =>
                            typeof item[k] === 'string' &&
                            item[k].length < 50 &&
                            !k.includes('foto') &&
                            !k.includes('image') &&
                            !k.includes('url')
                          );
                          if (stringKey) title = item[stringKey];
                        }
                        if (!title) title = `Item ${index + 1}`;

                        return (
                          <div key={index} className="flex items-center justify-between bg-white p-1.5 rounded border border-slate-100 text-[10px]" title={`Beheer item: ${title}`}>
                            <span className="truncate flex-1 pr-2 text-slate-600">{title}</span>
                            <button
                              onClick={() => deleteItem(section, index)}
                              className="p-2 -mr-1 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                              title="Verwijder dit item definitief uit de lijst."
                            >
                              <i className="fa-solid fa-trash-can"></i>
                            </button>
                          </div>
                        );
                      })}
                      {(!siteStructure?.data?.[section] || siteStructure.data[section].length === 0) && (
                        <p className="text-[10px] text-slate-400 italic text-center py-2">Geen items aanwezig.</p>
                      )}
                    </div>
                    <button
                      onClick={() => addItem(section)}
                      className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 text-[10px] font-bold rounded-lg transition-colors border border-blue-200"
                      title="Voeg een nieuw, leeg item toe aan deze lijst om daarna in te vullen."
                    >
                      <i className="fa-solid fa-plus mr-1"></i> Add Item
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-slate-400 italic">Nog geen secties gedetecteerd. Klik op 'Scan' om te zoeken.</p>
          )}
          </div>
        </aside>
      </div>
    </div>
  );
};

export default DockFrame;
