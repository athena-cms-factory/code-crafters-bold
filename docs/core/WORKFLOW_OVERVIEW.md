# Athena CMS Factory - Operational Workflow

This document describes the complete cycle of website creation within the Athena Factory, from raw input to a live, editable website. The architecture is designed for maximum flexibility and is fully optimized for **Gemini 3.0**.

## 🏛️ Visual Overview (Architecture)

```text
       [ 1. ANALYSIS PHASE ]
               |
      (raw-input.txt) ---------------------------+
               |                                 |
               v                                 v
    [ SITETYPE GENERATOR ] <---------- [ 🧠 GEMINI 3.0 ARCHITECT ]
    (6-utilities/generate-sitetype-from-input.js)
               |
               +---> [ BLUEPRINT.json ] (Structure/Database)
               +---> [ PARSER-PROMPT  ] (Data extraction instructions)
               +---> [ REACT TEMPLATES] (App.jsx, Section.jsx, etc.)
               |
               v
       [ 2. STRUCTURE PHASE ]
               |
      (blueprint.json + raw-input.txt)
               |
               v
       [ AI PARSER ENGINE ] <--------- [ 🧠 GEMINI 3.0 EXTRACTOR ]
       (5-engine/parser-engine.js)
               |
               +---> [ JSON DATA ] (Primary source for the site)
               +---> [ TSV DATA  ] (Optional export for Google Sheets)
               |
               v
       [ 3. GENERATION PHASE ]
               |
    [ FACTORY ENGINE (factory.js) ] <--- [ BLUEPRINT + TEMPLATES ]
               |
               v
    [ LIVE WEBSITE (sites/project) ] <--- [ JSON DATA SYNC ]
               |
               |       [ 4. REFRESH & ITERATION PHASE ]
               |                  |
               +------------------+---> [ MODIFY BLUEPRINT ] (e.g., add column)
                                  |           |
                                  +-----------+---> [ RE-PARSE DATA ] (AI fills gaps)
                                  |           |
                                  +-----------+---> [ REGENERATE SECTION ] (Code update)
```

## 📋 Phase Details

### 1. Analysis Phase (AI Blueprinting)
In this phase, the AI determines the best data structure for the business.
- **Input:** `raw-input.txt` (unstructured text) in the **Data Source** folder.
- **Process:** The `generate-sitetype-from-input.js` utility calls Gemini to define tables and columns.
- **Output:** A new sitetype in `3-sitetypes/[track]/[name]`.

### 2. Structuring Phase (AI Data Parsing)
The AI converts raw text into factual data.
- **Modern Flow (v6+):** The parser now generates **JSON** files directly as the primary source for the website.
- **TSV Support:** TSV files are still generated as a secondary output for easy import into Google Sheets.
- **Location:** `input/[data-bron]/json-data/`.

### 3. Generation Phase (Factory Engine)
The `factory.js` engine builds the physical website.
- **Smart Layout Generator:** Dynamically builds `Section.jsx` based on the blueprint.
- **Sync:** JSON data is copied directly from the **Data Source** folder to the new site's `src/data/`.
- **Output:** A functional React 19 / Tailwind v4 site in `sites/[sitename]`.

### 4. Refresh & Iteration Phase (Data Gateway)
This is the "living" phase of the project, managed via the **Data Gateway**.
- **Source of Truth:** The system supports three data sources: Google Sheets (Cloud), Local JSON (Visual edits), and TSV (Legacy/Agent).
- **Data Gateway Hub:** 
    - **Pull from Cloud:** Syncs the latest changes from the Google Sheet to the local site.
    - **Push to Cloud:** Pushes local visual edits (from Athena Dock) to the Google Sheet.
    - **Pull from local input folder:** Re-injects data from local TSV files into the site's JSON.
- **Schema Refresh:** You can adjust the blueprint at any time (e.g., add a 'price' column) and re-sync via the Gateway.

### 5. Deployment & Live Management Phase
Once a site is ready for the world, it is moved to production.
- **GitHub Pages:** Sites are published to the `athena-cms-factory` organization.
- **URL Manager:** Use the centralized Dashboard tool to manage Local/Live URLs and repository links.
- **Link Resolution:** The `resolve-localhost-links.js` utility ensures all internal links point to live URLs.
- **Central Registry:** All live sites are tracked in `dock/public/sites.json` for easy cross-linking within the Athena Dock.

## 🚀 Key Advantages
1.  **Gemini 3.0 Ready:** Robust handling of "thought signatures".
2.  **Two-Track Policy:** Choice between `docked` (lightweight, managed via Dock) and `autonomous` (independent).
3.  **Data-First:** The site adapts to the data, not the other way around.
