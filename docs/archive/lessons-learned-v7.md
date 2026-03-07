# Lessons Learned & Best Practices (v7.6+)

## 1. CSS Architecture (Tailwind v4)
*   **Single Entry Point**: Always use `index.css` as the sole provider of `@import "tailwindcss";`.
*   **Module Separation**: Theme files (like `modern.css`) must *not* import Tailwind themselves to avoid duplicate definition errors during the Vite build process.
*   **Font Injection**: Ensure Google Font imports (`@import url(...)`) are placed at the very top of `index.css`, before the Tailwind import.

## 2. Branding & Fallbacks
*   **Dynamic Initials**: The Header logo must use `{siteName.charAt(0)}` with a robust fallback to the project title, never a hardcoded "A" or "Athena".
*   **Site Settings Priority**: Always prioritize `site_settings.json` (Title/Naam) over `basisgegevens.json` to allow user-driven branding overrides without touching the primary data table.

## 3. Style Governance
*   **Style Binding Conflicts**: When switching themes or upgrading to v7+, old entries in `style_bindings.json` (e.g., fixed `fontSize: "16px"` for headers) can break the new design. 
*   **Reset Strategy**: During major layout shifts, consider clearing `style_bindings.json` to allow the new theme tokens to take precedence.

## 6. Routing & Navigation (SPA)
*   **Router Necessity**: Components utilizing `Link` or other hooks from `react-router-dom` (like `Header.jsx`) MUST be wrapped in a `<Router>` (typically `HashRouter` for subfolder compatibility). Failure to do so will result in a white-page runtime crash.
*   **Docked Site Scaffolding**: Ensure `App.jsx` in docked sites includes `HashRouter`, `DisplayConfigProvider`, and `StyleProvider` to support all ecosystem features.

