# 🤖 Athena CMS Factory - AI Agent Dashboard & Manifest

Dit manifest is de definitieve operationele gids voor AI-agents (Gemini, Jules, Antigravity) die werkzaam zijn binnen de Athena CMS Factory. Het dient als "Dashboard" om in één oogopslag alle tools, workflows en site-statussen te overzien.

---

## 🏗️ Fabriek Architectuur
- **Locatie:** `/home/kareltestspecial/2-Fabriek/athena/athena-x/`
- **Engine Kern (`/factory/5-engine/`):** Bevat alle actieve scripts en wizards.
- **Sites (`/sites/`):** De individuele projecten (bijv. `fpc-gent-site`, `portfolio-kbm`).
- **Input (`/input/`):** Rauwe data bronnen (TSV, Scrapes).
- **Templates (`/factory/2-templates/`):** De blauwdrukken (Layouts, CSS).

---

## 🛠️ AI-Agent Tooling & Commando's
Gebruik deze commando's vanuit de `/factory/` map voor autonome uitvoering:

### 📥 Data Management & Google Sheets
- **Auto-Provisioning:** `node 5-engine/auto-sheet-provisioner.js [site-name] [email]`
  - *Wat het doet:* Maakt een nieuwe Google Sheet aan van de Master Template, deelt deze met de robot en de klant, en koppelt deze automatisch aan het project via `url-sheet.json`.
- **Sheet-to-JSON Sync:** `node 5-engine/sync-sheet-to-json.js [site-name]`
  - *Wat het doet:* Haalt live data op uit de gekoppelde Google Sheet en overschrijft lokale JSON-bestanden.
- **JSON-to-Sheet Sync:** `node 5-engine/sync-json-to-sheet.js [site-name]`
  - *Wat het doet:* Pusht lokale wijzigingen terug naar de Google Sheet.
- **TSV Sync:** `node 5-engine/sync-tsv-to-json.js [site-name]`
  - *Wat het doet:* Converteert TSV-bestanden in `/input/[site-name]/tsv-data/` naar JSON.

### 🏗️ Site Generation & Wizards
- **Rebuild Site:** `node 5-engine/rebuild-site.js [site-name]`
  - *Wat het doet:* Genereert de volledige site-structuur opnieuw op basis van de laatste JSON-data.
- **Onboarding Wizard:** `node 5-engine/onboarding-wizard.js`
  - *Wat het doet:* Begeleid proces voor nieuwe klanten/projecten.
- **Site Wizard:** `node 5-engine/site-wizard.js`
  - *Wat het doet:* Maakt een nieuw project aan op basis van een blueprint (bijv. portfolio, bakkerij, etc.).
- **Variant Generator:** `node 5-engine/variant-generator.js`
  - *Wat het doet:* Maakt variaties van een site met andere CSS-themes (bijv. rood/groen/blauw).

### 🤖 AI Agent Autonome Uitvoering
- **MCP Helper:** `node 5-engine/athena-mcp-helper.js [wizard] [antwoorden...]`
  - *Wat het doet:* Voert een interactieve wizard uit zonder menselijke tussenkomst door antwoorden naar de stdin te pushen.
- **AI Parser:** `node 5-engine/parser-wizard.js [site-name]`
  - *Wat het doet:* Gebruikt GenAI om rauwe content (scrapes/tekst) te mappen naar de JSON-velden van de blueprint.

---

## 🚀 Deployment & Monitoring
- **GitHub Sync (Subtree):** `node 5-engine/sync-monorepo-to-github.js [site-name]`
  - *Wat het doet:* Pusht een specifieke site vanuit de monorepo naar zijn eigen GitHub repository.
- **Status Dashboard:** `node 5-engine/generate-sites-overview.js`
  - *Wat het doet:* Genereert `SITES_OVERZICHT.md` met alle live URL's en GitHub links.

---

## 🎨 Design & Media
- **Media Fetcher:** `node 5-engine/athena-media-fetcher.js [site-name]`
  - *Wat het doet:* Downloadt automatisch relevante afbeeldingen van Unsplash op basis van JSON context.
- **CSS Templates:** Gebruik themes uit `/factory/2-templates/boilerplate/autonomous/css/`.
  - *Nieuwe Dossier-stijlen:* `dossier-blue.css`, `dossier-red.css`, `dossier-green.css`.

---

## 📋 Standaard Workflow voor AI-Taken
1. **Verifieer Status:** Check `SITES_OVERZICHT.md`.
2. **Koppel Data:** Gebruik `auto-sheet-provisioner.js` voor nieuwe sites.
3. **Synchroniseer:** Gebruik `sync-sheet-to-json.js`.
4. **Build:** Gebruik `rebuild-site.js`.
5. **Deploy:** Gebruik `sync-monorepo-to-github.js`.

---

## 🚀 Toekomstvisie: Vite-to-Athena Importer
De huidige Athenafier is sterk in het analyseren van statische HTML, maar heeft moeite met moderne, component-gebaseerde React-apps die we handmatig bouwen. Een beter systeem moet slimmer worden in het herkennen van code-patronen:

1. **Component Mapping:** Scant React-componenten en maakt automatisch de bijbehorende `blueprint.json` en Athena-templates aan.
2. **Logic Separation:** Een "Data Extractor" die hardcoded arrays uit `App.tsx` herkent en omzet naar Athena JSON-data.
3. **Automatic Wrapper Injection:** Injecteert een Athena-wrapper in een bestaand Vite-project zodat dashboard-acties (`DEV`, `SYNC`) direct op de bestaande bronmap werken.
