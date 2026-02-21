# Live Manager & Link Resolver

The Athena Factory includes a centralized system for managing deployed websites and ensuring internal links point to live production URLs instead of local development ports.

## 🛠️ Components

### 1. Live Manager (Dashboard)
Located in the main sidebar of the Athena Dashboard (Port 5001). 
- **Purpose**: A "Single Source of Truth" for where every site is hosted.
- **Features**:
    - **Inline Editing**: Quickly update the `Live URL` or `GitHub Repo` for any project.
    - **Status Tracking**: Toggle between `local`, `live`, and `archived`.
    - **Visual Feedback**: Fallback URLs (predicted based on GitHub organization) are shown in *italic*.
    - **Sync Registry**: Scans all `deployment.json` files in `sites/` and rebuilds the central index.

### 2. Central Registry (`sites.json`)
Located at `dock/public/sites.json`.
- This file is used by the **Athena Dock** to provide intelligent suggestions.
- When editing a link in the Dock, a dropdown menu appears with all known live sites from this registry.

### 3. Localhost Link Resolver
A standalone utility script: `factory/6-utilities/resolve-localhost-links.js`.
- **Usage**: `node factory/6-utilities/resolve-localhost-links.js <project-name>`
- **Logic**: 
    1. Scans all JSON files in the site's `src/data/` folder.
    2. Detects links like `http://localhost:XXXX/`.
    3. Matches the port against the Central Registry.
    4. Automatically replaces the local link with the correct `https://...` production URL.

## 🔄 Standard Release Workflow

1.  **Deploy**: Use the "Deployment" tab to push the site to GitHub.
2.  **Verify**: Open the "Live Manager" to ensure the `Live URL` is correctly registered (click the external link icon to test).
3.  **Sync Registry**: Click "Sync Registry" to make the new URL available to other sites.
4.  **Resolve Links**: If this site references other Athena sites (e.g., a portfolio hub), run the Link Resolver utility to update its internal data to production URLs.
5.  **Final Push**: Commit and push the updated JSON data.
