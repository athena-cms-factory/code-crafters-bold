import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import './css/bold.css';
import './dock-connector.js';

async function init() {
  const data = {};
  // Dummy data loading logic for local development
  try {
    
    const dataModules = import.meta.glob('./data/*.json', { eager: true });
    const getData = (name) => {
        const key = Object.keys(dataModules).find(k => k.toLowerCase().endsWith(`/${name.toLowerCase()}.json`));
        return key ? dataModules[key].default : null;
    };
    data['section_order'] = getData('section_order') || [];
    data['site_settings'] = getData('site_settings') || {};
    data['display_config'] = getData('display_config') || { sections: {} };
    data['layout_settings'] = getData('layout_settings') || {};
    for (const sectionName of data['section_order']) {
        const sectionData = getData(sectionName);
        data[sectionName] = sectionData ? (Array.isArray(sectionData) ? sectionData : [sectionData]) : [];
    }
    if (window.athenaScan) window.athenaScan(data);
  } catch (e) {
    console.error("Data laad fout:", e);
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <App data={data} />
    </React.StrictMode>
  );
}

init();
