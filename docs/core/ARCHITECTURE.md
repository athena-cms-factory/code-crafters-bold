# Athena CMS Factory - Architecture & Flow (v8.0)

This document provides deep insight into the interactions between various scripts in the Athena Factory (v8.0) and the architectural models supported.

## 1. Architectural Models: React 19 + Tailwind v4

Athena v8.0 introduces a modernized stack leveraging **React 19** for improved concurrency and **Tailwind CSS v4** for a zero-runtime, high-performance styling engine.

### A. SINGLE-PAGE ARCHITECTURE (SPA)
**Ideal for:** Local merchants, portfolios, event sites, and simple landing pages.
*   **Stack:** React 19 + Vite + Tailwind v4.
*   **Navigation:** Uses anchor links (`#services`, `#contact`) with smooth scrolling.
*   **Structure:** One central `App.jsx` that renders all sections sequentially.
*   **Data:** Fetches all data at once during page load.
*   **Advantage:** Maximum speed and simplicity.

### B. MULTI-PAGE ARCHITECTURE (MPA)
**Ideal for:** Institutions (hospitals, schools), larger companies with multiple locations, or complex services.
*   **Stack:** React 19 + Vite + Tailwind v4 + React Router 7.
*   **Navigation:** Uses `react-router-dom` for real URL paths (`/services/cardiology`, `/about-us`).
*   **Structure:** A routing map that renders unique page components based on the URL.
*   **Data:** Can load page-specific data, increasing scalability.
*   **Advantage:** Better SEO segmentation and logical structure for large amounts of information.

**Configuration:** The model is selected during creation in the **Site Wizard**. SPA is the default. MPA automatically installs `react-router-dom` and uses the MPA boilerplate templates.

---

## 2. Functional Hierarchy & Core Managers

The system has two main entry points (Hubs) that drive the rest of the engine:

1.  **Visual Hub:** `dashboard/server.js` (Express API running on port **5001**)
2.  **CLI Hub:** `athena-agent.js` (Headless Agent Interface) & `5-engine/athena.js` (Interactive Menu)

Both hubs act as "orchestrators": they utilize centralized managers to perform tasks.

### Core Managers & Controllers (v8.0)

*   **ConfigManager:** Centralized handling of configuration files (`config/`, `.env`). Ensures consistent settings across all tools.
*   **ProcessManager:** Manages child processes (e.g., `factory.js`, `pnpm install`) to ensure resource limits are respected and processes are properly cleaned up.
*   **LogManager:** Centralized logging utility replacing scattered `console.log` calls. Directs logs to `output/logs/` and rotates them automatically.
*   **AthenaDataManager:** Handles synchronization between local JSON/TSV files and Google Sheets.
*   **DoctorController:** The "immune system" responsible for site health audits and the **Hydration Management System** (pruning `node_modules` to save space).
*   **MarketingController:** Autonomous engine for generating Blogs and SEO metadata using AI.

---

## 3. Dependency Register (Detailed)

| Script | Path | Primary Hub | Key Dependencies | Output / Effect |
|:---|:---|:---|:---|:---|
| **Factory Engine** | `5-engine/factory.js` | Dashboard / CLI | `ProcessManager`, `ConfigManager` | Generates complete React site in `../sites/` |
| **AI Engine** | `5-engine/ai-engine.js` | Many scripts | Google Gemini API, `ConfigManager` | Structured AI responses |
| **Parser Wizard** | `5-engine/parser-wizard.js` | CLI | `parser-engine.js`, `AthenaDataManager` | Processed data in `input/[data-bron]/tsv-data/` |
| **Global Update** | `6-utilities/update-all-sites.js` | CLI | `standard-layout-generator.js` | Propagates v7.9+ features to existing sites |
| **Deploy Wizard** | `5-engine/deploy-wizard.js` | Dashboard / CLI | `ProcessManager`, `ConfigManager` | Live website on GitHub Pages |
| **Layout Visualizer** | `5-engine/layout-visualizer.js`| Dashboard | `ai-engine.js` | New JSX components in sitetypes |
| **Logger Utility** | `5-engine/lib/LogManager.js` | All (via import) | - | Logs in `output/logs/` |
| **Sync JSON -> Site** | `5-engine/sync-json-to-site.js`| `factory.js` | `AthenaDataManager` | Copies data from `input/` to `sites/` |

---

## 4. Data Flow Scenarios

### Scenario A: Creating a New Site (Happy Path)
1.  User selects data source in **Dashboard (Port 5001)**.
2.  Dashboard calls `factory.js` via `ProcessManager`.
3.  `factory.js` reads blueprint from `3-sitetypes/` using `ConfigManager`.
4.  `factory.js` calls `standard-layout-generator.js` to create `Section.jsx`.
5.  `factory.js` executes `pnpm install` in the new site directory.
6.  `factory.js` initializes Git and makes an initial commit.

### Scenario B: Saving Visual Edits to Cloud (v7.9 Split-Save)
1.  User edits text or a link in **Athena Dock (Port 5002)**.
2.  Dock sends change to site (`vite-plugin-athena-editor.js`).
3.  **Split-Save**: Labels go to local JSON (e.g., `basisgegevens.json`), URLs go to `links_config.json`.
4.  User clicks "Sync to Sheets" in Dashboard.
5.  Dashboard calls `sync-json-to-sheet.js` utilizing `AthenaDataManager`.
6.  Script pushes content to primary tabs and URLs to the **hidden tab** `_links_config`.

---

## 5. Log Destinations (Schema)

Since v7.9, all non-interactive logs are centralized via `LogManager`:

*   **Dashboard:** `output/logs/[date]_dashboard.log`
*   **Previews:** `output/logs/[date]_preview_[site-id].log`
*   **Background Tools:** `output/logs/[date]_[tool-name].log`

---

## 6. Critical Points for Developers

*   **Dollar Signs:** In generators (`factory.js`, `standard-layout-generator.js`), every `$` in template literals must be escaped as `\$` to avoid conflicts with the Node.js runtime.
*   **Path Resolution:** Always use `path.resolve()` or `path.join(__dirname, ...)` because scripts can be called from different working directories (root, dashboard, 5-engine).
*   **RAM Management:** For heavy operations (like `pnpm install`), always rely on `ProcessManager` to enforce concurrency limits (default: 1) to avoid exceeding the 16GB RAM limit on Dell Latitude environments.
