import StyleInjector from './components/StyleInjector';
import React, { useState, useEffect } from 'react';
import { HashRouter as Router } from 'react-router-dom';

import Header from './components/Header';
import Section from './components/Section';
import Footer from './components/Footer';

import { DisplayConfigProvider } from './components/DisplayConfigContext';

const App = ({ data: initialData }) => {
  const [data, setData] = useState(() => {
    const saved = sessionStorage.getItem('athena_live_overrides');
    if (saved) {
      try {
        const overrides = JSON.parse(saved);
        const merged = { ...initialData };
        Object.keys(overrides).forEach(file => {
          if (merged[file]) {
            if (Array.isArray(merged[file])) merged[file] = [{ ...merged[file][0], ...overrides[file] }];
            else merged[file] = { ...merged[file], ...overrides[file] };
          }
        });
        return merged;
      } catch (e) { return initialData; }
    }
    return initialData;
  });

  useEffect(() => {
    const handleMessage = (event) => {
      const { type, file, index, key, value, config, section } = event.data;

      if (type === 'DOCK_REQUEST_SYNC') {
        console.log('📡 [App] Responding to data sync request for:', key);
        const sourceFile = file || 'site_settings';
        const sourceData = data[sourceFile];
        const row = Array.isArray(sourceData) ? sourceData[index || 0] : sourceData;
        
        window.parent.postMessage({
          type: 'SITE_SYNC_RESPONSE',
          key,
          value: row ? row[key] : null,
          fullRow: row
        }, '*');
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [data]);

  const primaryTable = Object.keys(data)[0];

  return (
    <DisplayConfigProvider data={data}>
      <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
        <div className="min-h-screen bg-[var(--color-background)] text-[var(--color-text)] transition-colors duration-500">
          <StyleInjector siteSettings={data['site_settings']} />
          <Header siteSettings={data['site_settings']} />
          <main style={{ paddingTop: 'var(--content-top-offset, 0px)' }}>
            <Section data={data} />
          </main>
          <Footer data={data} />
        </div>
      </Router>
    </DisplayConfigProvider>
  );
};

export default App;
