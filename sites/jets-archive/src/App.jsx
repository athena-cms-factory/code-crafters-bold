import React, { useEffect, useState } from 'react';
import { HashRouter as Router } from 'react-router-dom';
import { DisplayConfigProvider } from './components/DisplayConfigContext';
import { StyleProvider } from './components/StyleContext';
import JetCard from './components/JetCard';
import EditableText from './components/EditableText';
import EditableMedia from './components/EditableMedia';
import Header from './components/Header';
import Footer from './components/Footer';

const App = ({ data: initialData }) => {
  const [data, setData] = useState(initialData);
  const [selectedDecades, setSelectedDecades] = useState([]); // Empty array means 'All'

  useEffect(() => {
    // Listen for updates from the Dock
    const handleUpdate = (event) => {
      if (event.data && event.data.type === 'athena_update') {
        setData(event.data.data);
      }
    };

    window.addEventListener('message', handleUpdate);
    return () => window.removeEventListener('message', handleUpdate);
  }, []);

  if (!data) return <div className="h-screen flex items-center justify-center font-bold text-slate-400 uppercase tracking-widest">Loading...</div>;

  const basis = data.basis?.[0] || {};
  const jets = data.jets || [];

  // Filter Logic
  const allDecades = [...new Set(jets.map(jet => Math.floor(jet.introduction_year / 10) * 10))].sort((a, b) => a - b);

  const toggleDecade = (decade) => {
    if (decade === 'All') {
      setSelectedDecades([]);
    } else {
      setSelectedDecades(prev => 
        prev.includes(decade) 
          ? prev.filter(d => d !== decade) 
          : [...prev, decade]
      );
    }
  };

  const filteredJets = (selectedDecades.length === 0 
    ? jets 
    : jets.filter(jet => selectedDecades.includes(Math.floor(jet.introduction_year / 10) * 10))).slice().reverse();

  return (
    <StyleProvider data={data}>
      <DisplayConfigProvider data={data}>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
            <Header siteSettings={data.site_settings} />
            
            <main>
              {/* Hero Section */}
              <section data-dock-section="basis" className="relative min-h-[60vh] flex items-center justify-center pt-20 overflow-hidden bg-slate-900 text-white">
                <div className="absolute inset-0 z-0 opacity-40">
                  <div className="absolute inset-0 bg-gradient-to-br from-sky-900 to-slate-900"></div>
                </div>
                
                <div className="relative z-10 max-w-5xl mx-auto px-6 text-center">
                  <h1 className="text-4xl md:text-7xl font-black mb-6 tracking-tight">
                    <EditableText value={basis.hero_header || 'Vliegende Iconen'} cmsBind={{file: 'basis', index: 0, key: 'hero_header'}} />
                  </h1>
                  <p className="text-xl md:text-2xl text-sky-200 font-light max-w-2xl mx-auto mb-10">
                    <EditableText value={basis.hero_subtekst || 'Verken de evolutie van straaljagers door de decennia heen.'} cmsBind={{file: 'basis', index: 0, key: 'hero_subtekst'}} />
                  </p>
                  <div className="flex flex-wrap justify-center gap-4">
                    <button onClick={() => document.getElementById('collection')?.scrollIntoView({behavior: 'smooth'})} className="bg-sky-500 hover:bg-sky-400 text-white px-8 py-3 rounded-full font-bold transition-all transform hover:scale-105 shadow-xl">
                        Bekijk de vloot
                    </button>
                  </div>
                </div>
              </section>

              {/* Jets Collection */}
              <section id="collection" data-dock-section="jets" className="py-24 px-6">
                <div className="max-w-7xl mx-auto">
                  <div className="flex items-center justify-between mb-8">
                      <h2 className="text-3xl font-black uppercase tracking-tighter">De Collectie</h2>
                      <div className="h-1 flex-grow mx-8 bg-slate-200 hidden md:block"></div>
                      <div className="text-slate-400 font-bold">{filteredJets.length} Toestellen</div>
                  </div>

                  {/* Filter Bar */}
                  <div className="mb-12 flex flex-wrap gap-2 justify-center">
                    <button
                      onClick={() => toggleDecade('All')}
                      className={`px-6 py-2 rounded-full font-bold transition-all ${
                        selectedDecades.length === 0 
                        ? 'bg-sky-500 text-white shadow-lg scale-105' 
                        : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      Alle Decennia
                    </button>
                    {allDecades.map(decade => (
                      <button
                        key={decade}
                        onClick={() => toggleDecade(decade)}
                        className={`px-6 py-2 rounded-full font-bold transition-all relative ${
                          selectedDecades.includes(decade) 
                          ? 'bg-sky-500 text-white shadow-lg scale-105' 
                          : 'bg-white text-slate-500 hover:bg-slate-100 border border-slate-200'
                        }`}
                      >
                        {decade}s
                        {selectedDecades.includes(decade) && (
                          <span className="absolute -top-1 -right-1 flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-sky-500 border border-white"></span>
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
                      {filteredJets.map((jet, index) => {
                        const originalIndex = jets.findIndex(j => j.id === jet.id);
                        return <JetCard key={jet.id || index} jet={jet} index={originalIndex !== -1 ? originalIndex : index} />;
                      })}
                  </div>
                </div>
              </section>
            </main>

            <Footer data={data} />
          </div>
        </Router>
      </DisplayConfigProvider>
    </StyleProvider>
  );
};
// Trigger workflow


export default App;

