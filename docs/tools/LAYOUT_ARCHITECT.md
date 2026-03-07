# Developer Guide: Athena Layout Architect

The **Layout Architect** is the bridge between a logical data structure (Blueprint) and the physical React/Tailwind implementation of a SiteType. It allows developers to define how data tables are mapped to visual UI components.

## 🔄 Data Flow & Architecture

### 1. Source (Input)
The tool reads from the **Blueprint** of a SiteType:
- **Path:** `factory/3-sitetypes/[track]/[sitetype]/blueprint/[sitetype].json`
- **Content:** Tables, columns, and features defined for this business vertical.

### 2. Orchestration (The Mapping)
The developer (or AI) creates a **Mapping Configuration**:
- **Header:** Links branding fields (name, logo) to the navigation bar.
- **Hero:** Defines the call-to-action logic.
- **Sections:** An ordered list of tables that should be rendered as physical sections on the page.

### 3. Destination (Output)
The tool generates a complete visual layout folder:
- **Path:** `factory/3-sitetypes/[track]/[sitetype]/web/[layout-name]/`
- **Files generated:**
    - `App.jsx`: The main entry point and layout skeleton.
    - `components/Header.jsx`: Navigational UI.
    - `components/Section.jsx`: The dynamic engine that maps data rows to UI blocks.
    - `index.css`: The Tailwind v4 design system (colors, fonts, custom utilities).
    - `main.jsx`: The data-bootloader (copies from boilerplate).

## 🛠️ How to use the Tool

1.  **Select SiteType:** Choose the blueprint you want to design for.
2.  **Suggest Mapping (AI):** Let Gemini analyze the blueprint and propose which tables should become sections.
3.  **Refine UI Preferences:** Add natural language instructions (e.g., "Use a dark theme with neon accents", "Make the hero section 70% height").
4.  **Generate:**
    - **AI Mode:** Full code generation via Gemini 3.0 (best for unique designs).
    - **Standard Mode:** Uses the internal `standard-layout-generator.js` for consistent, reliable Athena-standard components.
5.  **Review:** The new layout is immediately available in the **Site Wizard** when generating a new site.

## 💡 Developer Tips
- **Naming:** Give your layouts descriptive names like `modern-dark` or `corporate-minimal`.
- **Section IDs:** The generated `Section.jsx` automatically applies IDs based on table names (e.g., `id="services"`) to support smooth-scrolling anchor links.
- **Customization:** After generation, you can manually fine-tune the code in the `web/[layout-name]/` folder. The factory engine will preserve your manual changes during site generation.
