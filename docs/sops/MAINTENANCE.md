# Athena Monorepo: Maintenance & Resource Management (v7.9.2)

This document describes proven strategies for running the Athena CMS Factory stably and efficiently, optimized for Dell Latitude environments (16GB RAM).

## 1. Monorepo Strategy

Because the Athena Factory operates as a **Monorepo**, the root directory must be the primary location for `.git` administration.

### Automated Workflow with ConfigManager

The site-generation engine (`factory.js`) uses `ConfigManager` to intelligently detect if it is running within an existing Git repository.

*   **Detection:** During the `finalize` step, the engine checks if the parent directory is part of a Git work-tree.
*   **Action:** If a Monorepo is detected, the engine skips the `git init` step for the new site.
*   **Result:** The new site is seen as a normal directory by the Monorepo, avoiding the need for manual "flattening" (like `rm -rf .git`).

## 2. Publication to Client Repositories

GitHub Actions automatically push the content of `sites/` directories to their respective standalone repositories on the `athena-cms-factory` GitHub organization. This approach replaces submodules for client repository management.

## 3. Storage & Memory Management (Dell Latitude 16GB RAM)

Although the 16GB RAM on current Dell Latitude hardware provides ample headroom, efficient resource management remains critical for stability during parallel operations.

### A. The PNPM Advantage
Thanks to **pnpm**, the disk space impact of new sites is minimized.
*   **Central Store:** Files are located in the central pnpm store, allowing hundreds of sites without significant storage duplication.
*   **Action:** Periodically run `pnpm store prune` to clean up the central storage.

### B. RAM Optimization & ProcessManager
To prevent memory leaks and ensure system stability, `ProcessManager` handles all heavy child processes.

*   **Concurrency:** `ProcessManager` enforces a safe concurrency limit (default: 1) for `pnpm install` operations, even on 16GB systems, to ensure system responsiveness.
*   **Memory Limits:** Heavy builds should still consider `NODE_OPTIONS="--max-old-space-size=4096"` (4GB) to leave room for the OS and other tools.
*   **Browser Management:** Close unnecessary tabs in the browser when running the Factory Engine or heavy builds.

## 4. Maintenance & Cleaning

To keep the system running smoothly:

1.  **Project Cleaning:** Use `rm -rf sites/*/node_modules` to remove local links if disk space becomes an issue.
2.  **Log Rotation:** The `LogManager` automatically rotates logs in `output/logs/`. Periodically check and archive old logs if necessary.
3.  **System Cleaning:**
    *   `sudo apt autoremove --purge`
    *   `sudo apt clean`
4.  **Monitoring:** Use `free -h` and `df -h` to monitor RAM and storage status.

## 5. Hydration Management System (DoctorController)

The **Hydration Management System** is a key feature of Athena v8.0, designed to manage disk usage by pruning `node_modules` folders from inactive sites.

### Concepts
*   **Hydrated Site:** A site with all dependencies installed (`node_modules` present). Ready for development.
*   **Dehydrated Site:** A site without `node_modules`. Takes up minimal space but cannot be started immediately.

### Commands
*   **Check Status:** `node athena-agent.js storage-status` - Displays disk usage of all sites.
*   **Prune All (Dehydrate):** `node athena-agent.js storage-prune-all` - Removes `node_modules` from all sites.
*   **Heal (Rehydrate):** `node athena-agent.js doctor-heal [site-name]` - Reinstalls dependencies for a specific site.

## 6. Nightly Monitoring (Cron Job)

The factory includes a `athena-monitor.sh` script to automate health checks and storage reporting.

### Setup
Add the following line to your crontab (`crontab -e`) to run the monitor every night at 3 AM:

```bash
0 3 * * * /path/to/factory/athena-monitor.sh >> /var/log/athena-monitor.log 2>&1
```

### Report Contents
The monitor generates a report including:
1.  **Storage Usage:** Total disk space used by sites and `node_modules`.
2.  **Health Check:** Verifies JSON integrity for all sites.
3.  **Policy Enforcement:** (Optional) Auto-prunes sites exceeding storage limits.

---
*Updated for v8.0 - Optimized for Dell Latitude Performance.*
