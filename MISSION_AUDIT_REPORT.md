# MISSION_AUDIT_REPORT.md

## 🎯 Audit Summary
The Athena Sandbox is a sophisticated monorepo but suffers from 'script sprawl' and fragmented project management logic.

### 1. Architectural Inconsistencies
*   **Initialization Logic:** Project initialization logic is split between the dashboard API (`factory/dashboard/athena.js`) and the `ProjectGenerator` class in `factory/5-engine/factory.js`.
*   **Dual-Track System:** The 'docked' vs 'autonomous' site-types add complexity to component resolution and editor integration.

### 2. Technical Debt in `factory/5-engine`
*   **Sync Script Fragmentation:** Numerous overlapping scripts (`sync-json-to-sheet.js`, `sync-full-project-to-sheet.js`, `sync-tsv-to-json.js`, etc.) lead to high maintenance overhead.
*   **Hardcoded Migrations:** `factory.js` contains hardcoded logic for blueprint versions (e.g., v2.0), which should be handled by a dedicated migration manager.
*   **Process Management:** The dashboard uses brittle `fuser`/`kill` logic for managing site previews.

### 3. Optimization Opportunities
*   **Asset Discovery:** Current regex-based asset scavenging in `factory.js` could be improved with more robust AST parsing or globbing.
*   **Code Reuse:** The component assembly process copies files directly; a shared library or advanced scaffolding system would reduce disk usage and improve maintainability.
*   **Disk/RAM Efficiency:** Standardizing on `pnpm` is a good start, but deeper pruning of redundant dependencies across site-types is possible.

### 4. Isolation Check
*   **Port Management:** Isolation is maintained via `factory/config/site-ports.json`.
*   **Update:** I have updated `factory/.env` and `launch.sh` to use the 5000 range (DASHBOARD_PORT=5001, DOCK_PORT=5002, etc.) to prevent conflicts with production environments running on 400x.
*   **Paths:** Relative pathing (`./`) in generated sites and the use of `import.meta.env.BASE_URL` effectively prevent environment leakage.

## 🚀 Recommended Refactoring for Jules
**Task:** Standardize the Data Synchronization Layer.
**Description:** Replace the fragmented `sync-*.js` scripts in `factory/5-engine/` with a unified `AthenaDataManager` class in `factory/5-engine/lib/`. This manager should handle all sync directions (JSON <-> Sheet <-> TSV) through a single CLI entry point and a consistent API.
