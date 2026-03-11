import React, { useState, useEffect } from 'react';

const MetadataConfigModal = ({ isOpen, onClose, tableName, sampleItem }) => {
  const [config, setConfig] = useState({ visible_fields: [], hidden_fields: [] });
  const [allFields, setAllFields] = useState([]);

  useEffect(() => {
    if (!isOpen || !sampleItem) return;
    
    // Load current config
    fetch(`${import.meta.env.BASE_URL}display_config.json`)
      .then(res => res.json())
      .then(data => {
        const sectionConfig = data.sections?.[tableName] || { visible_fields: [], hidden_fields: [] };
        setConfig(sectionConfig);
      })
      .catch(() => setConfig({ visible_fields: [], hidden_fields: [] }));

    // Extract all fields from sample item
    const technicalFields = ['absoluteIndex', 'id', 'pk', 'uuid', 'naam', 'product_naam', 'bedrijfsnaam', 'titel', 'kaas_naam', 'naam_hond', 'beschrijving', 'omschrijving', 'korte_bio', 'info', 'inhoud_bericht', 'prijs', 'kosten', 'categorie', 'type', 'specialisatie'];
    const fields = Object.keys(sampleItem).filter(key => 
      !technicalFields.includes(key) && 
      !key.toLowerCase().includes('afbeelding') &&
      !key.toLowerCase().includes('foto') &&
      !key.toLowerCase().includes('image')
    );
    setAllFields(fields);
  }, [isOpen, tableName, sampleItem]);

  const toggleField = (field) => {
    const isCurrentlyVisible = config.visible_fields.includes(field);
    const isCurrentlyHidden = config.hidden_fields.includes(field);

    let newVisible = [...config.visible_fields];
    let newHidden = [...config.hidden_fields];

    if (isCurrentlyVisible) {
      // Was visible -> make hidden
      newVisible = newVisible.filter(f => f !== field);
      newHidden.push(field);
    } else if (isCurrentlyHidden) {
      // Was hidden -> make auto (neither list)
      newHidden = newHidden.filter(f => f !== field);
    } else {
      // Was auto -> make visible
      newVisible.push(field);
    }

    setConfig({ visible_fields: newVisible, hidden_fields: newHidden });
  };

  const getFieldStatus = (field) => {
    if (config.visible_fields.includes(field)) return 'visible';
    if (config.hidden_fields.includes(field)) return 'hidden';
    return 'auto';
  };

  const saveConfig = async () => {
    try {
      const response = await fetch(`${import.meta.env.BASE_URL}display_config.json`);
      const fullConfig = await response.json();
      
      fullConfig.sections = fullConfig.sections || {};
      fullConfig.sections[tableName] = config;

      await fetch(`${import.meta.env.BASE_URL}__athena/update-json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          file: 'display_config', 
          action: 'update-section-config',
          section: tableName,
          config: config
        })
      });

      window.location.reload();
    } catch (err) {
      console.error('Failed to save config:', err);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-2xl font-bold text-slate-900 dark:text-white">Metadata Velden Configureren</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Sectie: <span className="font-mono">{tableName}</span></p>
        </div>

        <div className="p-6 overflow-y-auto max-h-[50vh]">
          <div className="mb-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-900 dark:text-blue-100">
              <strong>Klik op een veld</strong> om te wisselen tussen:
              <span className="block mt-2 space-y-1">
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500"></span>
                  <strong>Altijd tonen</strong> - Veld wordt altijd getoond
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                  <strong>Automatisch</strong> - Systeem beslist (standaard)
                </span>
                <span className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500"></span>
                  <strong>Altijd verbergen</strong> - Veld wordt nooit getoond
                </span>
              </span>
            </p>
          </div>

          <div className="space-y-2">
            {allFields.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Geen extra velden gevonden in deze sectie</p>
            ) : (
              allFields.map(field => {
                const status = getFieldStatus(field);
                const statusColor = status === 'visible' ? 'bg-green-500' : status === 'hidden' ? 'bg-red-500' : 'bg-slate-300';
                const statusLabel = status === 'visible' ? 'Altijd tonen' : status === 'hidden' ? 'Verbergen' : 'Automatisch';
                
                return (
                  <button
                    key={field}
                    onClick={() => toggleField(field)}
                    className="w-full flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/50 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors group"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${statusColor} transition-colors`}></div>
                      <span className="font-mono text-sm text-slate-700 dark:text-slate-300">{field}</span>
                    </div>
                    <span className="text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">
                      {statusLabel}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 dark:border-slate-700 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          >
            Annuleren
          </button>
          <button
            onClick={saveConfig}
            className="px-6 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors font-medium"
          >
            Opslaan & Herladen
          </button>
        </div>
      </div>
    </div>
  );
};

export default MetadataConfigModal;
