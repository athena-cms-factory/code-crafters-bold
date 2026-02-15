// --- CONFIG & STATE ---
const API = window.location.origin + '/api';
let currentTool = null;
let systemConfig = null;

async function loadSystemConfig() {
    try {
        const res = await fetch(`${API}/system/config`);
        systemConfig = await res.json();
        console.log("🛠️ System Config Loaded:", systemConfig);
        updateHeaderServerInfo();
    } catch (e) {
        console.error("Failed to load system config:", e);
    }
}

function getTimeAgo(date) {
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    if (diffMins < 1) return 'Zojuist bijgewerkt';
    if (diffMins < 60) return `${diffMins} min geleden`;
    if (diffHours < 24) return `${diffHours} uur geleden`;
    if (diffDays === 1) return 'Gisteren';
    if (diffDays < 7) return `${diffDays} dagen geleden`;
    if (diffWeeks < 5) return `${diffWeeks} ${diffWeeks === 1 ? 'week' : 'weken'} geleden`;
    if (diffMonths < 12) return `${diffMonths} ${diffMonths === 1 ? 'maand' : 'maanden'} geleden`;
    return date.toLocaleDateString('nl-BE', { day: 'numeric', month: 'short', year: 'numeric' });
}

// Update de header met de werkelijke server locatie
function updateHeaderServerInfo() {
    const serverInfo = document.querySelector('.server-info .value');
    if (serverInfo) {
        serverInfo.innerText = window.location.host;
    }
}

async function openToolServer(type) {
    if (!systemConfig) await loadSystemConfig();
    const port = type === 'layout' ? systemConfig.ports.layout : systemConfig.ports.media;

    fetch(`${API}/start-${type}-server`, { method: 'POST' });

    setTimeout(() => {
        window.open(`http://${window.location.hostname}:${port}`, '_blank');
    }, 800);
}

async function openDock() {
    if (!systemConfig) await loadSystemConfig();
    const port = systemConfig.ports.dock;

    fetch(`${API}/start-dock`, { method: 'POST' });

    // We geven de server even tijd om op te starten
    setTimeout(() => {
        window.open(`http://${window.location.hostname}:${port}`, '_blank');
    }, 1500);
}

async function fetchJSON(endpoint) {
    try {
        const res = await fetch(`${API}${endpoint}`);
        return await res.json();
    } catch (e) {
        console.error("Fetch error:", e);
        return null;
    }
}

async function showManual(filename) {
    const title = filename.replace(/_/g, ' ').replace('.md', '');
    openModal('tool-info-modal');
    document.getElementById('tool-info-title').innerText = `📖 Handleiding: ${title}`;
    const body = document.getElementById('tool-info-body');
    body.innerHTML = '<p class="loading-msg">📡 Bezig met ophalen van documentatie...</p>';

    try {
        const res = await fetch(`${API}/docs/${filename}`);
        const data = await res.json();
        if (data.content) {
            // Simpele markdown naar HTML conversie
            let html = data.content
                .replace(/^# (.*$)/gim, '<h1 style="color:#fff; border-bottom: 2px solid var(--accent); padding-bottom: 10px; margin-bottom: 20px;">$1</h1>')
                .replace(/^## (.*$)/gim, '<h2 style="color:var(--accent); margin-top:30px; margin-bottom:15px;">$1</h2>')
                .replace(/^### (.*$)/gim, '<h3 style="color:#fff; margin-top:20px; margin-bottom:10px;">$1</h3>')
                .replace(/\*\*(.*)\*\*/gim, '<strong class="accent">$1</strong>')
                .replace(/^- (.*$)/gim, '<li style="margin-left: 20px; margin-bottom: 5px;">$1</li>')
                .replace(/```env([\s\S]*?)```/gim, '<pre class="code-box" style="background:#000; padding:15px; border-radius:8px; margin:15px 0;">$1</pre>')
                .replace(/\n/g, '<br>');
            
            body.innerHTML = `<div class="markdown-content">${html}</div>`;
        } else {
            body.innerHTML = `<p class="error">Kon de handleiding niet laden: ${data.error}</p>`;
        }
    } catch (e) {
        body.innerHTML = `<p class="error">Netwerkfout bij laden van documentatie.</p>`;
    }
}

// --- NAVIGATION ---
function showSection(id, btn) {
    // Verberg alle secties
    document.querySelectorAll('.view-section').forEach(el => {
        el.classList.add('hidden');
    });

    // Toon de geselecteerde sectie
    const target = document.getElementById(id);
    if (target) target.classList.remove('hidden');

    // Update de navigatie knoppen
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    if (btn) {
        btn.classList.add('active');
    } else {
        // Fallback: zoek de knop die bij deze sectie hoort
        let navBtn = document.querySelector(`.nav-btn[onclick*="'${id}'"]`);
        // Speciale case: 'create' hoort nu bij 'sites'
        if (id === 'create') navBtn = document.querySelector(`.nav-btn[onclick*="'sites'"]`);

        if (navBtn) navBtn.classList.add('active');
    }

    // Update de pagina titel
    let title = id.charAt(0).toUpperCase() + id.slice(1);
    if (id === 'sites') title = "Sites";
    if (id === 'projects') title = "Data Bronnen";
    document.getElementById('page-title').innerText = title;

    // Toon/verberg header actie knop
    const headerBtn = document.getElementById('header-create-btn');
    if (headerBtn) {
        const showOn = ['sites', 'projects', 'repositories', 'sitetypes'];
        if (showOn.includes(id)) headerBtn.classList.remove('hidden');
        else headerBtn.classList.add('hidden');
    }

    // Initialiseer sectie-specifieke data
    if (id === 'sites') loadSites();
    if (id === 'projects') loadProjects();
    if (id === 'repositories') loadRepositories();
    if (id === 'create') loadCreateForm();
    if (id === 'deploy') loadDeployForm();
    if (id === 'todo') loadTodo();
    if (id === 'settings') loadSettings();
    if (id === 'sitetypes') loadSiteTypes();
    if (id === 'servers') loadServerStatus();
    if (id === 'storage') loadStorageStatus();
}

async function loadStorageStatus() {
    const list = document.getElementById('storage-list');
    list.innerHTML = '<p class="loading-msg">📡 Opslag status ophalen...</p>';

    const sites = await fetchJSON('/storage/status') || [];
    list.innerHTML = '';

    const countEl = document.getElementById('storage-count-sites');
    const savableEl = document.getElementById('storage-savable');
    const diskPercentEl = document.getElementById('storage-disk-percent');
    const diskBarEl = document.getElementById('storage-disk-bar');

    countEl.innerText = sites.length;

    let totalSavable = 0;
    sites.forEach(site => {
        if (site.policy === 'dormant' && site.hydration === 'hydrated') {
            totalSavable += (site.storage - 10); // Schatting: node_modules is meestal grootse deel
        }
    });
    savableEl.innerText = `${totalSavable} MB`;

    // System Disk Info
    try {
        const sys = await fetchJSON('/system-status');
        if (sys) {
            diskPercentEl.innerText = sys.percent;
            diskBarEl.style.width = sys.percent;
            // Kleur aanpassen op basis van vulling
            const p = parseInt(sys.percent);
            diskBarEl.style.background = p > 90 ? 'var(--error)' : (p > 70 ? 'var(--warning)' : 'var(--success)');
        }
    } catch (e) {}

    if (sites.length === 0) {
        list.innerHTML = '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: var(--text-muted); opacity: 0.5;">Geen sites gevonden om te beheren.</div>';
        return;
    }

    sites.forEach(site => {
        const isHydrated = site.hydration === 'hydrated';
        const isDormant = site.hydration === 'dormant';
        const needsAction = (site.policy === 'dormant' && isHydrated) || (site.policy === 'hydrated' && isDormant);

        const card = document.createElement('div');
        card.className = `site-card ${needsAction ? 'status-local' : (isHydrated ? 'status-live' : 'status-local')}`;
        card.style.borderColor = needsAction ? 'var(--warning)' : '';

        card.innerHTML = `
            <div class="site-card-content">
                <div class="card-header" style="justify-content: space-between;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid fa-hard-drive" style="font-size:1.2rem; color: ${isHydrated ? 'var(--success)' : 'var(--text-muted)'};"></i>
                        <h4 style="font-weight:700; letter-spacing:0.5px; font-size:1.05rem;">${site.site}</h4>
                    </div>
                    <span class="badge ${isHydrated ? 'badge-live' : 'badge-local'}">
                        ${isHydrated ? 'HYDRATED' : 'DORMANT'}
                    </span>
                </div>

                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:10px; margin-bottom:15px; margin-top:10px;">
                    <div class="stat-mini">
                        <small class="muted">Grootte</small>
                        <p style="font-weight:800; font-size:1.1rem;">${site.storage} <span style="font-size:0.7rem; opacity:0.6;">MB</span></p>
                    </div>
                    <div class="stat-mini">
                        <small class="muted">Beleid</small>
                        <p style="font-weight:800; font-size:0.9rem; color: var(--accent);">${site.policy.toUpperCase()}</p>
                    </div>
                </div>

                <div class="form-group mb-15">
                    <label style="font-size: 0.7rem; margin-bottom: 5px;">Beleid Wijzigen</label>
                    <select onchange="updateStoragePolicy('${site.site}', this.value)" style="width: 100%; padding: 5px; font-size: 0.8rem; background: var(--bg-darker); border-radius: 4px; color: #fff; border: 1px solid var(--border);">
                        <option value="dormant" ${site.policy === 'dormant' ? 'selected' : ''}>🌵 Dormant (Bespaar ruimte)</option>
                        <option value="hydrated" ${site.policy === 'hydrated' ? 'selected' : ''}>💧 Hydrated (Ready to dev)</option>
                    </select>
                </div>

                <div style="display:flex; gap:8px; margin-top:auto; padding-top:12px; border-top:1px solid var(--border);">
                    <button onclick="enforceStoragePolicy('${site.site}')" class="primary-btn ${needsAction ? 'pulse' : ''}" style="flex:1; padding:8px; font-size:0.75rem; font-weight:700; background: ${needsAction ? 'var(--warning)' : 'var(--accent)'}; color: #000;">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> ${needsAction ? 'FIX NU' : 'RE-SYNC'}
                    </button>
                    ${isHydrated ? `
                    <button onclick="dehydrateSite('${site.site}')" class="secondary-btn" style="padding:8px; font-size:0.75rem; color: var(--error); border-color: var(--error);" title="Nu handmatig node_modules verwijderen">
                        <i class="fa-solid fa-trash-can"></i>
                    </button>` : ''}
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

async function updateStoragePolicy(siteName, policy) {
    try {
        const res = await fetch(`${API}/storage/policy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteName, policy })
        });
        const data = await res.json();
        if (data.success) {
            loadStorageStatus();
        }
    } catch (e) { alert("Fout bij bijwerken beleid: " + e.message); }
}

async function enforceStoragePolicy(siteName) {
    try {
        const res = await fetch(`${API}/storage/enforce`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ siteName })
        });
        const data = await res.json();
        if (data.success) {
            loadStorageStatus();
        }
    } catch (e) { alert("Fout bij uitvoeren actie: " + e.message); }
}

async function dehydrateSite(siteName) {
    if (!confirm(`Wil je node_modules van ${siteName} nu direct verwijderen?`)) return;
    try {
        // We kunnen de policy tijdelijk op dormant zetten en dan enforcen, 
        // of direct een dehydrate endpoint aanroepen als we die hadden. 
        // Voor nu gebruiken we de enforce methode nadat we de policy hebben gezet.
        await updateStoragePolicy(siteName, 'dormant');
        await enforceStoragePolicy(siteName);
    } catch (e) { alert("Fout: " + e.message); }
}

async function pruneAllDormant() {
    if (!confirm("Dit verwijdert ALLE node_modules mappen van sites die op 'Dormant' staan. Dit maakt veel ruimte vrij op je Chromebook. Doorgaan?")) return;
    try {
        const res = await fetch(`${API}/storage/prune-all`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            alert(`Succes! ${data.actions.length} sites opgeschoond.`);
            loadStorageStatus();
        }
    } catch (e) { alert("Fout bij bulk-opruimen: " + e.message); }
}

async function loadServerStatus() {
    const list = document.getElementById('servers-list');
    if (!systemConfig) await loadSystemConfig();

    // Load factory servers (Dashboard, Dock, etc.)
    const servers = [
        { id: 'dashboard', port: systemConfig.ports.dashboard },
        { id: 'dock', port: systemConfig.ports.dock },
        { id: 'layout', port: systemConfig.ports.layout },
        { id: 'media', port: systemConfig.ports.media }
    ];

    for (const server of servers) {
        const card = document.getElementById(`server-${server.id}`);
        if (!card) continue;

        const badge = card.querySelector('.status-badge');
        const btn = card.querySelector('.start-btn');
        const portSpan = card.querySelector('.port-val');

        if (portSpan) portSpan.innerText = server.port;

        try {
            const res = await fetch(`${API}/servers/check/${server.port}`);
            const data = await res.json();

            if (data.online) {
                card.classList.add('online');
                badge.innerText = 'ONLINE';
                badge.style.color = 'var(--success)';
                if (btn) {
                    btn.innerText = 'STOP';
                    btn.style.background = 'var(--error)';
                    btn.disabled = false;
                }
            } else {
                card.classList.remove('online');
                badge.innerText = 'OFFLINE';
                badge.style.color = 'var(--text-muted)';
                if (btn) {
                    if (server.id === 'preview') {
                        btn.innerText = 'START VIA SITES';
                        btn.style.background = 'var(--bg-darker)';
                        btn.disabled = true;
                    } else {
                        btn.innerText = 'START';
                        btn.style.background = 'var(--accent)';
                        btn.disabled = false;
                    }
                }
            }
        } catch (e) {
            badge.innerText = 'ERROR';
        }
    }

    // Load ACTIVE SITE SERVERS from registry
    try {
        const siteServersRes = await fetch(`${API}/servers/active`);
        const siteServersData = await siteServersRes.json();

        // Remove old dynamic site cards to avoid duplicates on refresh
        document.querySelectorAll('.server-card.dynamic-site').forEach(el => el.remove());

        if (siteServersData.servers && siteServersData.servers.length > 0) {
            siteServersData.servers.forEach(site => {
                const card = document.createElement('div');
                card.className = 'server-card online status-live dynamic-site';
                card.innerHTML = `
                    <div class="card-header">
                        <div class="flex-row align-center gap-10">
                            <i class="fa-solid fa-globe success"></i>
                            <h4 style="font-size: 0.85rem;">${site.siteName}</h4>
                        </div>
                        <span class="status-badge" style="color: var(--success);">ONLINE</span>
                    </div>
                    <div style="font-size: 0.7rem; color: var(--text-muted); margin: 8px 0;">
                        <i class="fa-solid fa-network-wired"></i> Port: <span class="port-val">${site.port}</span>
                    </div>
                    <div class="card-actions mt-10" style="display: flex; gap: 8px;">
                        <a href="${site.url}" target="_blank" class="primary-btn" style="flex: 1; text-align: center; padding: 8px; font-size: 0.7rem; background: var(--accent); text-decoration: none; display: flex; align-items: center; justify-content: center; gap: 5px;">
                            <i class="fa-solid fa-external-link"></i> OPEN
                        </a>
                        <button onclick="killSiteServer(${site.port})" class="secondary-btn" style="padding: 8px; font-size: 0.7rem; color: var(--error); border-color: var(--error);">
                            <i class="fa-solid fa-stop"></i> STOP
                        </button>
                    </div>
                `;
                list.appendChild(card);
            });
        }
    } catch (e) {
        console.error('Could not load active site servers:', e);
    }
}

async function killSiteServer(port) {
    if (!confirm(`Stop server op poort ${port}?`)) return;

    try {
        await fetch(`${API}/servers/kill/${port}`, { method: 'POST' });
        setTimeout(() => loadServerStatus(), 1000);
        // Ook de sites lijst verversen als we op de sites tab zijn
        if (document.getElementById('sites').classList.contains('active')) {
            loadSites();
        }
    } catch (e) {
        alert('Fout bij stoppen server: ' + e.message);
    }
}

async function stopSiteServerFromCard(name, port, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const btn = event.currentTarget;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        await fetch(`${API}/servers/kill/${port}`, { method: 'POST' });
        setTimeout(() => loadSites(), 800);
    } catch (e) {
        alert('Fout bij stoppen server: ' + e.message);
        loadSites();
    }
}

async function toggleServer(type) {
    const card = document.getElementById(`server-${type}`);
    const btn = card.querySelector('.start-btn');
    const isOnline = card.classList.contains('online');

    btn.disabled = true;
    btn.innerText = '...';

    const endpoint = isOnline ? `/servers/stop/${type}` : `/start-${type}-server`;
    if (type === 'dock' && !isOnline) {
        await fetch(`${API}/start-dock`, { method: 'POST' });
    } else {
        await fetch(`${API}${endpoint}`, { method: 'POST' });
    }

    setTimeout(() => {
        btn.disabled = false;
        loadServerStatus();
    }, 2000);
}

async function loadSiteTypes() {
    const list = document.getElementById('sitetypes-list');
    list.innerHTML = '<p class="loading-msg">SiteTypes laden...</p>';

    const res = await fetchJSON('/sitetype/existing');
    const sitetypes = res?.sitetypes || [];
    list.innerHTML = '';

    console.log("DEBUG: Sitetypes fetched:", sitetypes); // Debugging line

    if (sitetypes.length === 0) {
        list.innerHTML = '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: var(--text-muted); opacity: 0.5;">Geen SiteTypes gevonden.</div>';
        return;
    }

    // Sorteer: docked eerst
    sitetypes.sort((a, b) => {
        // Defensive checks for undefined 'name'
        const aName = a?.name || '';
        const bName = b?.name || '';

        if (a.track === 'docked' && b.track !== 'docked') return -1;
        if (a.track !== 'docked' && b.track === 'docked') return 1;
        return aName.localeCompare(bName);
    });

    const dockedCount = sitetypes.filter(t => t.track === 'docked').length;
    const autoCount = sitetypes.filter(t => t.track === 'autonomous').length;
    document.getElementById('count-sitetypes').innerText = sitetypes.length;
    document.getElementById('count-sitetypes-docked').innerText = dockedCount;
    document.getElementById('count-sitetypes-auto').innerText = autoCount;

    sitetypes.forEach(type => {
        const typeName = type?.name || 'Onbekend';
        const typeTrack = type?.track || 'onbekend';
        const typeDescription = type?.description || 'Geen beschrijving beschikbaar.';
        const tableCount = type?.tableCount || 0;
        const layoutCount = type?.layoutCount || 0;
        const displayName = typeName.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        const isDocked = typeTrack === 'docked';
        const trackIcon = isDocked ? 'fa-anchor' : 'fa-rocket';
        const trackLabel = isDocked ? 'Docked' : 'Autonomous';
        const trackColor = isDocked ? 'var(--success)' : 'var(--warning)';

        const card = document.createElement('div');
        card.className = `site-card status-${isDocked ? 'live' : 'local'}`;
        card.innerHTML = `
            <div class="site-card-content">
                <div class="card-header" style="justify-content: space-between;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid fa-puzzle-piece" style="font-size:1.2rem; color:var(--accent);"></i>
                        <h4 style="font-weight:700; letter-spacing:0.5px; font-size:1.05rem;">${displayName}</h4>
                    </div>
                    <span class="badge ${isDocked ? 'badge-live' : 'badge-local'}" style="width:auto; padding:3px 8px;">
                        <i class="fa-solid ${trackIcon}"></i> ${trackLabel}
                    </span>
                </div>

                <p style="font-size:0.75rem; color:var(--text-muted); margin:0 0 8px 0; line-height:1.5; min-height:2.4em;">
                    ${typeDescription}
                </p>

                <div style="display:flex; flex-direction:column; gap:5px; margin-bottom:10px;">
                    <div style="display:flex; gap:16px; font-size:0.75rem; color:var(--text-muted); font-weight:500;">
                        <span><i class="fa-solid fa-table" style="width:14px; opacity:0.6;"></i> ${tableCount} ${tableCount === 1 ? 'tabel' : 'tabellen'}</span>
                        <span><i class="fa-solid fa-layer-group" style="width:14px; opacity:0.6;"></i> ${layoutCount} ${layoutCount === 1 ? 'layout' : 'layouts'}</span>
                    </div>
                    <p style="font-size:0.7rem; color:var(--text-muted); margin:0; opacity:0.7;">
                        <i class="fa-solid fa-folder" style="width:14px;"></i> <code style="font-size:0.65rem; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">3-sitetypes/${typeTrack}/${typeName}/</code>
                    </p>
                </div>

                <div style="display:flex; gap:8px; margin-top:auto; padding-top:12px; border-top:1px solid var(--border);">
                    <button onclick="useSitetype('${typeName}')" class="primary-btn" style="flex:1; padding:8px; font-size:0.7rem; font-weight:700;">
                        <i class="fa-solid fa-plus"></i> GEBRUIK
                    </button>
                    <button onclick="deleteSitetype('${typeName}', '${typeTrack}')" class="secondary-btn" style="width:40px; color:var(--error); border-color:var(--error);" title="SiteType Verwijderen">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

function openSitetypeWizard() {
    // Reset wizard data
    sitetypeData = {
        name: '',
        description: '',
        businessDescription: '',
        dataStructure: [],
        designSystem: null,
        track: 'docked'
    };

    // Reset form fields
    document.getElementById('sitetype-name').value = '';
    document.getElementById('sitetype-description').value = '';
    document.getElementById('sitetype-business').value = '';
    document.getElementById('sitetype-track').value = 'docked';

    // Switch to first tab
    showSitetypeTab('basic');

    // Reset log
    const log = document.getElementById('sitetype-log');
    log.classList.add('hidden');
    log.innerHTML = '';

    openModal('sitetype-wizard-modal');
}

function useSitetype(name) {
    showSection('create');
    const siteNameInput = document.getElementById('site-name-input');
    if (siteNameInput) siteNameInput.removeAttribute('data-manual');

    setTimeout(() => {
        document.getElementById('sitetype-select').value = name;
        loadLayouts(name);
    }, 100);
}

async function deleteSitetype(name, track) {
    if (!confirm(`Weet je zeker dat je sitetype '${name}' (${track}) wilt verwijderen?`)) return;

    // Hier zou een API call moeten komen, maar voor nu doen we het even zo
    alert("Verwijderen van sitetypes is nog niet geïmplementeerd via de API voor de veiligheid.");
}

async function loadSettings() {
    const data = await fetchJSON('/settings');
    if (!data) return;

    const form = document.getElementById('settings-form');
    for (const [key, value] of Object.entries(data)) {
        const input = form.querySelector(`[name="${key}"]`);
        if (input) input.value = value;
    }
}

document.getElementById('settings-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const log = document.getElementById('settings-log');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    btn.disabled = true; btn.innerText = "⏳ Bezig met opslaan...";
    try {
        const res = await fetch(`${API}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        log.classList.remove('hidden');
        log.innerText = result.success ? `✅ ${result.message}` : `❌ Fout: ${result.error}`;
        if (result.success) {
            setTimeout(() => log.classList.add('hidden'), 3000);
        }
    } catch (err) { log.innerText = `❌ Fout: ${err.message}`; }
    btn.disabled = false; btn.innerHTML = '<i class="fa-solid fa-save"></i> Wijzigingen Opslaan';
};

async function loadRepositories() {
    const list = document.getElementById('repos-list');
    list.innerHTML = '<p class="loading-msg">📡 GitHub data ophalen...</p>';

    const repos = await fetchJSON('/remote-repos') || [];
    list.innerHTML = '';

    const publicCount = repos.filter(r => !r.isPrivate).length;
    const privateCount = repos.filter(r => r.isPrivate).length;
    document.getElementById('count-repos').innerText = repos.length;
    document.getElementById('count-repos-public').innerText = publicCount;
    document.getElementById('count-repos-private').innerText = privateCount;

    if (repos.length === 0) {
        list.innerHTML = '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: var(--text-muted); opacity: 0.5;">Geen repositories gevonden op GitHub.</div>';
        return;
    }

    repos.forEach(repo => {
        const isProtected = repo.name === 'athena-cms';
        const pagesUrl = `https://${repo.owner}.github.io/${repo.name}/`;
        const updatedDate = new Date(repo.updatedAt);
        const timeAgo = getTimeAgo(updatedDate);

        const card = document.createElement('div');
        card.className = `site-card ${repo.isPrivate ? 'status-local' : 'status-live'}`;
        card.innerHTML = `
            <div class="site-card-content">
                <div class="card-header" style="justify-content: space-between;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa-brands fa-github" style="font-size:1.2rem; color: var(--text-muted);"></i>
                        <h4 style="font-weight:700; letter-spacing:0.5px; font-size:1.05rem;">${repo.name}</h4>
                    </div>
                    <div class="card-badges" style="display:flex; gap:5px;">
                        ${isProtected ? '<span class="badge" style="background:rgba(0,122,204,0.1); color:var(--accent); border:1px solid var(--accent); width:auto; padding:3px 8px;"><i class="fa-solid fa-shield"></i> CORE</span>' : ''}
                        <span class="badge ${repo.isPrivate ? 'badge-error' : 'badge-live'}">
                            <i class="fa-solid ${repo.isPrivate ? 'fa-lock' : 'fa-globe'}"></i> ${repo.isPrivate ? 'PRIVÉ' : 'PUBLIC'}
                        </span>
                    </div>
                </div>

                <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:0; font-weight:500;">
                        <i class="fa-solid fa-user" style="width:14px; opacity:0.6;"></i> ${repo.owner}
                    </p>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:0; font-weight:500;">
                        <i class="fa-solid fa-clock" style="width:14px; opacity:0.6;"></i> ${timeAgo}
                    </p>
                    ${!repo.isPrivate ? `
                    <p style="font-size:0.7rem; color:var(--success); margin:0; font-weight:500; opacity:0.8;">
                        <i class="fa-solid fa-globe" style="width:14px;"></i> GitHub Pages beschikbaar
                    </p>` : ''}
                </div>

                <div style="display:flex; gap:8px; margin-top:auto; padding-top:12px; border-top:1px solid var(--border);">
                    <a href="${repo.url}" target="_blank" class="secondary-btn" style="flex:1; text-align:center; padding:8px; font-size:0.75rem; font-weight:700;">
                        <i class="fa-brands fa-github"></i> REPO
                    </a>
                    ${!repo.isPrivate ? `
                    <a href="${pagesUrl}" target="_blank" class="secondary-btn" style="flex:1; text-align:center; padding:8px; font-size:0.75rem; font-weight:700; color:var(--success); border-color:var(--success);">
                        <i class="fa-solid fa-globe"></i> LIVE
                    </a>` : ''}
                    ${isProtected ? '' : `
                    <button onclick="deleteRemoteOnly('${repo.fullName}')" class="secondary-btn" style="width:40px; color:var(--error); border-color:var(--error);" title="Verwijder repository">
                        <i class="fa-solid fa-trash"></i>
                    </button>`}
                </div>
            </div>
        `;
        list.appendChild(card);
    });
}

let repoToDelete = null;

async function deleteRemoteOnly(fullName) {
    repoToDelete = fullName;
    const modal = document.getElementById('delete-repo-modal');
    const display = document.getElementById('delete-repo-name-display');
    const input = document.getElementById('delete-repo-confirm-input');
    const btn = document.getElementById('delete-repo-final-btn');

    display.innerText = fullName;
    input.value = '';
    btn.disabled = true;
    btn.style.opacity = '0.5';

    // Event listener voor de bevestigingstip
    input.oninput = (e) => {
        if (e.target.value === fullName) {
            btn.disabled = false;
            btn.style.opacity = '1';
        } else {
            btn.disabled = true;
            btn.style.opacity = '0.5';
        }
    };

    btn.onclick = () => confirmDeleteRepo(fullName);

    openModal('delete-repo-modal');
}

async function confirmDeleteRepo(fullName) {
    const btn = document.getElementById('delete-repo-final-btn');
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Verwijderen...';

    try {
        // We sturen de fullName mee, server moet dit afhandelen
        const res = await fetch(`${API}/projects/remote-delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fullName })
        });
        const data = await res.json();

        if (data.success) {
            closeModal('delete-repo-modal');
            alert(`Repository '${fullName}' succesvol verwijderd.`);
            loadRepositories();
        } else {
            alert("Fout bij verwijderen: " + data.error);
            btn.disabled = false;
            btn.innerText = 'Definitief Verwijderen';
        }
    } catch (e) {
        alert("Netwerkfout.");
        btn.disabled = false;
        btn.innerText = 'Definitief Verwijderen';
    }
}

async function loadProjects() {
    const projects = await fetchJSON('/projects') || [];
    const list = document.getElementById('projects-list');
    list.innerHTML = '';

    document.getElementById('count-datasources').innerText = projects.length;

    if (projects.length === 0) {
        list.innerHTML = '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: var(--text-muted); opacity: 0.5;">Geen projecten gevonden in ../input/</div>';
        return;
    }

    projects.forEach(project => {
        const displayName = project.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

        const card = document.createElement('div');
        card.className = 'site-card status-local';
        card.innerHTML = `
            <div class="site-card-content">
                <div class="card-header" style="justify-content: space-between;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <i class="fa-solid fa-database" style="font-size:1.2rem; color:var(--warning);"></i>
                        <h4 style="font-weight:700; letter-spacing:0.5px; font-size:1.05rem;">${displayName}</h4>
                    </div>
                    <span class="badge badge-local" style="width:auto; padding:3px 8px;">
                        <i class="fa-solid fa-folder-open"></i> BRON
                    </span>
                </div>

                <div style="display:flex; flex-direction:column; gap:6px; margin-bottom:10px;">
                    <p style="font-size:0.75rem; color:var(--text-muted); margin:0; font-weight:500;">
                        <i class="fa-solid fa-folder" style="width:14px; opacity:0.6;"></i> <code style="font-size:0.7rem; background:rgba(255,255,255,0.05); padding:2px 6px; border-radius:4px;">input/${project}/</code>
                    </p>
                    <p class="project-file-info" data-project="${project}" style="font-size:0.75rem; color:var(--text-muted); margin:0; font-weight:500;">
                        <i class="fa-solid fa-file" style="width:14px; opacity:0.6;"></i> Bestanden laden...
                    </p>
                </div>

                <div style="display:flex; gap:8px; margin-top:auto; padding-top:12px; border-top:1px solid var(--border); flex-wrap:wrap;">
                    <button onclick="useProject('${project}')" class="primary-btn" style="flex:1; min-width:70px; padding:8px; font-size:0.7rem; font-weight:700; display:flex; align-items:center; justify-content:center; gap:5px;">
                        <i class="fa-solid fa-magic"></i> SITE
                    </button>
                    <button onclick="startSiteTypeFromProject('${project}')" class="primary-btn" style="flex:1; min-width:70px; padding:8px; font-size:0.7rem; font-weight:700; background:#00bcd4; display:flex; align-items:center; justify-content:center; gap:5px;" title="Nieuw SiteType Maken van Data">
                        <i class="fa-solid fa-wand-magic-sparkles"></i> SITETYPE
                    </button>
                    <div style="display:flex; gap:6px;">
                        <button onclick="openParserModal('${project}')" class="secondary-btn" style="width:38px; border-color:var(--purple); color:var(--purple);" title="AI Content Parser">
                            <i class="fa-solid fa-robot"></i>
                        </button>
                        <button onclick="openScraperModal('${project}')" class="secondary-btn" style="width:38px; border-color:var(--warning); color:var(--warning);" title="Website Scraper">
                            <i class="fa-solid fa-spider"></i>
                        </button>
                        <button onclick="openImportModal('${project}')" class="secondary-btn" style="width:38px; border-color:var(--accent); color:var(--accent);" title="Data Importeren">
                            <i class="fa-solid fa-file-import"></i>
                        </button>
                        <button onclick="deleteProjectSource('${project}')" class="secondary-btn" style="width:38px; color:var(--error); border-color:var(--error);" title="Project Wissen">
                            <i class="fa-solid fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
        list.appendChild(card);
    });

    // Async: laad bestandsinformatie per project
    document.querySelectorAll('.project-file-info').forEach(async (el) => {
        const project = el.dataset.project;
        const files = await fetchJSON(`/projects/${project}/files`) || [];
        if (files.length === 0) {
            el.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="width:14px; color:var(--error);"></i> <span style="color:var(--error);">Geen bestanden</span>';
        } else {
            const types = files.map(f => f.split('.').pop().toUpperCase());
            const uniqueTypes = [...new Set(types)].slice(0, 4).join(', ');
            el.innerHTML = `<i class="fa-solid fa-file" style="width:14px; opacity:0.6;"></i> ${files.length} bestand${files.length !== 1 ? 'en' : ''} <span style="opacity:0.6;">(${uniqueTypes})</span>`;
        }
    });
}

async function openParserModal(projectName) {
    // Open de tool modal en selecteer project en tool
    await openToolModal('ai-parser');

    // Wacht even tot de modal en project-select geladen zijn
    setTimeout(() => {
        const select = document.getElementById('tool-project-select');
        if (select) {
            select.value = projectName;
            updateToolFileList(); // Refresh file list voor dit project
        }
    }, 100);
}

let currentScraperProject = null;
async function openScraperModal(projectName) {
    currentScraperProject = projectName;
    document.getElementById('scraper-project-name').innerText = projectName;
    document.getElementById('scraper-status').innerText = '';

    // Laad bestandenlijst
    const files = await fetchJSON(`/projects/${projectName}/files`) || [];
    const select = document.getElementById('scraper-file-select');
    select.innerHTML = files.map(f => `<option value="${f}">${f}</option>`).join('');

    // Auto-select urls.txt indien aanwezig
    if (files.includes('urls.txt')) {
        select.value = 'urls.txt';
    }

    // Auto-select urls.txt indien aanwezig
    if (files.includes('urls.txt')) {
        select.value = 'urls.txt';
    }

    openModal('scraper-modal');
}

async function runScraper() {
    const file = document.getElementById('scraper-file-select').value;
    if (!file) return alert("Geen bestand geselecteerd.");

    const status = document.getElementById('scraper-status');
    status.innerText = "⏳ Bezig met scrapen (dit kan even duren)...";

    try {
        const res = await fetch(`${API}/projects/${currentScraperProject}/scrape`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputFile: file })
        });
        const data = await res.json();
        if (data.success) {
            status.innerHTML = `<span style="color: var(--success);">${data.message}</span><br><small style="font-size:0.7rem; color:var(--text-muted);">Gemaakt: scraped-content.txt</small>`;
        } else {
            status.innerHTML = `<span style="color: var(--error);">❌ ${data.error}</span>`;
        }
    } catch (e) { status.innerText = "❌ Netwerkfout."; }
}

function openNewProjectModal() {
    document.getElementById('new-project-name-input').value = '';
    openModal('new-project-modal');
}

async function createNewProject() {
    const name = document.getElementById('new-project-name-input').value.trim();
    if (!name) return alert("Geef een naam op.");

    try {
        const res = await fetch(`${API}/projects/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectName: name })
        });
        const data = await res.json();
        if (data.success) {
            closeModal('new-project-modal');
            loadProjects();
        } else {
            alert("Fout: " + data.error);
        }
    } catch (e) { alert("Netwerkfout."); }
}

async function openCreateDataSourceFromSiteModal() {
    const sites = await fetchJSON('/sites') || [];
    const select = document.getElementById('source-site-select-ds');
    select.innerHTML = sites.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    document.getElementById('target-project-name').value = '';
    const log = document.getElementById('datasource-from-site-log');
    log.classList.add('hidden');
    log.innerText = '';

    openModal('create-datasource-from-site-modal');
}

async function createDataSourceFromSite() {
    const sourceSiteName = document.getElementById('source-site-select-ds').value;
    const targetProjectName = document.getElementById('target-project-name').value.trim();

    if (!targetProjectName) return alert("Geef een naam op voor het nieuwe project.");

    const log = document.getElementById('datasource-from-site-log');
    log.classList.remove('hidden');
    log.innerText = "⏳ Bezig met genereren...";

    // UI Feedback
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerText = "⏳ Bezig...";

    try {
        const res = await fetch(`${API}/projects/create-from-site`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceSiteName, targetProjectName })
        });
        const data = await res.json();

        if (data.success) {
            log.innerHTML = `<span style="color: var(--success);">✅ ${data.message}</span>`;
            setTimeout(() => {
                closeModal('create-datasource-from-site-modal');
                loadProjects();
            }, 2000);
        } else {
            log.innerHTML = `<span style="color: var(--error);">❌ Fout: ${data.error}</span>`;
        }
    } catch (e) {
        log.innerHTML = `<span style="color: var(--error);">❌ Netwerkfout: ${e.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

// --- VIEW: IMPORT / DATA HUB ---
let currentImportProject = null;

function openImportModal(projectName) {
    currentImportProject = projectName;
    document.getElementById('import-project-name').innerText = projectName;

    // Reset inputs & status
    document.getElementById('import-file-input').value = "";
    document.getElementById('text-content-input').value = "";
    document.getElementById('url-content-input').value = "";
    document.getElementById('import-status').innerText = "";

    // Open default tab
    openImportTab(null, 'tab-files');
    openModal('import-modal');
}

function openImportTab(evt, tabName) {
    // Hide all tab content
    const contents = document.getElementsByClassName("tab-content");
    for (let i = 0; i < contents.length; i++) {
        contents[i].style.display = "none";
    }

    // Deactivate all tab links
    const links = document.getElementsByClassName("tab-link");
    for (let i = 0; i < links.length; i++) {
        links[i].className = links[i].className.replace(" active", "");
    }

    // Show current tab and activate button
    document.getElementById(tabName).style.display = "block";
    if (evt) evt.currentTarget.className += " active";
    else document.querySelector(`.tab-link[onclick*='${tabName}']`).className += " active";
}

async function uploadFiles() {
    const input = document.getElementById('import-file-input');
    const status = document.getElementById('import-status');

    if (!input.files || input.files.length === 0) {
        status.innerHTML = '<span class="error">Selecteer eerst bestanden.</span>';
        return;
    }

    const formData = new FormData();
    for (let i = 0; i < input.files.length; i++) {
        formData.append('files', input.files[i]);
    }

    status.innerHTML = '<span class="accent">⏳ Bezig met uploaden...</span>';

    try {
        const res = await fetch(`${API}/projects/${currentImportProject}/upload`, {
            method: 'POST',
            body: formData
        });
        const data = await res.json();

        if (data.success) {
            status.innerHTML = `<span class="success">✅ ${data.message}</span>`;
            setTimeout(() => {
                closeModal('import-modal');
                // Optioneel: refresh lijst als die er is
            }, 1500);
        } else {
            status.innerHTML = `<span class="error">❌ ${data.error}</span>`;
        }
    } catch (e) {
        status.innerHTML = `<span class="error">❌ Netwerkfout: ${e.message}</span>`;
    }
}

async function submitTextData() {
    const text = document.getElementById('text-content-input').value;
    const filename = document.getElementById('text-filename-input').value || 'input.txt';
    const status = document.getElementById('import-status');

    if (!text.trim()) {
        status.innerHTML = '<span class="error">Voer eerst tekst in.</span>';
        return;
    }

    status.innerHTML = '<span class="accent">⏳ Bezig met opslaan...</span>';

    try {
        const res = await fetch(`${API}/projects/${currentImportProject}/add-text`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ text, filename })
        });
        const data = await res.json();

        if (data.success) {
            status.innerHTML = `<span class="success">✅ ${data.message}</span>`;
            setTimeout(() => closeModal('import-modal'), 1500);
        } else {
            status.innerHTML = `<span class="error">❌ ${data.error}</span>`;
        }
    } catch (e) {
        status.innerHTML = `<span class="error">❌ Netwerkfout: ${e.message}</span>`;
    }
}

async function submitUrlData() {
    const urls = document.getElementById('url-content-input').value;
    const status = document.getElementById('import-status');

    if (!urls.trim()) {
        status.innerHTML = '<span class="error">Voer eerst URL\'s in.</span>';
        return;
    }

    status.innerHTML = '<span class="accent">⏳ URLs verwerken...</span>';

    try {
        const res = await fetch(`${API}/projects/${currentImportProject}/save-urls`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ urls })
        });
        const data = await res.json();

        if (data.success) {
            status.innerHTML = `<span class="success">✅ ${data.message}</span>`;
            setTimeout(() => closeModal('import-modal'), 1500);
        } else {
            status.innerHTML = `<span class="error">❌ ${data.error}</span>`;
        }
    } catch (e) {
        status.innerHTML = `<span class="error">❌ Netwerkfout: ${e.message}</span>`;
    }
}

async function deleteProjectSource(projectName) {
    if (!confirm(`⚠️ WEET JE HET ZEKER?\n\nJe staat op het punt de BRON DATA van '${projectName}' (../input/) definitief te verwijderen.`)) return;

    try {
        const res = await fetch(`${API}/projects/${projectName}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleteSite: false, deleteData: true, deleteRemote: false })
        });
        const data = await res.json();
        if (data.success) {
            alert(`Project data '${projectName}' verwijderd!`);
            loadProjects();
        } else {
            alert("Fout: " + data.error);
        }
    } catch (e) { alert("Netwerkfout."); }
}

function useProject(projectName) {
    showSection('create', document.querySelector('button[onclick*="create"]'));
    setTimeout(() => {
        const select = document.getElementById('project-select');
        if (select) {
            select.value = projectName;
        }
    }, 100);
}

async function startSiteTypeFromProject(projectName) {
    // 1. Ga naar de SiteType sectie
    showSection('sitetypes', document.querySelector('button[onclick*="sitetypes"]'));
    showSitetypeTab('basic');

    // 2. Vul de naam in (suggestie)
    document.getElementById('sitetype-name').value = `${projectName}-type`;

    // 3. Haal de content op en vul de beschrijving
    const descField = document.getElementById('sitetype-description');
    const businessField = document.getElementById('sitetype-business');

    descField.value = "Laden van project data...";
    businessField.value = "Laden van project data...";

    try {
        const res = await fetch(`${API}/projects/${projectName}/content`);
        const data = await res.json();

        descField.value = `SiteType gebaseerd op project '${projectName}'.`;

        if (data.content && data.content.length > 50) {
            // Beperk de lengte voor de UI, maar de AI krijgt alles als we dat willen
            // Voor nu zetten we het direct in het veld zodat de gebruiker het kan zien/editten
            businessField.value = `CONTEXT VAN PROJECT '${projectName}':\n\n${data.content.substring(0, 5000)}`;
            if (data.content.length > 5000) businessField.value += "\n... (ingekort)";
        } else {
            businessField.value = `Project '${projectName}' bevat weinig tekst. Vul hier handmatig de bedrijfsomschrijving aan.`;
        }
    } catch (e) {
        businessField.value = `Fout bij laden data: ${e.message}`;
    }
}

async function loadTodo() {
    // 1. Load Roadmaps (Tracks)
    const roadmapsData = await fetchJSON('/roadmaps');
    const menu = document.getElementById('roadmap-menu');
    const activeView = document.getElementById('active-roadmap');
    
    if (roadmapsData && roadmapsData.tracks) {
        menu.classList.remove('hidden');
        activeView.classList.add('hidden');
        menu.innerHTML = '';
        
        roadmapsData.tracks.forEach(track => {
            const card = document.createElement('div');
            card.className = 'tool-card';
            card.onclick = () => showRoadmapTrack(track);
            card.innerHTML = `
                <div class="card-header">
                    <i class="fa-solid fa-route accent"></i>
                    <div class="flex-row gap-5">
                        <span class="badge" style="font-size:0.6rem; opacity:0.8;">${track.difficulty}</span>
                        <span class="badge" style="font-size:0.6rem; opacity:0.8;">${track.time}</span>
                    </div>
                </div>
                <h4 style="margin-top:10px;">${track.title}</h4>
                <p class="small muted">${track.description}</p>
            `;
            menu.appendChild(card);
        });
    }

    // 2. Load General TODO
    const data = await fetchJSON('/todo');
    const container = document.getElementById('todo-content');
    if (data && data.content) {
        // Simpele rendering van markdown naar HTML (basis)
        let html = data.content
            .replace(/^# (.*$)/gim, '<h1 style="color:#fff; margin-bottom:20px;">$1</h1>')
            .replace(/^## (.*$)/gim, '<h2 style="color:var(--accent); margin-top:30px; margin-bottom:15px; border-bottom:1px solid var(--border); padding-bottom:5px;">$1</h2>')
            .replace(/^- \[ \] (.*$)/gim, '<div style="margin-bottom:10px;"><i class="fa-regular fa-square" style="margin-right:10px; opacity:0.5;"></i> $1</div>')
            .replace(/^- \[x\] (.*$)/gim, '<div style="margin-bottom:10px; color:var(--success);"><i class="fa-solid fa-square-check" style="margin-right:10px;"></i> <strike>$1</strike></div>');
        container.innerHTML = html;
    } else {
        container.innerText = "Kon de roadmap niet laden.";
    }
}

function showRoadmapTrack(track) {
    const menu = document.getElementById('roadmap-menu');
    const activeView = document.getElementById('active-roadmap');
    const content = document.getElementById('roadmap-content');
    
    menu.classList.add('hidden');
    activeView.classList.remove('hidden');
    
    content.innerHTML = `
        <div class="track-header mb-20">
            <h2 class="mb-5 text-accent">${track.title}</h2>
            <div class="flex-row gap-15 mb-15">
                <span class="badge" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-muted);">
                    <i class="fa-solid fa-gauge-high mr-5"></i> ${track.difficulty}
                </span>
                <span class="badge" style="background: rgba(255,255,255,0.05); border: 1px solid var(--border); color: var(--text-muted);">
                    <i class="fa-solid fa-clock mr-5"></i> ${track.time}
                </span>
            </div>
            <p class="muted">${track.description}</p>
        </div>

        <div class="steps-list">
            ${track.steps.map((step, idx) => `
                <div class="step-card-wrap mb-15">
                    <div class="step-box bg-surface p-15 rounded-xl border border-border" 
                         ${step.details ? `onclick="this.parentElement.classList.toggle('is-expanded')" style="cursor:pointer;"` : ''}>
                        <div class="flex-row align-center justify-between">
                            <div class="flex-row align-center gap-15">
                                <span class="step-num" style="background:var(--accent); color:#000; width:28px; height:24px; border-radius:6px; display:flex; align-items:center; justify-content:center; font-weight:800; font-size:0.8rem;">${idx + 1}</span>
                                <h4 style="margin:0; font-size:1.05rem;">${step.title}</h4>
                            </div>
                            ${step.details ? '<i class="fa-solid fa-chevron-down muted expand-icon transition-all" style="font-size:0.8rem;"></i>' : ''}
                        </div>
                        <p class="small muted mt-10 ml-40">${step.description}</p>
                        
                        <div class="step-extra-content ml-40 overflow-hidden transition-all" style="max-height: 0; opacity: 0;">
                            <div class="pt-15 pb-5">
                                <div class="p-15 bg-darker rounded-lg border border-border/50 text-sm leading-relaxed" style="border-left: 3px solid var(--accent);">
                                    ${step.details}
                                </div>
                                ${step.action ? `
                                    <button onclick="${step.action}; event.stopPropagation();" class="primary-btn mt-15" style="padding:8px 15px; font-size:0.75rem; font-weight:700;">
                                        <i class="fa-solid fa-arrow-right-to-bracket"></i> START DEZE STAP
                                    </button>
                                ` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function backToRoadmapMenu() {
    document.getElementById('roadmap-menu').classList.remove('hidden');
    document.getElementById('active-roadmap').classList.add('hidden');
}

// --- MODALS ---
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('hidden');
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('hidden');
}

// --- VIEW: sites ---
async function loadSites() {
    const projects = await fetchJSON('/projects') || [];
    const sites = await fetchJSON('/sites') || [];

    // NIEUW: Haal actieve servers op om status op cards te tonen
    let activeServers = [];
    try {
        const activeRes = await fetchJSON('/servers/active');
        activeServers = activeRes?.servers || [];
    } catch (e) {
        console.error("Fout bij ophalen actieve servers:", e);
    }

    document.getElementById('count-projects').innerText = projects.length;
    document.getElementById('count-sites').innerText = sites.filter(s => s.status === 'live').length;

    const list = document.getElementById('sites-list');
    list.innerHTML = '';

    if (sites.length === 0) {
        list.innerHTML = '<div style="grid-column: 1/-1; padding: 50px; text-align: center; color: var(--text-muted); opacity: 0.5;">Geen sites gevonden in sites/</div>';
        return;
    }

    sites.forEach(site => {
        const name = site.name || (typeof site === 'string' ? site : 'Onbekend');
        const status = (site.status || 'local').toLowerCase();
        const liveUrl = site.deployData?.liveUrl;

        const activeServer = activeServers.find(s => s.siteName === name);
        const isRunning = !!activeServer;

        const card = document.createElement('div');
        card.className = `site-card status-${status} ${isRunning ? 'is-running' : ''}`;

        // --- BADGES LOGIC ---
        let badgesHtml = '';
        if (isRunning) {
            badgesHtml += `
                <a href="${activeServer.url}" target="_blank" onclick="event.stopPropagation()" class="badge badge-local clickable" title="Open preview: http://localhost:${activeServer.port}">
                    <i class="fa-solid fa-rocket"></i> ACTIVE
                </a>`;
        } else if (status === 'local') {
            badgesHtml += `<span class="badge badge-local"><i class="fa-solid fa-code"></i> LOCAL</span>`;
        }

        if (status === 'live' && liveUrl) {
            badgesHtml += `
                <a href="${liveUrl}" target="_blank" onclick="event.stopPropagation()" class="badge badge-live clickable" title="Live Site">
                    <i class="fa-solid fa-globe"></i> LIVE
                </a>`;
        } else if (status === 'live') {
            badgesHtml += `<span class="badge badge-live"><i class="fa-solid fa-globe"></i> LIVE</span>`;
        }

        const emptyBadgeHtml = site.isDataEmpty ? `<span class="badge badge-error" style="padding:2px 6px; font-size:0.5rem;" title="Geen data gevonden!"><i class="fa-solid fa-triangle-exclamation"></i> EMPTY</span>` : '';

        card.innerHTML = `
            <div class="site-card-content">
                <div class="card-header" style="justify-content: space-between;">
                    <div style="display:flex; align-items:center; gap:10px;">
                         ${isRunning ? '<span class="status-dot pulse" style="background:#4ade80;"></span>' : ''}
                         <h4 style="font-weight:700; letter-spacing:0.5px; font-size:1.1rem;">${name}</h4>
                    </div>
                    <div class="card-badges" style="display:flex; gap:5px;">
                        ${badgesHtml}
                    </div>
                </div>
                
                <p style="font-size: 0.75rem; color: var(--text-muted); min-height: 1.2em; line-height: 1.4; font-weight: 500; margin-bottom:10px;">
                    ${isRunning ? `<span style="color:#4ade80; font-weight:700;">Online (Port ${activeServer.port})</span>` : (status === 'live' ? 'Gepubliceerd via GitHub Pages' : 'Lokaal project')}
                    ${emptyBadgeHtml}
                </p>

                <div class="site-actions-grid">
                    <!-- Row 1: Build (The Action Loop) -->
                    <div class="action-row">
                        <button onclick="previewSite('${name}', event, ${isRunning})" class="action-btn execution-btn ${isRunning ? 'active-glow' : ''}" title="${isRunning ? 'Open preview' : 'Start dev server'}">
                            <i class="fa-solid ${isRunning ? 'fa-external-link' : 'fa-play'}"></i> <span>${isRunning ? 'OPEN' : 'DEV'}</span>
                        </button>
                        <button onclick="openDockForSite('${name}', event)" class="action-btn dock-btn" title="Open Athena Dock">
                            <i class="fa-solid fa-anchor"></i> <span>DOCK</span>
                        </button>
                        <button onclick="openMediaVisualizerForSite('${name}', event)" class="action-btn media-btn" style="color: #e91e63;" title="Visual Media Mapper">
                            <i class="fa-solid fa-images"></i> <span>MEDIA</span>
                        </button>
                        <button onclick="stopSiteServerFromCard('${name}', ${isRunning ? activeServer.port : 0}, event)" class="action-btn stop-btn" ${isRunning ? '' : 'disabled'} title="Stop dev server">
                            <i class="fa-solid fa-stop"></i> <span>STOP</span>
                        </button>
                    </div>
                    
                    <!-- Row 2: Content (Data & AI) -->
                    <div class="action-row">
                        <button onclick="openToolModal('data-injector'); setTimeout(() => { document.getElementById('tool-project-select').value = '${name}'; }, 100);" class="action-btn sync-btn" style="color: var(--purple);">
                            <i class="fa-solid fa-bolt"></i> <span>SYNC</span>
                        </button>
                        <button onclick="openSheetModal('${name}', event)" class="action-btn data-btn">
                            <i class="fa-solid fa-database"></i> <span>DATA</span>
                        </button>
                        <button onclick="generateBlogUI('${name}', event)" class="action-btn blog-btn" style="color: #ff9800;" title="AI Blog Genereren">
                            <i class="fa-solid fa-pen-nib"></i> <span>BLOG</span>
                        </button>
                        <button onclick="generateSEO('${name}', event)" class="action-btn seo-btn" style="color: #00bcd4;" title="AI SEO Optimalisatie">
                            <i class="fa-solid fa-magnifying-glass-chart"></i> <span>SEO</span>
                        </button>
                    </div>

                    <!-- Row 3: Project (Config & Finalize) -->
                    <div class="action-row">
                        <button onclick="openVariantModal('${name}', event)" class="action-btn style-btn" style="color: var(--accent);">
                            <i class="fa-solid fa-palette"></i> <span>STIJL</span>
                        </button>
                        <button onclick="openSettingsModal('${name}', '${status}', '${site.deployData?.liveUrl || ''}', '${site.deployData?.repoUrl || ''}', event)" class="action-btn settings-btn">
                            <i class="fa-solid fa-sliders"></i> <span>INSTEL.</span>
                        </button>
                        <button onclick="goToDeployForSite('${name}', event)" class="action-btn deploy-btn" style="background: rgba(76, 175, 80, 0.05); border-color: var(--success); color: var(--success);" title="Naar Deployment">
                            <i class="fa-solid fa-cloud-arrow-up"></i> <span>DEPLOY</span>
                        </button>
                    </div>
                </div>
            </div>
        `;

        card.onclick = (e) => {
            if (e.target.closest('button') || e.target.closest('a')) return;
        };
        list.appendChild(card);
    });
}

function openDockForSite(name, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    // Voor nu hergebruiken we openDock, maar we kunnen later site-focus toevoegen
    openDock();
}

function goToDeployForSite(name, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    showSection('deploy', document.querySelector('button[onclick*="deploy"]'));
    // Optioneel: vul de site-naam in als dat veld bestaat
}

// --- VIEW: VARIANT GENERATOR ---
let currentVariantSite = null;

async function openVariantModal(siteName, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    currentVariantSite = siteName;
    document.getElementById('variant-site-name').innerText = siteName;
    document.getElementById('variant-log').innerText = '';

    // Fetch theme info from API
    try {
        const data = await fetchJSON(`/sites/${siteName}/theme-info`);
        const currentTheme = data.currentTheme || 'onbekend';
        document.getElementById('variant-current-theme').innerText = currentTheme;

        const list = document.getElementById('variant-theme-list');
        list.innerHTML = data.themes.map(theme => {
            const isCurrent = theme === currentTheme;
            return `
                <label style="display: flex; align-items: center; gap: 10px; padding: 8px 12px; background: ${isCurrent ? 'rgba(0,122,204,0.1)' : 'var(--surface)'}; border-radius: 8px; border: 1px solid ${isCurrent ? 'var(--accent)' : 'var(--border)'}; cursor: ${isCurrent ? 'default' : 'pointer'};">
                    <input type="checkbox" value="${theme}" class="variant-theme-check" ${isCurrent ? 'disabled' : 'checked'}>
                    <span style="font-weight: ${isCurrent ? '800' : '500'}; color: ${isCurrent ? 'var(--accent)' : 'var(--text)'};">🎨 ${theme}${isCurrent ? ' (huidig)' : ''}</span>
                </label>
            `;
        }).join('');
    } catch (e) {
        document.getElementById('variant-current-theme').innerText = 'Fout bij laden';
    }

    openModal('variant-modal');
}

function toggleAllVariantThemes() {
    const checks = document.querySelectorAll('.variant-theme-check:not(:disabled)');
    const allChecked = [...checks].every(c => c.checked);
    checks.forEach(c => c.checked = !allChecked);
}

async function generateVariantsDashboard() {
    if (!currentVariantSite) return;

    const checks = document.querySelectorAll('.variant-theme-check:checked:not(:disabled)');
    const selectedStyles = [...checks].map(c => c.value);

    if (selectedStyles.length === 0) {
        document.getElementById('variant-log').innerHTML = '<span style="color: var(--error);">Selecteer minstens één stijl.</span>';
        return;
    }

    const log = document.getElementById('variant-log');
    log.innerHTML = '<span style="color: var(--accent);">⏳ Varianten worden gegenereerd...</span>';

    try {
        const res = await fetch(`${API}/sites/${currentVariantSite}/generate-variants`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ styles: selectedStyles })
        });
        const data = await res.json();

        if (data.success) {
            const details = data.details ? `<br><pre style="font-size: 0.7rem; color: var(--text-muted); white-space: pre-wrap; margin-top: 10px;">${data.details}</pre>` : '';
            log.innerHTML = `<span style="color: var(--success);">✅ ${data.message}</span>${details}`;
            // Refresh sites list after 2 seconds
            setTimeout(() => loadSites(), 2000);
        } else {
            log.innerHTML = `<span style="color: var(--error);">❌ ${data.error}</span>`;
        }
    } catch (e) {
        log.innerHTML = `<span style="color: var(--error);">❌ Netwerkfout: ${e.message}</span>`;
    }
}

// --- MARKETING ACTIONS ---
async function generateSEO(name, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    
    if (!confirm(`Wil je AI SEO metadata genereren voor '${name}'? Dit synchroniseert ook direct naar de Google Sheet.`)) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>...</span>';

    try {
        const res = await fetch(`${API}/marketing/generate-seo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectName: name })
        });
        const data = await res.json();
        if (data.success) {
            alert(`✅ SEO Metadata gegenereerd!\n\nTitel: ${data.seo.title}\nDescription: ${data.seo.description}`);
        } else {
            alert(`❌ Fout: ${data.error}`);
        }
    } catch (e) {
        alert(`❌ Netwerkfout: ${e.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

async function generateBlogUI(name, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;

    const topic = prompt("Waarover moet de blog gaan?", "De toekomst van AI in webdesign");
    if (!topic) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> <span>...</span>';

    try {
        const res = await fetch(`${API}/marketing/generate-blog`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectName: name, topic })
        });
        const data = await res.json();
        if (data.success) {
            alert(`✅ Blog gegenereerd: ${data.blog.title}`);
        } else {
            alert(`❌ Fout: ${data.error}`);
        }
    } catch (e) {
        alert(`❌ Netwerkfout: ${e.message}`);
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

async function openMediaVisualizerForSite(name, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    if (!systemConfig) await loadSystemConfig();
    const port = systemConfig.ports.media;

    // Set de actieve site in de visualizer backend
    await fetch(`${API}/set-site`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ site: name })
    });

    // Start de server
    fetch(`${API}/start-media-server`, { method: 'POST' });

    setTimeout(() => {
        window.open(`http://${window.location.hostname}:${port}`, '_blank');
    }, 1000);
}

// --- VIEW: CREATE ---
async function loadCreateForm() {
    const projects = await fetchJSON('/projects') || [];
    const types = await fetchJSON('/sitetypes') || [];
    const styles = await fetchJSON('/styles') || [];

    const projectSelect = document.getElementById('project-select');
    const siteNameInput = document.getElementById('site-name-input');

    projectSelect.innerHTML = projects.map(p => `<option value="${p}">${p}</option>`).join('');

    // Sync Site Name with Project selection by default
    projectSelect.onchange = (e) => {
        if (!siteNameInput.getAttribute('data-manual')) {
            siteNameInput.value = e.target.value;
        }
        loadLayouts(typeSelect.value); // Keep layout loading
    };

    siteNameInput.oninput = () => {
        siteNameInput.setAttribute('data-manual', 'true');
    };

    const typeSelect = document.getElementById('sitetype-select');
    typeSelect.innerHTML = types.map(t => `<option value="${t.name || t}">${t.name || t} ${t.track ? `(${t.track})` : ''}</option>`).join('');

    if (types.length > 0) {
        const firstType = types[0].name || types[0];
        loadLayouts(firstType);
    }

    // Wrap the existing onchange to handle layout loading
    const originalTypeChange = typeSelect.onchange;
    typeSelect.onchange = (e) => {
        loadLayouts(e.target.value);
        if (originalTypeChange) originalTypeChange(e);
    };

    document.getElementById('style-select').innerHTML = styles.map(s => `<option value="${s}">${s}</option>`).join('');

    // Trigger initial sync
    if (projects.length > 0 && !siteNameInput.value) {
        siteNameInput.value = projects[0];
    }
}

async function loadLayouts(sitetype) {
    const layouts = await fetchJSON(`/layouts/${sitetype}`) || [];
    document.getElementById('layout-select').innerHTML = layouts.map(l => `<option value="${l}">${l}</option>`).join('');
}

window.toggleEmailField = () => {
    const check = document.getElementById('autosheet-check');
    const field = document.getElementById('email-field');
    if (check.checked) field.classList.remove('hidden');
    else field.classList.add('hidden');
};

let lastCreatedProject = null;

document.getElementById('create-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button[type="submit"]');
    const log = document.getElementById('create-log');
    const postActions = document.getElementById('create-post-actions');
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());

    lastCreatedProject = data.projectName;

    // Fix voor boolean waarden
    data.autoSheet = document.getElementById('autosheet-check').checked;

    btn.disabled = true; btn.innerText = "⏳ Bezig met genereren...";
    log.innerText = "Factory Pipeline gestart...";
    postActions.classList.add('hidden');

    try {
        const res = await fetch(`${API}/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        log.innerText = result.success ? `✅ ${result.message}` : `❌ Fout: ${result.error}`;

        if (result.success) {
            postActions.classList.remove('hidden');
            loadSites();
        }
    } catch (err) { log.innerText = `❌ Fout: ${err.message}`; }
    btn.disabled = false; btn.innerText = "🚀 Start Factory Pipeline";
};

// Handler voor de directe sync knop na creatie
document.getElementById('create-sync-btn').onclick = async () => {
    if (!lastCreatedProject) return;

    const btn = document.getElementById('create-sync-btn');
    const originalText = btn.innerHTML;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Bezig met synchroniseren...';

    try {
        const res = await fetch(`${API}/run-script`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                script: 'sync-tsv-to-json.js',
                args: [lastCreatedProject]
            })
        });
        const data = await res.json();
        if (data.success) {
            btn.innerHTML = '<i class="fa-solid fa-check"></i> DATA GEÏNJECTEERD!';
            btn.style.background = 'var(--success)';
            setTimeout(() => {
                showSection('sites');
            }, 1500);
        } else {
            alert("Sync mislukt: " + data.error);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (e) {
        alert("Netwerkfout: " + e.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
};

// --- VIEW: DEPLOY ---
async function loadDeployForm() {
    const sites = await fetchJSON('/sites') || [];
    document.getElementById('deploy-project-select').innerHTML = sites.map(s => {
        const name = s.name || (typeof s === 'string' ? s : 'Onbekend');
        return `<option value="${name}">${name}</option>`;
    }).join('');
}

document.getElementById('deploy-form').onsubmit = async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const log = document.getElementById('deploy-log');
    const formData = new FormData(e.target);

    btn.disabled = true; btn.innerText = "⏳ Bezig met deployment...";
    try {
        const res = await fetch(`${API}/deploy`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(Object.fromEntries(formData))
        });
        const result = await res.json();
        if (result.success) {
            log.innerHTML = `✅ Succes! Live URL: <a href="${result.result.liveUrl}" target="_blank" style="color: var(--success); text-decoration: underline;">${result.result.liveUrl}</a>`;
            loadSites();
        } else {
            log.innerText = `❌ Fout: ${result.error}`;
        }
    } catch (err) { log.innerText = `❌ Fout: ${err.message}`; }
    btn.disabled = false; btn.innerText = "☁️ Start Workflow";
};

// --- VIEW: SITE SETTINGS ---
let currentEditingSite = null;
function openSettingsModal(name, status, liveUrl, repoUrl, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    currentEditingSite = name;
    document.getElementById('settings-site-name').innerText = name;
    document.getElementById('settings-status').value = status;
    document.getElementById('settings-live-url').value = liveUrl;
    document.getElementById('settings-repo-url').value = repoUrl;
    openModal('settings-modal');
}

async function previewSite(name, event, isRunning = false) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    const btn = event ? event.target.closest('button') : null;
    if (!btn) return;

    const originalText = isRunning ? '<i class="fa-solid fa-external-link"></i> OPEN' : '<i class="fa-solid fa-play"></i> DEV';

    // 0. Re-open logic (Snelste pad)
    if (isRunning) {
        try {
            // We halen de actuele URL op via de preview endpoint (die geeft de URL terug als hij al draait)
            const res = await fetch(`${API}/sites/${name}/preview`, { method: 'POST' });
            const data = await res.json();
            if (data.url) {
                window.open(data.url, '_blank');
            }
        } catch (e) {
            console.error("Fout bij heropenen tab:", e);
        }
        return;
    }

    // 1. Check Status
    btn.disabled = true;
    try {
        const statusRes = await fetch(`${API}/sites/${name}/status`);
        const status = await statusRes.json();

        if (status.isInstalling) {
            btn.innerHTML = '<i class="fa-solid fa-sync fa-spin"></i> Bezig...';
            waitForInstall(name, btn, originalText);
            return;
        }

        if (!status.isInstalled) {
            btn.innerHTML = '📦 Installeren...';
            await startInstall(name, btn, originalText);
            return;
        }

        // 2. Start Preview (als alles geïnstalleerd is)
        btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Starten...';

        const res = await fetch(`${API}/sites/${name}/preview`, { method: 'POST' });
        const data = await res.json();

        if (data.success) {
            setTimeout(() => {
                window.open(data.url, '_blank');
                btn.disabled = false;
                btn.innerHTML = originalText;
                loadSites();
            }, 3000);
        } else {
            alert("Fout: " + data.error);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }

    } catch (e) {
        alert("Fout: " + e.message);
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function startInstall(name, btn, originalText) {
    try {
        const res = await fetch(`${API}/sites/${name}/install`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            waitForInstall(name, btn, originalText);
        } else {
            alert("Installatie fout: " + data.error);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    } catch (e) {
        alert("Kon installatie niet starten.");
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

function waitForInstall(name, btn, originalText) {
    const interval = setInterval(async () => {
        try {
            const res = await fetch(`${API}/sites/${name}/status`);
            const status = await res.json();

            if (!status.isInstalling) {
                clearInterval(interval);
                if (status.isInstalled) {
                    // Klaar! Start nu automatisch de preview
                    previewSite(name, null, btn);
                } else {
                    btn.innerText = "❌ Mislukt";
                    setTimeout(() => {
                        btn.disabled = false;
                        btn.innerHTML = originalText;
                    }, 2000);
                }
            } else {
                // Nog bezig... update tekst evt
                btn.innerHTML = '<i class="fa-solid fa-cog fa-spin"></i> Installeren...';
            }
        } catch (e) {
            clearInterval(interval);
            btn.disabled = false;
            btn.innerHTML = originalText;
        }
    }, 2000);
}

async function saveSiteSettings() {
    const data = {
        projectName: currentEditingSite,
        status: document.getElementById('settings-status').value,
        liveUrl: document.getElementById('settings-live-url').value,
        repoUrl: document.getElementById('settings-repo-url').value
    };

    try {
        const res = await fetch(`${API}/sites/update-deployment`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        const result = await res.json();
        if (result.success) {
            closeModal('settings-modal');
            loadSites();
        }
    } catch (e) { alert("Error: " + e.message); }
}

async function renameProject() {
    const oldName = currentEditingSite;
    const newName = document.getElementById('settings-new-name').value.trim();
    if (!newName) return alert("Geef een nieuwe naam op.");
    if (!confirm(`Weet je zeker dat je '${oldName}' wilt hernoemen?`)) return;

    try {
        const res = await fetch(`${API}/projects/${oldName}/rename`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ newName })
        });
        const data = await res.json();
        if (data.success) {
            alert(data.message);
            location.reload();
        } else {
            alert("Fout: " + data.error);
        }
    } catch (e) { alert("Netwerkfout."); }
}

async function openCreateSitetypeFromSiteModal() {
    const sites = await fetchJSON('/sites') || [];
    const select = document.getElementById('source-site-select');
    select.innerHTML = sites.map(s => `<option value="${s.name}">${s.name}</option>`).join('');

    document.getElementById('target-sitetype-name').value = '';
    const log = document.getElementById('sitetype-from-site-log');
    log.classList.add('hidden');
    log.innerText = '';

    openModal('create-sitetype-from-site-modal');
}

async function createSitetypeFromSite() {
    const sourceSiteName = document.getElementById('source-site-select').value;
    const targetSitetypeName = document.getElementById('target-sitetype-name').value.trim();

    if (!targetSitetypeName) return alert("Geef een naam op voor het nieuwe sitetype.");

    const log = document.getElementById('sitetype-from-site-log');
    log.classList.remove('hidden');
    log.innerText = "⏳ Bezig met genereren...";

    // UI Feedback
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerText = "⏳ Bezig...";

    try {
        const res = await fetch(`${API}/sitetype/create-from-site`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sourceSiteName, targetSitetypeName })
        });
        const data = await res.json();

        if (data.success) {
            log.innerHTML = `<span style="color: var(--success);">✅ ${data.message}</span>`;
            setTimeout(() => {
                closeModal('create-sitetype-from-site-modal');
                loadSiteTypes();
            }, 2000);
        } else {
            log.innerHTML = `<span style="color: var(--error);">❌ Fout: ${data.error}</span>`;
        }
    } catch (e) {
        log.innerHTML = `<span style="color: var(--error);">❌ Netwerkfout: ${e.message}</span>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = originalText;
    }
}

async function deleteProjectPart(part) {
    const name = currentEditingSite;
    let confirmMsg = "";
    const flags = { deleteSite: false, deleteData: false, deleteRemote: false };

    if (part === 'site') {
        confirmMsg = `Wil je de gegenereerde SITE map (sites/${name}) definitief verwijderen?`;
        flags.deleteSite = true;
    } else if (part === 'data') {
        confirmMsg = `Wil je de bron DATA map (../input/${name}) definitief verwijderen?`;
        flags.deleteData = true;
    } else if (part === 'remote') {
        confirmMsg = `⚠️ LET OP: Wil je de remote GITHUB REPOSITORY van '${name}' definitief verwijderen? Dit kan niet ongedaan worden gemaakt!`;
        flags.deleteRemote = true;
    }

    if (!confirm(confirmMsg)) return;

    // We pakken de knop die geklikt is voor de loading state
    const btn = event.currentTarget;
    const originalContent = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Bezig...';

    try {
        const res = await fetch(`${API}/projects/${name}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(flags)
        });
        const data = await res.json();

        if (data.success) {
            alert(`Project onderdelen voor '${name}' verwijderd!\n\nLogs:\n` + data.logs.join('\n'));
            // Alleen herladen als we de site zelf hebben verwijderd of als alles weg is
            if (flags.deleteSite || flags.deleteData) {
                location.reload();
            } else {
                btn.disabled = false;
                btn.innerHTML = originalContent;
                loadSites();
            }
        } else {
            alert("Fout bij verwijderen: " + data.error);
            btn.disabled = false;
            btn.innerHTML = originalContent;
        }
    } catch (e) {
        alert("Netwerkfout: " + e.message);
        btn.disabled = false;
        btn.innerHTML = originalContent;
    }
}

// Oude functie behouden voor compatibiliteit indien nodig (maar niet meer aangeroepen door nieuwe UI)
async function deleteProject() {
    const name = currentEditingSite;
    if (!confirm(`⚠️ WEET JE HET ZEKER?\n\nJe staat op het punt '${name}' te verwijderen.\nDit kan niet ongedaan worden gemaakt.`)) return;

    const deleteSite = confirm("1. Wil je de gegenereerde SITE map (sites/) verwijderen?");
    const deleteData = confirm("2. Wil je de bron DATA map (../input/) verwijderen?");
    const deleteRemote = confirm("3. Wil je ook de remote GITHUB REPO verwijderen? (⚠️ Destructief!)");

    if (!deleteSite && !deleteData && !deleteRemote) return alert("Geen actie geselecteerd. Niets verwijderd.");

    try {
        const res = await fetch(`${API}/projects/${name}/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ deleteSite, deleteData, deleteRemote })
        });
        const data = await res.json();

        if (data.success) {
            alert(`Project '${name}' verwijderd!\n\nLogs:\n` + data.logs.join('\n'));
            location.reload();
        } else {
            alert("Fout bij verwijderen: " + data.error);
        }
    } catch (e) {
        alert("Netwerkfout: " + e.message);
    }
}

// --- VIEW: SHEET MANAGEMENT ---
let currentSheetProject = null;
async function openSheetModal(name, event) {
    if (event) { event.preventDefault(); event.stopPropagation(); }
    currentSheetProject = name;

    // Reset UI
    document.getElementById('modal-project-name').innerText = name;
    document.getElementById('sheet-status').innerText = "";
    document.getElementById('sa-email-display').innerText = "📡 Laden...";
    document.getElementById('sheet-url-input').value = ""; // Veld leegmaken!

    openModal('sheet-modal');

    // Haal config en eventueel bestaande sheet op
    try {
        const config = await fetchJSON('/config');
        document.getElementById('sa-email-display').innerText = config.serviceAccountEmail || "...";

        // Zoek de site in de lijst en vul URL in indien aanwezig
        const sites = await fetchJSON('/sites');
        const site = sites.find(s => s.name === name);
        if (site && site.sheetUrl) {
            document.getElementById('sheet-url-input').value = site.sheetUrl;
            document.getElementById('sheet-status').innerText = "✅ Reeds gekoppeld";
        }
    } catch (e) { }
}

function copySAEmail() {
    const email = document.getElementById('sa-email-display').innerText;
    navigator.clipboard.writeText(email).then(() => {
        document.getElementById('sheet-status').innerText = "📋 E-mail gekopieerd!";
        setTimeout(() => document.getElementById('sheet-status').innerText = "", 2000);
    });
}

async function saveSheetLink() {
    const sheetUrl = document.getElementById('sheet-url-input').value;
    const status = document.getElementById('sheet-status');
    if (!sheetUrl) return status.innerText = "⚠️ Voer een URL in.";
    status.innerText = "⏳ Koppelen...";
    try {
        const res = await fetch(`${API}/projects/${currentSheetProject}/link-sheet`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sheetUrl })
        });
        const data = await res.json();
        status.innerText = data.success ? "✅ Gekoppeld!" : "❌ " + data.error;
    } catch (e) { status.innerText = "❌ Fout."; }
}

async function autoProvisionSheet() {
    const status = document.getElementById('sheet-status');
    if (!confirm(`Wil je automatisch een nieuwe Google Sheet laten aanmaken voor '${currentSheetProject}'?`)) return;

    status.innerText = "⏳ Bezig met aanmaken...";
    try {
        const res = await fetch(`${API}/projects/${currentSheetProject}/auto-provision`, { method: 'POST' });
        const data = await res.json();
        if (data.success) {
            status.innerText = "🎉 Sheet aangemaakt! Pagina wordt herladen...";
            setTimeout(() => location.reload(), 2000);
        } else {
            status.innerText = "❌ Fout: " + data.error;
        }
    } catch (e) { status.innerText = "❌ Netwerkfout."; }
}

async function pushToSheet() {
    if (!confirm("Weet je het zeker? Dit pusht alle lokale JSON data naar de Google Sheet en kan tabbladen aanmaken.")) return;
    const status = document.getElementById('sheet-status');
    status.innerText = "🚀 Push Sync bezig...";
    try {
        const res = await fetch(`${API}/sync-to-sheets/${currentSheetProject}`, { method: 'POST' });
        const data = await res.json();
        status.innerText = data.success ? "✅ Push Sync Voltooid!" : "❌ " + data.error;
    } catch (e) { status.innerText = "❌ Fout."; }
}

async function pullFromSheet() {
    if (!confirm("Dit overschrijft je lokale JSON bestanden met de data uit de Google Sheet. Weet je het zeker?")) return;
    const status = document.getElementById('sheet-status');
    status.innerText = "📥 Data ophalen uit Sheet...";
    try {
        const res = await fetch(`${API}/pull-from-sheets/${currentSheetProject}`, { method: 'POST' });
        const data = await res.json();
        status.innerText = data.success ? "✅ Lokale JSON bijgewerkt!" : "❌ " + data.error;
    } catch (e) { status.innerText = "❌ Fout."; }
}

async function reverseSync() {
    document.getElementById('sheet-status').innerText = "⏳ JSON ➔ TSV...";
    try {
        const res = await fetch(`${API}/projects/${currentSheetProject}/reverse-sync`, { method: 'POST' });
        const data = await res.json();
        document.getElementById('sheet-status').innerText = data.success ? "✅ JSON ➔ TSV Klaar" : "❌ Fout";
    } catch (e) { }
}

async function uploadToSheet() {
    document.getElementById('sheet-status').innerText = "⏳ TSV ➔ Sheet...";
    try {
        const res = await fetch(`${API}/projects/${currentSheetProject}/upload-data`, { method: 'POST' });
        const data = await res.json();
        document.getElementById('sheet-status').innerText = data.success ? "🎉 TSV ➔ Sheet Klaar" : "❌ Fout";
    } catch (e) { }
}

// --- VIEW: TOOLS ---
async function runTool(toolName, params = {}, isDirect = false) {
    if (toolName === 'deploy-sync') {
        const res = await fetch(`${API}/run-script`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ script: 'sync-deployment-status.js', args: [] })
        });
        const result = await res.json();
        alert(result.message);
        loadSites();
        return;
    }

    if (!isDirect) { openToolModal(toolName); return; }

    let config = { script: '', args: [] };
    if (toolName === 'data-injector') {
        config.script = 'sync-tsv-to-json.js';
        config.args = [params.project]; // De site-generator sync
    } else if (toolName === 'ai-parser') {
        config.script = 'parser-wizard.js';
        config.args = [params.project, params.file, params.siteType, params.prompt || ""];
    } else if (toolName === 'image-gen') {
        config.script = 'generate-image-prompts.js';
        config.args = [params.project];
    } else if (toolName === 'media-fetcher') {
        config.script = 'athena-media-fetcher.js';
        config.args = [params.project];
    }

    const log = document.getElementById('tool-log');
    log.classList.remove('hidden');
    log.innerText = `⏳ Starten van ${config.script}...`;

    try {
        const res = await fetch(`${API}/run-script`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(config)
        });
        const result = await res.json();
        log.innerText = result.success ? (result.message || "Script voltooid.") : `❌ Fout: ${result.error}`;

        // Als het de Art Director was, haal prompts op
        if (result.success && toolName === 'image-gen') {
            loadPrompts(params.project);
        }
    } catch (e) { log.innerText = "Error: " + e.message; }
}

async function loadPrompts(projectName) {
    const prompts = await fetchJSON(`/projects/${projectName}/prompts`);
    const log = document.getElementById('tool-log');

    if (!prompts || prompts.length === 0) {
        log.innerHTML = '<p class="muted mt-10">Geen bestaande prompts gevonden. Klik op "Uitvoeren" om ze te genereren.</p>';
        return;
    }

    displayPrompts(prompts);
}

function displayPrompts(prompts) {
    const log = document.getElementById('tool-log');

    let html = `<div class="flex-row mt-20" style="justify-content: space-between; align-items: center;">
        <h4>🎨 Gegenereerde Prompts (${prompts.length})</h4>
        <button onclick="copyAllPrompts()" class="secondary-btn success-btn" style="padding: 5px 12px; font-size: 0.7rem;">
            <i class="fa-solid fa-copy"></i> KOPIEER ALLES
        </button>
    </div>`;

    html += `<table class="prompt-table mt-10">
        <thead>
            <tr>
                <th>Vak / Item</th>
                <th>AI Prompt</th>
                <th>Actie</th>
            </tr>
        </thead>
        <tbody>`;

    prompts.forEach(p => {
        html += `<tr>
            <td><small>${p.Source_Table}</small><br><strong>${p.Source_Label}</strong></td>
            <td class="mono-text" style="font-size: 0.75rem;">${p.AI_Prompt}</td>
            <td>
                <button onclick="copyToClipboard('${p.AI_Prompt.replace(/'/g, "\\'")}')" class="icon-btn" title="Kopieer Prompt">
                    <i class="fa-solid fa-copy"></i>
                </button>
            </td>
        </tr>`;
    });

    html += `</tbody></table>`;
    log.innerHTML = html;

    // Bewaar prompts globaal voor de copy-all functie
    window.lastPrompts = prompts;
}

window.copyAllPrompts = () => {
    if (!window.lastPrompts) return;
    const allText = window.lastPrompts.map(p => `[${p.Source_Label}] ${p.AI_Prompt}`).join('\n\n');
    navigator.clipboard.writeText(allText).then(() => {
        alert("Alle prompts zijn naar het klembord gekopieerd!");
    });
};

window.copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
        alert("Prompt gekopieerd naar klembord!");
    });
};

async function openToolModal(tool) {
    currentTool = tool;
    const titles = { 'data-injector': 'TSV to Sites', 'image-gen': 'AI Art Director', 'media-fetcher': '📸 Media Fetcher', 'ai-parser': '🤖 AI Content Parser' };
    const descriptions = {
        'data-injector': 'Deze tool synchroniseert de data uit je bron-bestanden (TSV of Google Sheets) naar de lokale JSON-bestanden van je site. Dit is de motor die de content van je site ververst en publiceert naar de frontend.',
        'image-gen': 'Maakt gebruik van AI om cinematische prompts te genereren voor afbeeldingen op basis van je project-context.',
        'media-fetcher': 'Zoekt automatisch naar relevante foto\'s op rechtenvrije platforms zoals Pexels en Unsplash.',
        'ai-parser': 'Gebruikt AI om gescrapete of geplakte tekst om te zetten naar gestructureerde data volgens je SiteType blueprint.'
    };

    document.getElementById('tool-modal-title').innerText = titles[tool] || 'Tool';
    document.getElementById('tool-modal-description').innerText = descriptions[tool] || '';

    // Reset en toon extra velden indien AI parser
    const extraFields = document.getElementById('parser-extra-fields');
    if (tool === 'ai-parser') {
        extraFields.classList.remove('hidden');
        // Laad sitetypes voor de blueprint selectie
        const types = await fetchJSON('/sitetypes') || [];
        document.getElementById('tool-sitetype-select').innerHTML = types.map(t => `<option value="${t}">${t}</option>`).join('');
    } else {
        extraFields.classList.add('hidden');
    }

    const log = document.getElementById('tool-log');
    log.classList.add('hidden');
    log.innerText = '';

    openModal('tool-modal');

    const projects = await fetchJSON('/projects') || [];
    const projSelect = document.getElementById('tool-project-select');
    projSelect.innerHTML = projects.map(p => `<option value="${p}">${p}</option>`).join('');

    if (projects.length > 0) updateToolFileList();
}

async function updateToolFileList() {
    const projectName = document.getElementById('tool-project-select').value;

    // Als we in de AI parser zijn, update file list
    if (currentTool === 'ai-parser') {
        const files = await fetchJSON(`/projects/${projectName}/files`) || [];
        const fileSelect = document.getElementById('tool-file-select');
        fileSelect.innerHTML = files.map(f => `<option value="${f}">${f}</option>`).join('');
    }

    // Als we in de Art Director zijn, laad bestaande prompts
    if (currentTool === 'image-gen') {
        const log = document.getElementById('tool-log');
        log.classList.remove('hidden');
        log.innerHTML = '⏳ Bestaande prompts laden...';
        loadPrompts(projectName);
    }
}

document.getElementById('tool-run-btn').onclick = () => {
    const project = document.getElementById('tool-project-select').value;
    const params = { project };

    if (currentTool === 'ai-parser') {
        params.file = document.getElementById('tool-file-select').value;
        params.siteType = document.getElementById('tool-sitetype-select').value;
        params.prompt = document.getElementById('tool-custom-prompt').value;
    }

    runTool(currentTool, params, true);
};

async function generateSitesOverview() {
    try {
        const res = await fetch(`${API}/generate-overview`, { method: 'POST' });
        const data = await res.json();
        alert(data.message || "Overzicht gegenereerd!");
    } catch (e) { alert("Fout bij genereren."); }
}

const TOOL_INFO = {
    'layout-architect': {
        title: 'Layout Architect',
        body: 'Een visuele editor waarmee je datavelden uit je Google Sheet (zoals titels en teksten) kunt koppelen aan specifieke plekken op je website. Je ziet direct resultaat in een preview venster.'
    },
    'image-gen': {
        title: 'AI Image Prompt Generator',
        body: 'Maakt gebruik van AI om cinematische prompts te genereren voor afbeeldingen op basis van je project-context. Deze prompts kunnen direct gebruikt worden in tools als Midjourney of DALL-E.'
    },
    'media-fetcher': {
        title: 'Media Fetcher',
        body: 'Zoekt automatisch naar relevante foto\'s op rechtenvrije platforms zoals Pexels en Unsplash. Ideaal om snel een nieuwe site te vullen met kwalitatieve beelden.'
    },
    'media-visualizer': {
        title: 'Media Visualizer',
        body: 'Een visuele web-tool om afbeeldingen naar de juiste "slots" op je website te slepen. Je kunt afbeeldingen uploaden of koppelen aan de datastructuur van je site. Script: media-visualizer.js'
    },
    'data-injector': {
        title: 'Data Injector',
        body: 'Synchroniseert de data uit je bron-bestanden (TSV/Sheets) naar de lokale JSON-bestanden van je site. Dit is de motor die de content van je site ververst.'
    },
    'status-sync': {
        title: 'Status Refresh',
        body: 'Scant al je lokale projecten en controleert de huidige Git status en of de site al live staat op GitHub Pages. Werkt de sites-overzichten bij.'
    },
    'sites-overview': {
        title: 'Sites Overzicht',
        body: 'Een gecombineerde tool voor rapportage. Bekijk en kopieer een lijst van alle actieve live URL\'s, of genereer een volledig SITES_OVERZICHT.md bestand voor je documentatie.'
    },
    'maintenance': {
        title: 'Systeem Onderhoud',
        body: 'Hulpmiddelen om je systeem schoon en snel te houden. Verwijder onnodige cache (pnpm prune) of maak ruimte vrij door node_modules van oude projecten te wissen.'
    }
};

function showToolInfo(toolId, event) {
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }
    const info = TOOL_INFO[toolId];
    if (!info) return;

    document.getElementById('tool-info-title').innerText = info.title;
    document.getElementById('tool-info-body').innerText = info.body;
    openModal('tool-info-modal');
}

async function openCopyUrlsModal() {
    const sites = await fetchJSON('/sites') || [];
    const liveSites = sites.filter(s => s.status === 'live' && s.deployData?.liveUrl);

    const textarea = document.getElementById('urls-textarea');
    if (liveSites.length === 0) {
        textarea.value = "Geen live sites gevonden.";
    } else {
        // Alleen de pure URL's tonen, één per regel
        textarea.value = liveSites.map(s => s.deployData.liveUrl).join('\n');
    }

    openModal('copy-urls-modal');
}

function copyUrlsToClipboard() {
    const textarea = document.getElementById('urls-textarea');
    textarea.select();
    document.execCommand('copy');
    alert("Lijst gekopieerd naar klembord!");
}

// --- SYSTEM MAINTENANCE ---
async function updateSystemStatus() {
    const status = await fetchJSON('/system-status');
    if (status && status.percent) {
        // Update sites Main (indien aanwezig)
        const percentTxtMain = document.getElementById('disk-percent-main');
        const barMain = document.getElementById('disk-bar-main');
        if (percentTxtMain) percentTxtMain.innerText = status.percent;
        if (barMain) barMain.style.width = status.percent;

        // Update Sidebar Mini (optioneel fallback)
        const tagMini = document.getElementById('disk-usage-tag');
        const barMini = document.getElementById('disk-bar-mini');
        if (tagMini) tagMini.innerText = status.percent;
        if (barMini) barMini.style.width = status.percent;

        // Update Maintenance Modal (indien aanwezig)
        const percentTxt = document.getElementById('disk-percent');
        const bar = document.getElementById('disk-bar');
        const detailTxt = document.getElementById('disk-detail');
        if (percentTxt) percentTxt.innerText = status.percent;
        if (bar) bar.style.width = status.percent;
        if (detailTxt) detailTxt.innerText = `${status.avail} beschikbaar van ${status.size}`;
    }
}

function openMaintenance() {
    openModal('maintenance-modal');
    updateSystemStatus();
    updateLogStatus();
}

async function runMaintenance(action) {
    const log = document.getElementById('maintenance-log');
    log.classList.remove('hidden');
    log.innerText = "⏳ Bezig met uitvoeren...";

    let endpoint = '/maintenance';
    let method = 'POST';
    let body = { action };

    if (action === 'logs-rotate') {
        endpoint = '/system/logs/rotate';
    } else if (action === 'logs-clear') {
        endpoint = '/system/logs/clear';
        if (!confirm("Weet je het zeker? Dit verwijdert ALLE logbestanden definitief.")) return;
    }

    try {
        const res = await fetch(`${API}${endpoint}`, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });
        const data = await res.json();
        log.innerText = data.success ? (data.message || `✅ Actie voltooid (Verwijderd: ${data.deleted || data.cleared || 0})`) : `❌ Fout: ${data.error}`;
        updateSystemStatus();
        updateLogStatus();
    } catch (e) { log.innerText = "❌ Netwerkfout."; }
}

async function updateLogStatus() {
    const status = await fetchJSON('/system/logs');
    const logDetail = document.getElementById('log-detail');
    if (status && logDetail) {
        logDetail.innerText = `${status.count} bestanden, totaal: ${status.totalSize}`;
    }
}

async function syncSecretsToGitHub() {
    const btn = document.getElementById('sync-secrets-btn');
    const log = document.getElementById('settings-log');
    
    if (!confirm("Dit pusht je lokale GITHUB_PAT en GOOGLE tokens naar GitHub Actions Secrets. Doorgaan?")) return;

    btn.disabled = true;
    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Bezig met sync...';
    log.classList.remove('hidden');
    log.innerHTML = '<span class="accent">⏳ Starten van secret synchronisatie via GitHub CLI...</span>';

    try {
        const res = await fetch(`${API}/system/secrets/sync`, { method: 'POST' });
        const data = await res.json();

        if (data.success) {
            log.innerHTML = `<div style="color: var(--success); font-weight: bold; margin-bottom: 10px;">✅ Secret Sync Voltooid!</div>` + 
                           `<pre style="font-size: 0.7rem; color: var(--text-muted); text-align: left;">${data.logs.join('\n')}</pre>`;
        } else {
            log.innerHTML = `<span style="color: var(--error);">❌ Sync mislukt: ${data.error}</span>`;
        }
    } catch (e) {
        log.innerHTML = `<span style="color: var(--error);">❌ Netwerkfout tijdens sync.</span>`;
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fa-solid fa-cloud-lock"></i> Sync naar GitHub Actions';
    }
}

// --- SITETYPE WIZARD ---

let sitetypeData = {
    name: '',
    description: '',
    businessDescription: '',
    dataStructure: [],
    designSystem: null
};


async function generateSitetypeStructure() {
    const businessDescription = document.getElementById('sitetype-business').value;
    const name = document.getElementById('sitetype-name').value;
    const description = document.getElementById('sitetype-description').value;

    if (!businessDescription || !name || !description) {
        alert('Vul alle velden in basis info in');
        return;
    }

    // Store basic data
    sitetypeData.name = name;
    sitetypeData.description = description;
    sitetypeData.businessDescription = businessDescription;

    // Show loading
    document.getElementById('structure-loading').classList.remove('hidden');

    try {
        const response = await fetch(`${API}/sitetype/generate-structure`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessDescription })
        });

        const data = await response.json();

        if (data.success) {
            sitetypeData.dataStructure = data.structure;
            renderStructureEditor(data.structure);
            showSitetypeTab('structure');
        } else {
            alert('Fout bij genereren structuur: ' + data.error);
        }
    } catch (error) {
        alert('Netwerkfout: ' + error.message);
    } finally {
        document.getElementById('structure-loading').classList.add('hidden');
    }
}

function renderStructureEditor(structure) {
    const container = document.getElementById('structure-editor');
    container.innerHTML = `
        <h3>🧠 Data Structuur (AI gegenereerd)</h3>
        <div class="structure-tables">
            ${structure.map((table, tableIndex) => `
                <div class="table-block">
                    <h4>📋 Tabel: ${table.table_name}</h4>
                    <div class="columns-grid">
                        ${table.columns.map((col, colIndex) => `
                            <div class="column-item">
                                <input type="text" value="${col.name}" 
                                    onchange="updateSitetypeColumn(${tableIndex}, ${colIndex}, 'name', this.value)">
                                <textarea onchange="updateSitetypeColumn(${tableIndex}, ${colIndex}, 'description', this.value)">${col.description}</textarea>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `).join('')}
        </div>
        <p class="form-help">Pas de tabelnamen en kolommen aan indien nodig. Deze structuur bepaalt hoe de data wordt georganiseerd.</p>
    `;
}

function updateSitetypeColumn(tableIndex, colIndex, field, value) {
    sitetypeData.dataStructure[tableIndex].columns[colIndex][field] = value;
}

async function generateSitetypeDesign() {
    document.getElementById('design-loading').classList.remove('hidden');

    try {
        const response = await fetch(`${API}/sitetype/generate-design`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ businessDescription: sitetypeData.businessDescription })
        });

        const data = await response.json();

        if (data.success) {
            sitetypeData.designSystem = data.design;
            renderDesignEditor(data.design);
            showSitetypeTab('design');
        } else {
            alert('Fout bij genereren design: ' + data.error);
        }
    } catch (error) {
        alert('Netwerkfout: ' + error.message);
    } finally {
        document.getElementById('design-loading').classList.add('hidden');
    }
}

function renderDesignEditor(design) {
    const container = document.getElementById('design-editor');
    container.innerHTML = `
        <h3>🎨 Design Systeem (AI gegenereerd)</h3>
        <div class="design-form">
            <div class="form-group">
                <label>Primaire Kleur</label>
                <input type="color" value="${design.colors.primary}" 
                    onchange="updateSitetypeDesign('colors.primary', this.value)">
                <input type="text" value="${design.colors.primary}" 
                    onchange="updateSitetypeDesign('colors.primary', this.value)">
            </div>
            
            <div class="form-group">
                <label>Accent Kleur</label>
                <input type="color" value="${design.colors.accent}" 
                    onchange="updateSitetypeDesign('colors.accent', this.value)">
                <input type="text" value="${design.colors.accent}" 
                    onchange="updateSitetypeDesign('colors.accent', this.value)">
            </div>
            
            <div class="form-group">
                <label>Corner Radius</label>
                <input type="text" value="${design.radius}" 
                    onchange="updateSitetypeDesign('radius', this.value)">
            </div>
            
            <div class="form-group">
                <label>Font Sans</label>
                <input type="text" value="${design.font_sans}" 
                    onchange="updateSitetypeDesign('font_sans', this.value)">
            </div>
            
            <div class="form-group">
                <label>Font Serif</label>
                <input type="text" value="${design.font_serif}" 
                    onchange="updateSitetypeDesign('font_serif', this.value)">
            </div>
        </div>
        <p class="form-help">Pas het design aan naar wens. Deze instellingen bepalen de visuele stijl van alle websites die dit sitetype gebruiken.</p>
    `;
}

function updateSitetypeDesign(path, value) {
    const keys = path.split('.');
    let obj = sitetypeData.designSystem;
    for (let i = 0; i < keys.length - 1; i++) {
        obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
}

function showSitetypeInfo() {
    openModal('sitetype-info-modal');
}

function toggleWorkflowInfo() {
    const workflowInfo = document.getElementById('workflow-info');
    workflowInfo.classList.toggle('hidden');
}

function showSitetypeTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.add('hidden');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab and activate button
    document.getElementById(`sitetype-tab-${tabName}`).classList.remove('hidden');
    document.querySelector(`.tab-btn[onclick*="${tabName}"]`).classList.add('active');

    // Special handling for review tab
    if (tabName === 'review') {
        renderReviewContent();
    }
}

function renderReviewContent() {
    const container = document.getElementById('review-content');
    container.innerHTML = `
        <div class="review-section">
            <h4>📝 Basic Info</h4>
            <p><strong>Naam:</strong> ${sitetypeData.name}</p>
            <p><strong>Beschrijving:</strong> ${sitetypeData.description}</p>
            <p><strong>Business:</strong> ${sitetypeData.businessDescription}</p>
        </div>
        
        <div class="review-section">
            <h4>🧠 Data Structuur</h4>
            ${sitetypeData.dataStructure.map(table => `
                <div class="review-table">
                    <strong>${table.table_name}</strong>
                    <ul>
                        ${table.columns.map(col => `<li>${col.name}: ${col.description}</li>`).join('')}
                    </ul>
                </div>
            `).join('')}
        </div>
        
        <div class="review-section">
            <h4>🎨 Design Systeem</h4>
            <div class="color-preview">
                <div class="color-swatch" style="background: ${sitetypeData.designSystem.colors.primary}"></div>
                <div class="color-swatch" style="background: ${sitetypeData.designSystem.colors.accent}"></div>
                <div class="color-swatch" style="background: ${sitetypeData.designSystem.colors.secondary}"></div>
            </div>
            <p><strong>Fonts:</strong> ${sitetypeData.designSystem.font_sans} / ${sitetypeData.designSystem.font_serif}</p>
        </div>
    `;
}

async function createSiteType() {
    const log = document.getElementById('sitetype-log');
    log.classList.remove('hidden');
    log.innerHTML = '🚀 SiteType aanmaken...';

    // Get track from form
    sitetypeData.track = document.getElementById('sitetype-track').value;

    try {
        const response = await fetch(`${API}/sitetype/create`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name: sitetypeData.name,
                description: sitetypeData.description,
                dataStructure: sitetypeData.dataStructure,
                designSystem: sitetypeData.designSystem,
                track: sitetypeData.track
            })
        });

        const data = await response.json();

        if (data.success) {
            log.innerHTML = `✅ ${data.message}`;
            // Refresh list and close modal after delay
            setTimeout(() => {
                closeModal('sitetype-wizard-modal');
                loadSiteTypes();
            }, 2000);
        } else {
            log.innerHTML = `❌ Fout: ${data.error}`;
        }
    } catch (error) {
        log.innerHTML = `❌ Netwerkfout: ${error.message}`;
    }
}

// --- INIT ---
document.addEventListener('DOMContentLoaded', async () => {
    await loadSystemConfig();
    loadSites();
    updateSystemStatus();
    setInterval(updateSystemStatus, 60000); // Check elke minuut

    // Auto-refresh sites status elke 5 seconden voor de "isRunning" badge
    setInterval(() => {
        const sitesSection = document.getElementById('sites');
        if (sitesSection && !sitesSection.classList.contains('hidden')) {
            loadSites();
        }
    }, 5000);
});

// --- GLOBAL EVENT LISTENERS ---
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        // Sluit alle zichtbare modals
        document.querySelectorAll('.modal:not(.hidden)').forEach(modal => {
            closeModal(modal.id);
        });
    }
});