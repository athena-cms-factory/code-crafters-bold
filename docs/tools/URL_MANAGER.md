# Athena URL Manager & Link Resolver

The Athena Factory includes a centralized system for managing both local development URLs and deployed production URLs, ensuring that internal links point to the correct destination at all times.

## 🛠️ Components

### 1. URL Manager (Dashboard)
Located in the main sidebar of the Athena Dashboard.
- **Purpose**: A "Single Source of Truth" for all project entry points.
- **Features**:
    - **Local URL Column**: Quick access to the development server (with play button).
    - **Live URL Column**: Management of the production `github.io` address.
    - **Repo URL Column**: Link to the source code repository.
    - **Inline Editing**: Quickly update any URL and save it directly to the site's config.
    - **Visual Feedback**: Fallback URLs (predicted) are shown in *italic*.
    - **Sync Registry**: Scans all site folders to rebuild the central index.

### 2. Central Registry (`sites.json`)
Located at `dock/public/sites.json`.
- This file is used by the **Athena Dock** to provide intelligent site-aware features.
- Contains `id`, `name`, `localUrl`, and `liveUrl` for every project.

### 3. Dock "Quick Deploy"
Built into the `VisualEditor` link modal.
- **Auto-Detection**: If a link points to a `localhost` address of a project that doesn't have a Repo URL yet, an alert panel appears.
- **One-Click Deploy**: The "Deploy Now" button triggers the deployment workflow from the Dashboard API, creates the repo, and replaces the local link with the new live URL.

### 4. Localhost Link Resolver Utility
Standalone script: `factory/6-utilities/resolve-localhost-links.js`.
- **Usage**: `node factory/6-utilities/resolve-localhost-links.js <project-name>`
- **Action**: Batch-replaces all localhost strings in site data with their corresponding registry live URLs.

## 🔄 Standard Release Workflow

1.  **Develop**: Work locally using the `Local URL`.
2.  **Cross-Link**: Link projects using the Dock's intelligent dropdown (shows full URLs).
3.  **Deploy**: If a link is local, use the **Quick Deploy** button in the Dock to go live.
4.  **Audit**: Check the **URL Manager** to ensure all endpoints are correct.
5.  **Sync**: Click **Sync Registry** to ensure other sites can "see" the new production endpoints.
