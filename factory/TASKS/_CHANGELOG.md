# Changelog - Athena CMS Factory

## [7.9.4] - 2026-02-15
### Added
- **Stripe Checkout Integration**: Native support for real-world payments (Bancontact, Payconiq, iDEAL, Creditcard, PayPal) across all docked webshops.
- **Secure Payment Gateway Proxy**: Implemented `PaymentController.js` to handle Stripe sessions server-side, protecting secret API keys.
- **Hybrid Checkout System**: Upgraded all e-commerce templates to support both automated Stripe payments and manual email-based orders.
- **Interactive Roadmaps v2**: Expanded the roadmap system with Expert tracks for E-commerce and detailed accordion-based guidance.

### Fixed
- **System Path Alignment**: Unified `ROOT_DIR` and `ATHENA_ROOT` variables in `.env` to prevent absolute path resolution errors.
- **Manual Site Synchronization**: Upgraded `Checkout.jsx` in existing sites (`chocolade-shop`, `urban-soles`, `demo-bakkerij`, `athena-pro`) to support the new payment flow.

## [7.9.3] - 2026-02-15
### Added
- **Gmail IMAP Integration**: Successfully transitioned the Athena Gateway to a dedicated Gmail account (`athena.cms.agent@gmail.com`).
- **IMAP Verification Suite**: Added `factory/tests/verify-imap.js` for quick connectivity testing.

## [7.9.2] - 2026-02-09
### Added
- **Universal Field Typing**: Introduced `data-dock-type` attribute for `EditableLink`, `EditableMedia`, and `EditableText` to guarantee the correct Dock editor modal (Link vs Media vs Text) regardless of field name.
- **Shift+Click Testing Support**: Standardized `Shift+Click` logic in `dock-connector.js` across all sites, allowing users to test links and functionality in the visual editor.

### Fixed
- **Object-Based Link Logic**: Updated `EditableLink` and `vite-plugin-athena-editor.js` to handle and persist full link objects (label + url) instead of splitting them. This prevents URLs from being overwritten by labels.
- **Showcase Data Integrity**: Restored and corrected `showcase.json` in `athena-hub` with the new object-based link structure.
- **Bulk Site Synchronization**: Automatically synchronized component updates and connector logic to all projects in the `sites/` directory.

## [7.9.1] - 2026-02-09
### Added
- **Dynamic Dev Base Path**: Vite configuration now automatically detects and sets the correct `base` path (e.g., `/project-name/`) during development. This ensures perfect compatibility with the dashboard's subfolder preview and fixes Service Worker registration errors.
- **Smart Public Asset Transformation**: The factory engine now recursively scans and transforms placeholders in `public/` assets (like `manifest.json` and `sw.js`) during site generation.
- **Mandatory Data Guard**: Expanded `factory.js` to automatically generate `style_config.json`, `layout_settings.json`, and `section_settings.json` to prevent import errors in the main entry point.

### Fixed
- **Vite Port Placeholder**: Resolved a critical syntax error in the `vite.config.js` template where the `{{PORT}}` placeholder was malformed and missing closing braces.
- **Robust Data Loading**: Migrated `demo-bakkerij` and `chocolade-shop` from brittle static imports to the dynamic `import.meta.glob` pattern, making them resilient to missing data files.
- **CSS Path Resolution**: Fixed a broken `@import` reference in `demo-bakkerij` where `index.css` failed to find the theme file in the `src/css/` subdirectory.
- **Robust Engine Replacement**: Upgraded the `ProjectGenerator` in `factory.js` to use a global regex for placeholder replacement, ensuring that `{{ PORT }}` and `{{PORT}}` (with or without spaces) are both correctly identified and replaced.
- **Showcase Restoration**: Manually restored the `demo-consultant` and `demo-bakkerij` sites by fixing their corrupted `vite.config.js` files, resolving "Connection Refused" errors and Service Worker MIME type issues.

## [7.8.9] - 2026-02-07
### Added
- **Push/Pull Sync Workflow**: Streamlined the dashboard's data synchronization into two clear actions: Push (Local -> Cloud) and Pull (Cloud -> Local).
- **Media Auditor**: New utility `audit-media.js` to detect broken image links and safely identify unused assets.
- **Service Account Provisioning**: Added support for Service Account authentication in `auto-sheet-provisioner.js` to ensure reliable sheet creation when OAuth tokens expire.
- **Manual Actions Guide**: Integrated a "Manual Actions" checklist into the Google Sheet Manager to guide users through public TSV publishing requirements for GitHub Pages.

### Changed
- **Universal Site Pathing**: Updated all engine scripts and the dashboard backend to automatically resolve site directories regardless of whether they use the `[id]` or `[id]-site` naming convention.
- **Enhanced Full Sync**: Merged "Visual Edits" migration logic into the primary Push Sync engine, ensuring automatic style-splitting for all projects.
- **Dashboard UI Cleanup**: Optimized the Google Sheet Manager modal with a more compact, three-button grid and clearer instructional text.

### Fixed
- **Chocolade Shop Restoration**: Resolved a critical issue where the site appeared empty due to missing `style_config.json` imports in the React entry point.
- **OAuth Quota Fallback**: Properly handled Drive storage quota errors by strictly enforcing OAuth for user-owned folder operations while keeping Service Account as a fallback.
- **Reverse Sync Pathing**: Fixed `sync-json-to-tsv.js` to correctly resolve absolute paths when called from the dashboard API.

## [7.8.6] - 2026-02-06
### Added
- **Standardized Section Layouts**: Enhanced `Section.jsx` to dynamically load and apply layouts (`Grid`, `List`, `Z-Pattern`) from `layout_settings.json`.
- **Smart Icon Mapping**: Implemented a central `iconMap` that automatically translates descriptive database keys (e.g., `Table`, `Zap`, `Smartphone`) to professional FontAwesome classes.
- **Enhanced Data Loading**: Updated `main.jsx` template to explicitly bundle `layout_settings.json`, ensuring consistent layout application across all environments (Local & Dock).

### Changed
- **Centering-First Strategy**: Enforced `items-center` and `text-center` as the default alignment for Grid and List layouts to ensure a high-end, balanced visual aesthetic.
- **Athena Hub Refinement**: Unified all data keys in `voordelen.json` to the standard `titel` (from `title`) for better regex detection.
- **Improved Grid Styling**: Upgraded Grid items with larger icons (`text-4xl`), increased padding (`p-10`), and enhanced shadow/hover effects for a more premium card feel.

## [7.8.5] - 2026-02-06
### Added
- **Dock Interaction Upgrade**: Implemented `Shift + Click` support in the site-preview. Users can now test links and buttons directly in the Dock by holding Shift, preventing conflicts with the visual editor.
- **Scroll to Top**: Added automatic "scroll to top" functionality when clicking the site logo or title in the header.
- **Dock Design Controls**: Expanded the Design Editor sidebar with granular controls for `Hero Min Height`, `Hero Max Height`, and `Hero Aspect Ratio`.

### Changed
- **Header Overlap Resolution**: Adjusted the Hero section layout with top padding (`pt-24`) to ensure content is no longer hidden behind the fixed header.
- **Robust Anchor Navigation**: Implemented unique section IDs across all factory templates and existing sites to ensure reliable anchor link scrolling.
- **Global Synchronization**: Executed a suite of migration scripts to normalize hero settings, header logic, and dock connectors across the entire site ecosystem.

## [7.8.4] - 2026-02-06
### Added
- **Dynamic Hero Height & Aspect-Ratio**: Introduced support for `hero_height`, `hero_max_height`, and `hero_aspect_ratio` settings in the site theme engine.
- **Improved Hero Image Alignment**: Implemented `object-top` positioning for hero images to ensure the top of the image remains visible on wide screens.
- **Dynamic Hero Sizing**: Updated `standard-layout-generator.js` to generate hero sections that adapt their height based on the aspect ratio, while respecting min/max height constraints.

### Changed
- **Athena Hub Upgrade**: Manually applied the new dynamic hero settings to `athena-hub` for immediate visual testing and demonstration.

## [7.8.3] - 2026-02-05
### Added
- **Dynamic AI Waterfall Sync**: New script `sync-ai-waterfall.js` that automatically updates `ai-models.json` with the latest free models from OpenRouter.
- **Robust AI Response Parsing**: Enhanced `ai-engine.js` with advanced JSON extraction logic to handle various AI output formats (markdown, thinking tokens, leading/trailing text).
- **Documentation**: Added `sync-ai-waterfall.md` and overhauled `ai-engine.md`.

### Changed
- **AI Art Director Upgraded**: `generate-image-prompts.js` now uses the central `ai-engine.js` waterfall, making it significantly more reliable across different AI providers.

## [7.8.2] - 2026-02-05
### Added
- **Hero BG Color Picker**: Added a dedicated color picker for the Hero section background in the Athena Dock, mapped to the new `--color-hero-bg` CSS variable.
- **Visual Media Feedback**: Enhanced `EditableMedia` component with visual cues (pointer cursor, blue ring on hover) to make editable images easily discoverable.

### Changed
- **Responsive Dock Sidebars**: Implemented fluid sidebar widths (`w-60` to `w-80`) in the Athena Dock to optimize site-preview space on smaller screens.
- **Robust Hero Rendering**: Upgraded `athena-hub`'s `Section.jsx` to correctly identify and render the `hero` data table as a full-width hero section.
- **Dynamic CSS Theme Mapping**: Updated the theme engine in `App.jsx` to support array-based mappings, allowing one setting to update multiple CSS variables (e.g., `--color-card-bg` and `--color-surface`).

### Fixed
- **Hero Image Mapping**: Resolved an issue where the Hero section failed to display images due to case-sensitivity and naming mismatches (`image` vs `hero_afbeelding`).
- **Data Path Duplication**: Cleaned up redundant `images/` prefixes in JSON data files for `athena-hub`.
- **System Section Filtering**: Prevented `site_settings` from being rendered as a physical section on the page.

## [7.6.4] - 2026-02-05
### Fixed
- **Browser Security Fix**: Resolved `ERR_UNSAFE_PORT` by moving `athena-pro` from port 6000 to 6001.
- **Robust Port Assignment**: The generator engine (`factory.js`) now explicitly avoids unsafe port 6000 during random assignment.
- **Auto-Port Registration**: Implemented automatic saving of newly assigned ports to `factory/config/site-ports.json` during site generation.
- **Conflict Prevention**: Added checks to ensure unique port assignments across the entire site ecosystem.

## [7.8.1] - 2026-02-05
### Improved
- **Unified Server Management**: Consolidated site previewing logic by removing the redundant fixed "Site Preview" card in favor of the dynamic "Active Site Servers" section.
- **Dashboard UX Consistency**: Standardized the layout and styling of active site server cards to match the primary dashboard grid system.
- **Hub Quick-Access**: Integrated a direct link to the Athena Hub ecosystem within the server management view.

## [7.8.0] - 2026-02-04
### Added
- **Dashboard Multi-Port Support**: Support for simultaneous site previews on native ports.
- **Auto-Reloading Launcher (adash)**: Modified the dashboard launcher to automatically recycle existing processes, ensuring the latest code is always active upon execution.
- **Centralized Port Registry**: Introduced `factory/config/site-ports.json` as the single source of truth for stable port assignments across the factory and dashboard.
- **Dynamic Site Resolution**: Upgraded `server.js` to automatically detect ports from `vite.config.js` or the central registry, ensuring conflict-free site previews.

### Changed
- **Port Stability**: Switched from random port assignment to stable, project-specific ports for all showcase sites.
- **Relative Base Paths**: Updated all site templates and existing projects to use `base: './'`, improving portability and HMR stability.

## [7.7.0] - 2026-02-04
### Added
- **Showcase Ecosystem Expansion**: Successfully integrated four distinct business verticals into a unified demonstration ecosystem.
- **Athena Hub**: Launched the central entry point for the showcase gallery, cross-linking all demonstration sites.
- **Urban Soles Content Explosion**: Merged the Jules 2.0 content branch featuring 20+ AI-generated products with high-quality descriptions and images.
- **Service/Webshop Verticals**: Added new demo sites for Consultant, Bakery, and Portfolio niches with optimized sitetype blueprints.

### Improved
- **Dashboard UI/UX (Jules 2.0)**: Integrated granular project management (Separate Delete for Site/Data/Remote) and RAM-optimized site scanning.
- **Tool Descriptions**: Added comprehensive modal descriptions for all factory tools to improve developer onboarding.

## [7.6.3] - 2026-02-04

### Fixed
- **Dashboard Install Hang**: Resolved a critical frontend crash in `app.js` where `previewSite` failed when called without an event object.
- **Enhanced Install Logging**: Updated `server.js` to pipe `pnpm install` output to dedicated log files in `output/logs/` for better troubleshooting.
- **Robust Footer Data**: Repopulated `chocolade-shop` contact data and updated `Footer.jsx` with more resilient field discovery (case-insensitive, fallback to `order_email`).
- **Environment Restoration**: Successfully restored all `node_modules` for the Factory and Dock after migration.


## [7.6.2] - 2026-02-01
### Added
- **Display Config (Visibility)**: Integrated visibility logic into SPA boilerplates. `Section.jsx` and `App.jsx` now respect `hidden_fields` and section-level `visible` flags by default.
- **Shared DisplayConfigContext**: Moved `DisplayConfigContext` to shared components for consistent usage across projects.

### Fixed
- **Build Error (karel-portfolio-ath)**: Resolved a critical "Identifier already declared" error in `App.jsx` caused by a duplicate `DisplayConfigProvider` import.
- **Factory Template Bug**: Fixed an undefined `items` variable in the SPA boilerplate `Section.jsx` (replaced with `data`).
- **Standardized Port Mapping**: Aligned documentation and launchers with the new 4GB-safe port structure (Dashboard: 4001, Dock: 4002, Site: 3000).

## [7.6.1] - 2026-02-01
### Added
- **Editable Buttons & Links**: Introduced the `EditableLink` component, enabling full visual control over both button/link text and their destination URLs.
- **Dual-Input Link Editor**: Upgraded the Athena Dock Visual Editor with a specialized "Link Mode" that allows simultaneous editing of Label and URL.
- **Hidden URL Storage Architecture**: Implemented a "Split-Save" mechanism where link labels remain in the primary content files while URLs are stored in a dedicated `links_config.json`.
- **Cloud CMS Expansion**: Integrated `_links_config` as a hidden tab in Google Sheets, keeping the customer-facing content sheets clean while providing full URL management.
- **Automated Data Merging**: Updated the site engine (`main.jsx`) to automatically merge URLs back into data objects at runtime (e.g., `cta_url`).
- **Global Maintenance Script**: Created `factory/6-utilities/update-all-sites.js` to automatically propagate the new link infrastructure to all existing projects.

## [7.6.0] - 2026-02-01
### Added
- **Smart Safety Modals**: Replaced standard browser alerts with custom `PullModal` and `SyncModal` components in Athena Dock. These modals feature a checklist of prerequisites (Publish to Web, Sharing, Dashboard Status) and a mandatory "Controle uitgevoerd" checkbox.
- **Automated Log Rotation**: Introduced `rotate-logs.js` utility to maintain disk health by keeping only the 10 most recent logs for all launch types. Integrated into `launch.sh` and `launch-dashboard.sh`.
- **Pro Footer & CTA**: Upgraded the portfolio sitetype (`karel-portfolio-ath`) with the high-impact contact section and refined footer from the `athena-pro` template.

### Fixed
- **Dashboard Port Mismatch**: Corrected `launch-dashboard.sh` to target port 3001, resolving 'Connection Refused' errors during Dock operations.
- **Contact Data Loading**: Fixed a bug where contact information was not displayed due to missing "contact" entry in `section_order.json`.
- **Portfolio Header**: Refined the portfolio header with a dark theme and `backdrop-blur` for better visual consistency.
- **Data Recovery**: Successfully restored site data for `karel-portfolio-ath` from local backup after a failed cloud pull.

## [7.5.2] - 2026-01-31
### Fixed
- **Race-Condition Save**: `handleEditorSave` in the Athena Dock now awaits server confirmation before refreshing, preventing changes from reverting on slow hardware.
- **Formatting Persistence**: Fixed a mismatch in style binding keys (colon vs underscore) and updated `EditableText` to correctly retrieve saved styles on load.
- **Smart Click-Sensing**: The site now passes computed CSS styles to the editor modal, ensuring it opens with the correct current state (bold, font-size, etc.).
- **Portfolio Sitetype Upgrade**: Converted the static portfolio boilerplate into a dynamic section-based architecture, enabling full Dock section management.
- **Circular Hero Images**: Standardized profile pictures to be circular (`rounded-full`) in the portfolio templates.
- **Base URL Fix**: Set `base: './'` in `vite.config.js` for portfolio sites to eliminate 404 errors and path warnings in the Dock.

## [7.5.1] - 2026-01-31
### Added
- **Smart Asset Scavenging**: The factory engine now automatically scans JSON data for image references and recovers the physical files from `input/` or `inputsites/`.
- **Guaranteed Data Sync**: Implemented direct `fs.cpSync` handover for JSON data during site generation, ensuring no site starts empty if external sync scripts fail.
- **Recursive Asset Discovery**: The scavenging logic now searches recursively through source directories to find missing media.

## [7.5.0] - 2026-01-31
### Added
- **Advanced Undo/Redo Engine**: The Athena Dock now supports undoing/redoing item deletions and additions in data lists.
- **Server-Side Restore Action**: Added `action: 'restore'` to `vite-plugin-athena-editor.js`, allowing precise insertion of objects back into JSON arrays at specific indices.
- **Intelligent History Capture**: `deleteItem` now captures the full object before deletion, enabling a perfect restoration during undo.
- **Add-Action History**: Undoing an item addition now correctly removes the newly created item from the backend.

### Fixed
- **History RAM Optimization**: Restricted the history stack to the last 20 actions to maintain stability on low-memory (4GB) systems.

## [7.4.3] - 2026-01-30
### Added
- **Centralized Port Management**: Introduced system-wide port configuration in `.env` (`DASHBOARD_PORT`, `DOCK_PORT`, `LAYOUT_EDITOR_PORT`, etc.) for better portability on restricted systems like Chromebooks.
- **Dynamic Dashboard API**: The dashboard frontend now uses `window.location.origin` for API calls, eliminating hardcoded port issues and ensuring the UI always reaches its backend.
- **Dynamic Tool Launching**: Layout Architect and Media Mapper now launch on ports defined in `.env` and are correctly opened by the dashboard using dynamic redirection.

### Fixed
- **Dashboard Site Visibility**: Resolved a critical issue where the dashboard couldn't load sites or project data due to a hardcoded port mismatch (API was looking at 3000 while server ran on 3001).
- **Header Server Info**: The dashboard header now dynamically displays the actual host and port it is running on.

## [7.4.2] - 2026-01-30
### Added
- **Super Sync Engine**: Introduced `sync-full-project-to-sheet.js` which automatically creates missing tabbladen in Google Sheets and refreshes GID mappings.
- **Data Pull with Backups**: The "Pull from Google Sheets" action now automatically backs up local JSON data to a timestamped folder before overwriting.
- **Enhanced Dock Dialogs**: Added clear instructions and troubleshooting tips for "Publish to Web" and sharing settings directly in the Athena Dock UI.

### Changed
- **Upgraded Sync Logic**: The standard "Sync" button now uses the Super Sync engine for better reliability and auto-initialization of cloud CMS.
- **Service Account Fallback**: All engine tools now prioritize `sheet-service-account.json` but gracefully fall back to `service-account.json`.

## [7.4.1] - 2026-01-30
### Added
- **Auto-Provisioning on Sync**: The Dashboard now automatically detects if a project is missing a Google Sheet during sync and triggers `auto-sheet-provisioner.js` to create and link one instantly.
- **High-Impact CTA Block**: Redesigned the contact section into a modern, high-conversion Action Block with clear call-to-actions and automatic email subject lines.
- **Smooth Scroll Navigation**: Implemented automatic anchor ID generation for all sections and smooth scroll logic for Hero CTA buttons.

### Changed
- **Enhanced Theme Mapping**: Expanded the `App.jsx` theme engine to support specific `light_title_color` and `dark_title_color` variables.
- **Boilerplate Decoupling**: Removed hardcoded text and background colors from `Section.jsx` and `AboutSection.jsx` to ensure full compliance with global CSS variables.
- **Refined Hero Layout**: Optimized vertical spacing and title positioning in the Hero section for a more premium visual balance.

### Fixed
- **Colorpicker Overrides**: Fixed issue where "Button BG" and "Background" colorpickers were ignored due to hardcoded Tailwind classes.
- **Duplicate Sections**: Resolved a bug where the contact section was rendered twice (once in loop, once as footer).
- **Data Mapping**: Fixed broken data bindings in the contact section (mapped `title` to `titel` and `location` to `locatie`).

## [7.3.3] - 2026-01-29
### Fixed
- **HMR Data Sync**: Removed `ignored: src/data` from `vite.config.js` across the factory and all generated sites. This ensures that changes made via the Athena Dock are immediately picked up by the site's `import.meta.glob` data loader.

## [7.3.2] - 2026-01-29
### Added
- **Feature-Driven Architecture**: The Factory now uses explicit `features` flags in `blueprint.json` to toggle logic.
- **Modular Search Component**: Introduced `google_search_links` as a toggleable feature for scientific sitetypes.
- **Robust Layout Templates**: Refactored `standard-layout-generator.js` to use a cleaner, single-template block approach.

### Changed
- **De-coupled E-commerce**: Removed name-based detection ("shop") in favor of the `"ecommerce": true` blueprint flag.
- **Improved Content Rendering**: The general section renderer now supports rich text and image mapping for non-shop items.

### Fixed
- **Template Literals Bug**: Resolved nested backtick and dollar-sign interpolation errors in the generator.

## [7.3.1] - 2026-01-29
### Added
- **Feature Flagging System**: Introduced a structural separation between Shop and Non-Shop code in the common boilerplates.
- **Conditional Boilerplates**: Implemented `{{SHOP_...}}` and `{{NON_SHOP_...}}` tag support in `factory.js`.
- **Mandatory Routing**: `react-router-dom` is now a standard dependency for all new sites to support modern UI components.

### Fixed
- **Feature Leakage**: Prevented `useCart` and `CartProvider` errors on non-shop sites (like `science-article-type`).
- **Syntax Errors**: Fixed several template string interpolation bugs in `standard-layout-generator.js`.
- **ReferenceError**: Resolved `Section is not defined` crash during site generation.

## [7.3.0] - 2026-01-29
### Added
- **AI Survival Engine v4.0**: Completely overhauled AI engine with multi-provider failover support (Google, Groq, OpenRouter, Hugging Face).
- **Multi-Tier Model Waterfall**: Centralized model management in `config/ai-models.json` with 6 gelaagde tiers for maximum redundancy.
- **DeepSeek Reasoning Filter**: Automatic extraction of content from `<think>` tags to prevent JSON parsing errors.
- **Diversified AI Stacks**: Support for task-specific model chains in `.env`.
- **Science Article Sitetype**: New specialized sitetype for scientific and informational content.

### Changed
- **Parser Engine Upgrade**: `parser-engine.js` now uses the centralized survival engine and implements automatic fallback to the full waterfall.
- **Sitetype Generator Upgrade**: `generate-sitetype-from-input.js` now respects environmental model stacks and uses the central AI engine.
- **Enhanced .env.example**: Fully documented all new AI variables and infrastructure settings.

### Fixed
- **Quota Failures**: Resolved issue where site generation would stall due to Google Cloud quota limits by implementing automatic diversification.

## [7.2.0] - 2026-01-28
### Added
- **Infrastructure Migration**: Successfully migrated the entire Athena ecosystem (GitHub & Google Cloud) to the dedicated `athena-cms-factory` organization account.
- **Robust Data Loading**: Implemented `import.meta.glob` in `factory.js` and `main.jsx` templates for all new sites.
- **Auto-Provisioning 2.0**: Enhanced `auto-sheet-provisioner.js` with clean exit logic and seamless integration with the new organization credentials.
- **Mandatory Data Guard**: The factory engine now automatically generates mandatory system files (`layout_settings.json`, `display_config.json`, etc.) if they are missing from the source.

### Changed
- **Production Stability**: Switched from dynamic `fetch` calls to bundled JSON imports in the SPA boilerplate to prevent 404 errors on GitHub Pages.
- **SSH Alias Support**: Integrated `github-athena` SSH alias into the deployment flow for cleaner multi-account management.

### Fixed
- **Process Hang**: Resolved an issue where `auto-sheet-provisioner.js` would not terminate after successful execution.
- **Build Failure**: Fixed a critical build error in the `chocolade-shop` caused by missing optional JSON configuration files.

## [7.1.0] - 2026-01-27
### Added
- **Expanded Design Editor**: The Athena Dock now features granular color controls for Button BG, Card BG, and Header BG in both Light and Dark modes.
- **Global Theme Settings**: Introduced "Global Theme Settings" in the Dock sidebar to control `Corner Radius` and `Shadow Intensity` site-wide.
- **Visual Style Switcher**: The Dock now supports swapping between different base CSS themes (`modern.css`, `classic.css`, `modern-dark.css`) via a dedicated backend action.
- **Theme Persistence**: Added a mechanism in `App.jsx` to apply saved theme settings from `site_settings.json` on initial load and refresh.

### Fixed
- **Header Persistence**: Fixed a bug where header text changes were lost after refresh by explicitly mapping header data to `basisgegevens.json`.
- **Editor Contrast**: Improved contrast in the `VisualEditor` modal; dropdown menus now use white text on dark backgrounds for better readability.
- **ReferenceError Fix**: Resolved `useMemo is not defined` error in generated sites and factory templates.
- **Media Editing Reliability**: Enhanced `dock-connector.js` to correctly identify and update media within complex container structures, preventing images from disappearing during edits.

## [7.0.0] - 2026-01-27
### Added
- **Native Webshop Engine**: The factory now automatically detects webshop sitetypes and injects e-commerce logic.
- **Smart Cart Integration**: Automatic injection of `CartProvider`, `CartOverlay`, and `useCart` hook into generated sites.
- **Dynamic Shop Routing**: `App.jsx` is now automatically transformed to support `react-router-dom` and `/checkout` routes for shops.
- **Two New Webshop Sitetypes (Docked)**:
    - `webshop-pay`: Integrated with Mollie/PayPal/Payconiq payment flows.
    - `webshop-order`: Simplified email-based ordering system.
- **Automatic Buy Buttons**: `standard-layout-generator.js` now generates product cards with "Add to Cart" functionality based on price detection.

### Changed
- **Factory Engine Core**: Upgraded `factory.js` to be aware of e-commerce tracks and handle complex JSX transformations during site creation.
- **SPA Boilerplate**: Enhanced to support dynamic routing wrappers.
- **Dependency Management**: Improved RAM-safe installation for sites requiring extra libraries like `react-router-dom`.

## [6.9.2] - 2026-01-26
### Fixed
- **MPA Detection**: Fixed a critical bug in `mpa-generator.js` where `athena-config.json` was not being generated. This caused new MPA sites (like FPC Gent) to be invisible to the Dock's site scanner.
- **FPC Gent Config**: Manually restored the missing configuration file for the existing deployment.

## [6.9.1] - 2026-01-25
### Added
- **Unified Launcher**: Root script `launch.sh` to synchronize sites and boot both Dock and Site in one command.
- **athena Alias**: Added to `.bash_aliases` for quick developer access.
- **Track-Aware Generation**: `sitetype-api.js` now respects the `docked/` vs `autonomous/` directory structure.
- **EditableImage Alias**: Restored `EditableImage.jsx` in the autonomous boilerplate for backward compatibility with the generator.

### Changed
- **Developer Manual**: Added detailed section on the Two-Track Strategy architecture and its importance.
- **FPC Gent Strategy**: Prioritized structuring of main navigation pages for immediate visual completeness.

## [6.9.0] - 2026-01-25
### Added
- **Centralized Logging Engine**: Introduced `5-engine/lib/logger.js` to manage all factory logs in `output/logs/` with timestamped naming conventions.
- **Detailed Architectural Mapping**: Created `docs/ARCHITECTUUR_DETAILS.md`, providing a comprehensive dependency register and functional flow schema.
- **Log Management Schema**: Added `output/LOG_MANAGEMENT_SCHEMA.md` to document logging standards for developers.

### Changed
- **RAM-Optimized Dashboard**: Overhauled `/api/sites` in `dashboard/server.js` to use non-blocking file size checks instead of full JSON parsing, significantly reducing memory footprint.
- **Dynamic Dashboard Launcher**: Updated `launch-dashboard.sh` to automatically detect project root and system Node binary, removing all hardcoded user paths.
- **Professionalized Scripting**: Removed hardcoded home directory references across the core engine and utilities.
- **Utility Consolidation**: Renamed `6-utilities/generate-sites-overview.js` to `sync-dock-sites.js` to better reflect its role in the Athena Dock ecosystem.

### Fixed
- **Root Directory Pollution**: Redirected all background process logs (previews, visualizers, smoke tests) to the centralized `output/logs/` directory.

### Removed
- **Redundant Scripts**: Deleted `6-utilities/manual-create-site.js` and `6-utilities/quick-generate-test.js`.
- **Deprecated Tools**: Archived `5-engine/layout-wizard.js` (CLI version) in favor of the web-based Layout Visualizer.
- **Obsolete Documentation**: Removed temporary audit reports in favor of persistent architectural docs.

## [6.8.1] - 2026-01-24
### Added
- **Relative Path Support**: Switched all `index.html` templates and generated sites to relative paths (`./`), ensuring robust hosting in subfolders (e.g., GitHub Pages).
- **Auto-Branding Assets**: `mpa-generator.js` now automatically deploys `athena-icon.svg` to the site's public folder.
- **Robust Image Fallbacks**: `PageRenderer.jsx` now implements a smart image pooling system, ensuring every section has a visual even if primary data is missing.

### Changed
- **Universal EditableText**: Upgraded `EditableText.jsx` to support both `value` props and `children`, making it compatible across all factory tracks (SPA/MPA).
- **Enhanced Visual Editor**: `VisualEditor.jsx` now dynamically resolves preview URLs using the selected site's actual base URL.

### Fixed
- **Object Rendering Crash**: Fixed a critical "Objects are not valid as React child" error by safely stringifying or extracting text from complex JSON objects in `EditableText.jsx`.
- **Media Dock Sync**: Updated `dock-connector.js` to correctly extract and pre-fill current image/video URLs in the Dock modal when clicked.
- **MPA Runtime Stability**: Added global try-catch boundaries to `PageRenderer.jsx` and `Section.jsx` to prevent a single corrupted section from crashing the entire application.

## [6.7.0] - 2026-01-24
### Added
- **Extended Text Formatting**: The Athena Dock now supports font family selection, font size, bold/italic toggles, and text alignment.
- **Style Bindings Engine**: Styles are now persisted in a dedicated `style_bindings.json` file per site, keeping the primary data clean.
- **Nested JSON Editing**: Upgraded `vite-plugin-athena-editor.js` to support deep property updates (e.g., `items.0.title`), enabling visual editing for complex MPA structures.
- **MPA Dock Integration**: Complete visual editing support for Project Hydra (MPA) sites, including dynamic page data resolution in `public/data/pages`.
- **Computer Shop Sitetype**: New specialized blueprint for e-commerce sites (Computers, Laptops, Accessories).

### Changed
- **MPA Template Standard**: All MPA templates in the factory are now "Athenafied" with `EditableText` and `data-dock` bindings by default.
- **Robust List Rendering**: MPA sections now gracefully handle both simple string arrays and complex objects.

### Fixed
- **Generator Interpolation**: Fixed a bug where `${sectionConfigString}` was not correctly interpolated in the Smart Layout Generator.
- **Factory Scope**: Moved `performReplacements` to a higher scope in `factory.js` to prevent "not defined" errors during component copying.
- **Parser Pathing**: Fixed `parser-wizard.js` to correctly resolve sitetype paths when a track (docked/autonomous) is specified.

## [6.6.1] - 2026-01-24
### Added
- **MPA Dock Navigation**: Added "Pages" section to the Dock sidebar, allowing instant navigation between routes in MPA sites.
- **Dynamic Header System**: `mpa-generator.js` now automatically builds a smart navigation menu based on the manifest categories, supporting unlimited pages with a clean UI.

### Changed
- **Dock Core**: Fixed critical "Inception" bug where the Dock would load itself recursively; now correctly resolves site URLs from `sites.json`.
- **Connector Protocol**: Upgraded `dock-connector.js` to handle `ATHENA_NAVIGATE` commands for remote steering.

### Fixed
- **Template Legacy**: Replaced the outdated v1 connector in `static-wrapper` with the production-ready v6 connector, ensuring all new MPA sites connect correctly.

## [6.6.0] - 2026-01-23
### Added
- **MPA Strategy (Project Hydra)**: Complete infrastructure for generating Multi-Page Applications from scraped data.
- **Smart Scraper v2**: `athena-scraper.js` now features sitemap auto-discovery, recursive crawling, and SSL-bypass for robust domain extraction.
- **Data Cleaver**: `split-scraper-data.js` to automatically segment massive scrape files into route-based JSON pages.
- **MPA AI Parser**: `parse-mpa-pages.js` for selective, AI-driven structuring of individual pages using Gemini 2.5 Flash.
- **MPA Generator**: `mpa-generator.js` orchestration script that builds Vite-based MPA sites with `react-router-dom`.
- **Lazy Content Engine**: `PageRenderer.jsx` template for on-demand loading of JSON page data, optimizing memory usage on low-RAM devices.
- **Configurable AI Models**: Support for `MPA_PARSER_AI_MODEL` and `GEMINI_API_KEY` in `.env`.

## [6.5.0] - 2026-01-23
### Added
- **Reverse Engineering Pipeline**: New `inputsites/` workflow to convert external prototypes (AI/Manual) into Athena sites.
- **Athenafier Engine**: `factory/5-engine/athenafier.js` for automatic site analysis, blueprint generation, and data extraction.
- **Automated Tag Injection**: Integrated `cheerio` to automatically apply `data-dock` attributes based on AI-generated transformation maps.
- **Dual-Track Conversion**: Support for both 'Quick Wrap' (tag injection) and 'Standard Refactor' (component building).
- **Transformation Mapping**: Automatic CSS-selector based mapping (`dock-map.json`) for precise Dock integration.
- **Developer Docs**: Comprehensive guides in `inputsites/` and updated `DEVELOPER_MANUAL.md`.

## [6.4.1] - 2026-01-22
### Fixed
- **Field Management**: Refactored `Section.jsx` logic to strictly respect `hidden_fields` in `display_config.json`.
- **Section Header Regression**: Explicitly included `section_settings.json` in `main.jsx` loading sequence.
- **Backend Robustness**: Hardened `vite-plugin-athena-editor.js` against missing payload parameters and prevented Node.js crashes (TypeErrors).
- **Initialization Timing**: Moved `dock-connector.js` import to `main.jsx` to ensure `athenaScan` is available during data init.
- **Dock UI**: Improved clickability and visibility of Field Management buttons in the sidebar.

## [6.4.0] - 2026-01-22
### Added
- **Reverse Data Pipeline**: Complete workflow to sync Dock edits back to the factory input via `export-site-to-sheets.js`.
- **Editable Section Headers**: Section titles and subtitles are now editable via the Dock and stored in `section_settings.json`.
- **Automated Sitetype Utility**: `6-utilities/generate-sitetype-from-input.js` for zero-interaction sitetype creation via AI.
- **Automated Site Utility**: `6-utilities/generate-site.js` CLI for non-interactive site generation.
- **JSON-First Workflow**: Parser now prioritizes JSON generation (`json-data/`) for direct site consumption.
- **Dock Bootloader**: `dock/start-dock.sh` for easy, configurable Dock startup.
- **Architecture Overview**: New visual documentation in `docs/ATHENA_WORKFLOW_OVERZICHT.md`.

### Changed
- **Standard Layout Generator**: Upgraded to support `EditableText` for section headers with fallback logic.
- **Factory Engine**: Upgraded `factory.js` to be fully track-aware and support automatic JSON data sync.
- **Parser Engine**: Updated to support parallel JSON and TSV output.

### Fixed
- **EditableMedia Regex**: Corrected invalid regex for media path replacement.
- **Component Discovery**: Fixed issue where `factory.js` missed components in the new `docked/SPA` structure.

---

## [6.3.0] - 2026-01-22

## [6.2.0] - 2026-01-21
### Added
- **Two-Track Strategy**: Formalized split between `docked` and `autonomous` website templates.
- **Video Support**: Full support for `.mp4` and `.webm` in `VisualEditor` and `EditableMedia`.
- **Title Color Control**: New `--color-title` variable and Dock picker for specific header title styling.
- **Track-Specific Shared Components**: Dedicated shared directories for each track to prevent feature leakage.

### Changed
- **Header Logic**: Header is now independent of the first section, using `site_settings.json` for storage.
- **EditableText**: Refactored to a passive wrapper for the `docked` track, improving editing speed by removing page reloads.
- **Factory Engine**: `factory.js` updated to be track-aware for all assets (CSS, shared components, and layouts).

### Fixed
- **Header Array Bug**: Fixed issue where header title wouldn't load if `site_settings.json` was an array.
- **FontAwesome Icons**: Fixed missing trash icons in Dock sidebar.
- **Saving UX**: Implemented postMessage sync for text edits, providing instant visual feedback.

### Removed
- Obsolete global `/shared` and `/css` template directories.
