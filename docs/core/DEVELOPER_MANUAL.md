# Developer Manual - Athena CMS Factory (v7.9.2)

## Two-Track Strategy (Docked vs Autonomous)
Since v6.2, Athena has maintained a strict separation in the architecture of sitetypes and templates. This ensures maximum flexibility when choosing between centralized management or complete independence.

### 1. Docked Track (`3-sitetypes/docked/`)
The 'Docked' track is designed for sites managed via the **Athena Dock**.
- **Characteristics:** Extremely lightweight code. Contains no internal editor interface.
- **Data flow:** Edits move from Dock -> Site Plugin -> Local JSON.

### 2. Autonomous Track (`3-sitetypes/autonomous/`)
The 'Autonomous' track is designed for sites that must operate completely independently.
- **Characteristics:** Includes built-in editor tools directly within the site code.
- **Data flow:** Local Editor -> Local JSON.

---

## 🏆 The "Golden Standard" (v7.9+)
Since v7.4, Athena has employed a standardized approach to site identity and contact information to prevent inconsistencies in headers and footers.

### 1. `site_settings.json` (Array format)
Every site MUST contain a `site_settings.json` file as an **array with one object**.
- **Required fields:** `site_name`, `tagline`, `logo_text`, `site_logo_image`.
- **Why an array?** The Athena Editor indexes based on `index: 0`.

### 2. `contact.json` (Array format)
Instead of hiding contact details in a hero or intro section, we use a dedicated `contact.json`.
- **Fixed keys:** `title`, `email`, `phone`, `location`, `vat_number`, `linkedin_url`.
- **Benefit:** The boilerplate `Footer.jsx` automatically recognizes these keys and builds a professional section.

---

## 🖼️ Media Binding Best Practices
To prevent the Athena Editor from mistaking a media slot for a text field ("Edit Text" modal), the following rules apply:

1.  **Bind-on-Target**: ALWAYS place `data-dock-bind` and `data-dock-type="media"` directly on the `<img>` or `<video>` tag. Use the `EditableMedia` component, which handles this internally.
2.  **Hard IMG Rendering**: The editor must see an active `img` tag to activate the dropzone.
3.  **The `fallback` Prop**: Use the `fallback` prop in `EditableMedia` for empty slots. The component will generate a graphical SVG placeholder (letter or icon), acting as a valid drop target without polluting the database.
4.  **Semantic Naming**: Use suffixes like `_image` or `_logo` for keys in your blueprint (e.g., `site_logo_image`).

---

## 🔍 Smart Asset Discovery & Data Handover
To ensure generated sites are not missing images or data, the engine uses `AssetScavenger` (via `ProcessManager`):

### 1. Guaranteed Data Handover
During site creation, the `input/[data-bron]/json-data/` directory is copied directly to the new site's `src/data/` with high priority. This occurs via a hard `fs.cpSync` before any synchronization.

### 2. Automatic Asset Scavenging
After data handover, the engine runs the `AssetScavenger` routine:
- **Scan**: All JSON files in `src/data/` are scanned for strings ending in media extensions (`.jpg`, `.png`, `.mp4`, etc.).
- **Search**: The engine recursively searches for these files in:
    1. `input/[data-bron]/images/`
    2. `input/[data-bron]/input/`
    3. `inputsites/` (for cloned prototypes)
- **Recovery**: Found files are automatically copied to the `public/images/` directory of the new site.

---

## ⏪ Undo/Redo Engine
The Athena Dock features a robust Undo/Redo system (`Ctrl+Z` / `Ctrl+Y`) to quickly recover from editing errors.

### 1. How it Works
- **History Stack**: Changes are stored in a stack within `DockFrame.jsx`.
- **Efficiency**: Although modern hardware (16GB RAM) allows for larger stacks, we optimize for speed by preserving the last **20 actions**.
- **Silent Saving**: During an undo/redo, data is pushed to the server with the `silent: true` flag, preventing a full Dock reload.

---

## 🖱️ Dock Interaction Modes (v8.1 Standard)
The Athena Dock uses a dual-interaction model to balance visual editing with functional testing. Since v8.1, the logic has been swapped to prioritize site usability.

### 1. Action Mode (Standard Click)
By default, a normal click on any element in the site-preview (iframe) will:
- Execute the element's native behavior (follow links, trigger buttons, etc.).
- This ensures live sites remain fully navigable while being previewed in the Dock.

### 2. Edit Mode (Shift + Click)
To select an element for editing:
- **Hold `Shift` while clicking**: This opens the relevant editor modal in the Dock (Text, Media, or Link editor) and highlights the element with a visual binding ring.
- **Visual Feedback**: All `Editable` components show a tooltip on hover explaining the "Shift+Click to edit" instruction.

---

## 📐 Advanced Header & Layout Controls

Athena provides granular control over the site's primary layout and header directly from the Dock's **Design Editor**.

### 1. Global Layout Offset
To prevent the fixed header from overlapping content (especially Hero sections), use the **Content Top Offset** slider.
- **Variable**: `--content-top-offset`
- **Application**: Applied as `padding-top` to the `<main>` element in `App.jsx`.

### 2. Header Visibility & Elements
Developers can now toggle specific header components or the entire header:
- `header_visible`: Completely hides/shows the navigation bar.
- `header_show_logo/title/tagline/button`: Toggles individual elements within the header.

### 3. Header Styling
- **Transparency**: Toggle `header_transparent` to switch between a blurred/colored background and a fully transparent one.
- **Height**: Adjustable via `header_height` slider (range 40px - 150px).

---

## 🔗 Editable Links & Buttons

Athena fully supports editable links and buttons via the `EditableLink` component.

### 1. Using `EditableLink`
The component accepts both a `label` and a `url`.
```jsx
<EditableLink 
  label={item.cta_text} 
  url={item.cta_url} 
  table="services" 
  field="cta" 
  id={index} 
  className="..."
/>
```

### 2. Data Splitting (Label vs URL) - Split-Save
To keep the primary Google Sheet (Content) clean, data is physically split during saving:
- **Label**: Saved in the specified file (e.g., `services.json`).
- **URL**: Saved in `links_config.json`. In Google Sheets, this appears on a **hidden tab** named `_links_config`.

### 3. Runtime Merging
During startup (`main.jsx`), `links_config.json` is loaded. The engine automatically appends URLs back to data objects with the `_url` suffix.

---

## 🏗️ Managed Monorepo Architecture (v8.2+)

Athena CMS Factory uses a **Managed Monorepo** structure to maximize disk efficiency and ensure dependency consistency across all 35+ sites.

### 1. Centralized node_modules
All dependencies are installed in the **project root**. Individual sites in the `sites/` directory use `pnpm workspaces` to symlink their dependencies.
- **Old Structure**: ~120MB per site (3.5GB+ total).
- **New Structure**: Shared root modules (Significant disk savings).

### 2. Standard Commands
Always run dependency-related commands from the **monorepo root**:
- `pnpm install`: Installs and syncs all dependencies system-wide.
- `pnpm sites:build`: Triggers a production build for **all** sites simultaneously.
- `pnpm --filter [site-name] build`: Builds a specific site.
- `pnpm factory:start`: Starts the Dashboard and Site Reviewer.

---

## Important Development Rules

### 1. LogManager & Logging
Use `LogManager` for all logging needs. Avoid direct `console.log` calls in production code.

### 2. Template Literals & Generator Logic
Source code is generated in `5-engine/logic/` files. ALWAYS use `\$` for dollar signs in generated code to avoid conflicts with Node.js.

### 3. BaseURL & Deployment
ALWAYS use `import.meta.env.BASE_URL` in React components for assets and links. This ensures sites work correctly in GitHub Pages subfolders.

### 4. React Router v7 Ready
Always activate v7 future flags in `App.jsx` to prevent console warnings:
```javascript
<Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
```

---

## Data Workflow (JSON-First)

### 🛡️ Mandatory Data Guard
The factory engine (`factory.js`) guarantees that every site includes the following files upon creation:
- `section_order.json`: Section sequence.
- `site_settings.json`: Branding & Logo (Array).
- `contact.json`: Business & Contact Info (Array).
- `display_config.json`: Field visibility.
- `style_bindings.json`: Design settings from the Dock.

### 🎨 Style Bindings
Design choices (fonts, colors, shadows) are stored in `style_bindings.json`. Use the `useMemo` hook in `App.jsx` to apply these styles directly to `:root` via CSS variables.

---

## Cloud Sync & CMS Workflow

Athena uses Google Sheets as a Headless CMS. Synchronization is bidirectional and managed via the **Google Sheet Manager** (powered by `AthenaDataManager`) in the Factory Dashboard:

### 📤 Push Sync (Local -> Cloud)
Managed by `sync-full-project-to-sheet.js` via `AthenaDataManager`.
- **Action**: Visual changes in Athena Dock are saved locally and then pushed to the cloud.
- **Intelligence**: Automatically creates missing tabs in Google Sheets based on local JSON files.
- **Provisioning**: If no sheet is linked, it automatically triggers provisioning.

### 📥 Pull Sync (Cloud -> Local)
Managed by `sync-sheet-to-json.js` via `AthenaDataManager`.
- **Action**: Fetches raw data from Google Sheets and overwrites `src/data/`.
- **Safety**: Automatically creates a timestamped backup in `sites/[project]/backups/` before overwriting.

### 🔍 Media Auditor
To safely manage project images without breaking the site, use the **Media Auditor**:
`node factory/6-utilities/audit-media.js <project-name>`

### 🛡️ Safe Ingress (GitHub Sync)
When opening a site in the Dock, the system automatically checks if it is connected to a GitHub repository.
- **Drift Detection**: It fetches origin to detect data drift between local and GitHub.
- **Safe Pull**: If a pull is requested, the system **automatically creates a local backup** of the `src/data/` directory before pulling from GitHub.
- **Sparse Checkout**: The pull operation uses `git sparse-checkout` to only pull the specific site directory, preventing the monorepo from overriding other sites.
- **Temporary Data Pulls**: `pull-to-temp` is used to fetch Sheet data into a separate `src/data-temp/` directory for safe comparisons against local edits before syncing.

## 📝 Git Workflow SOP
1.  **Sync**: `git pull origin main` for factory and dock.
2.  **Develop**: Make changes in boilerplates or engine.
3.  **Test**: Generate a test site.
4.  **Audit**: Run `audit-media.js` before deleting any assets.
5.  **Commit**: Prefix messages with `feat:`, `fix:`, or `docs:`. 
6.  **Push**: Check remotes with `git remote -v` before pushing.

---

## 🏛️ Governance & Data Architecture

Since v7.5, Athena has employed a strict management model ("Governance") to ensure customer data integrity and keep the Google Sheets interface clean.

### 1. Governance Modes
Each site has a `governance_mode` in `athena-config.json`:

*   **`dev-mode` (Development)**:
    *   Full bidirectional sync (Push & Pull).
    *   Developer has complete control over both content and layout.
*   **`client-mode` (Production)**:
    *   **Push Lock**: The "Push to Google Sheets" button in the Dock is locked (padlock icon).
    *   **Sheet-First Content**: The client manages all text via Google Sheets. The developer manages the style.

### 2. Clean Sheet Architecture (Style/Content Separation)
To prevent clients from seeing "JSON code" in their Google Sheet, data and form are physically separated:

*   **Google Sheets**:
    *   `site_settings` (Tab): Contains only human-readable text (title, email, tagline).
    *   `_style_config` (Hidden Tab): Contains all technical design variables (colors, fonts, shadows).
*   **Local (`src/data/`)**:
    *   `site_settings.json`: Content only.
    *   `style_config.json`: Design settings.
*   **Runtime Merge**:
    During site startup (`main.jsx`), these two sources are merged back in memory.

## 🖥️ Dashboard (v8.0 Updates)

The Athena Dashboard (Port 5001) has been enhanced to support new operational needs.

### 1. Storage & Health Tab
A new dedicated tab provides visibility into the **Hydration Management System**.
*   **Disk Usage**: Real-time visualization of `node_modules` vs project data.
*   **Actions**:
    *   **pnpm Prune**: Cleans the global pnpm store.
    *   **Clean Sites**: Triggers `storage-prune-all` to dehydrate inactive sites and sweeps all `src/data-temp/` directories older than 3 weeks to save space.
    *   **Logs**: View and rotate system logs.

### 2. Marketing Tools
Integrated directly into the interface, allowing one-click execution of `MarketingController` functions:
*   **Blog Generator**: Prompts for a topic and generates a blog post (syncs to Sheet).
*   **SEO Optimizer**: Generates/Refines meta tags based on site content (syncs to Sheet).

### 3. Server Management
The sidebar now includes status indicators for all core services (Dashboard, Dock, Layout Architect, Media Visualizer).

### 4. URL Manager & URL Registry
Centralized control over production deployments and local entry points.
*   **URL Manager Tab**: View and edit the `localUrl`, `liveUrl` and `repoUrl` for every project in the `sites/` folder.
*   **Automated Sync**: The "Sync Registry" button scans all folders and updates the central `dock/public/sites.json`.
*   **Fallback Intelligence**: If a site is marked as "live" but has no URL, the system automatically predicts the correct GitHub Pages URL.
