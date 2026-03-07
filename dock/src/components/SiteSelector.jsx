import React, { useState, useEffect } from 'react';

const SiteSelector = ({ selectedSite, onSelectSite }) => {
  const [sites, setSites] = useState([]);
  const [activeServers, setActiveServers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSites = async () => {
      try {
        const localRes = await fetch('/sites.json');
        let normalized = [];

        if (localRes.ok) {
          const rawData = await localRes.json();
          // Normaliseer naar lijst van objecten met id, name en url
          normalized = rawData.map(s => {
            const sitename = s.name || s.id || (typeof s === 'string' ? s : '');
            const sitePort = s.port || import.meta.env.VITE_SITE_PORT || '3000';

            // In development we serve the active site at the root of the port
            const hostname = window.location.hostname;
            const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname.endsWith('.test') || hostname.startsWith('100.115.');
            const url = isLocal
              ? `http://${hostname}:${sitePort}/`
              : `https://athena-cms-factory.github.io/${sitename}/`;

            if (typeof s === 'string') return { id: s, name: s, url };
            return {
              url,
              ...s,
              id: s.id || s.name,
              name: s.name || s.id
            };
          });
        }

        // Check voor actieve servers via het dashboard
        let firstActive = null;
        try {
          const dashboardPort = import.meta.env.VITE_DASHBOARD_PORT || '5001';
          const dashboardHost = window.location.hostname;
          const activeRes = await fetch(`http://${dashboardHost}:${dashboardPort}/api/servers/active`);
          if (activeRes.ok) {
            const data = await activeRes.json();
            const servers = data.servers || [];
            setActiveServers(servers);

            if (servers.length > 0) {
              // Update de URLs van de sites die actief zijn met de werkelijke URL van de server
              normalized = normalized.map(site => {
                const active = servers.find(as => as.siteName === site.id || as.siteName === site.name);
                if (active) {
                  return { ...site, url: active.url, active: true };
                }
                return site;
              });

              // Zoek de eerste actieve site
              firstActive = normalized.find(s => s.active);
            }
          }
        } catch (e) {
          console.warn("ℹ️ Dashboard niet bereikbaar voor actieve server check.");
        }

        setSites(normalized);

        // Selectie logica
        const params = new URLSearchParams(window.location.search);
        const siteParam = params.get('site');

        if (siteParam) {
          const found = normalized.find(s => s.id === siteParam || s.name === siteParam);
          if (found) {
            console.debug("🎯 Selecting site from URL parameter:", found.name);
            onSelectSite(found);
          } else if (firstActive) {
            onSelectSite(firstActive);
          } else if (normalized.length > 0) {
            onSelectSite(normalized[0]);
          }
        } else if (!selectedSite) {
          if (firstActive) {
            console.debug("🎯 Auto-selecting active site:", firstActive.name, "at", firstActive.url);
            onSelectSite(firstActive);
          } else if (normalized.length > 0) {
            onSelectSite(normalized[0]);
          }
        }

        setLoading(false);
      } catch (err) {
        console.warn("⚠️ Kon sites niet ophalen.", err);
        setLoading(false);
      }
    };

    fetchSites();
  }, []);

  const activeNames = activeServers.map(s => s.siteName);

  if (loading) return <span className="text-xs text-slate-400">Loading sites...</span>;

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="site-select" className="text-sm text-slate-300">
        Site:
      </label>
      <div className="relative">
        <select
          id="site-select"
          value={selectedSite?.id || ''}
          onChange={(e) => {
            const site = sites.find(s => s.id === e.target.value);
            onSelectSite(site);
          }}
          className="bg-slate-800 text-white pl-3 pr-8 py-1 rounded border border-slate-700 focus:border-blue-500 focus:outline-none appearance-none"
        >
          {sites.length > 0 ? (
            sites.map(site => {
              const isActive = site.active || activeNames.includes(site.id) || activeNames.includes(site.name);
              return (
                <option key={site.id} value={site.id}>
                  {isActive ? '● ' : ''}{site.name} {isActive ? '(Active)' : ''}
                </option>
              );
            })
          ) : (
            <option value="">Geen sites gevonden</option>
          )}
        </select>
        <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-slate-500 text-[10px]">
          <i className="fa-solid fa-chevron-down"></i>
        </div>
      </div>
    </div>
  );
};

export default SiteSelector;