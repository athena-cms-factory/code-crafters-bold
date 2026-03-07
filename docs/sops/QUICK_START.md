# Quick Start Guide (February 2026 - v7.9.2)

## 1. Installation
Clone the repository and install dependencies:
```bash
pnpm install
```
*Note: The `ProcessManager` handles concurrency for internal operations, but the initial install is standard.*

## 2. Environment Variables (.env)
Copy `.env.example` to `.env`. The `ConfigManager` ensures these variables are accessible throughout the factory.

### GitHub
- `GITHUB_USER` & `GITHUB_ORG`: Your GitHub username and organization.
- `GITHUB_PAT`: Personal Access Token.

### Google API
- `service-account.json` required for `AthenaDataManager` sync operations.

## 3. Starting the Dashboard
The dashboard is the nerve center of the factory:
```bash
node dashboard/server.js
```
Then open: `http://localhost:5001`
*Logs are handled by `LogManager` and output to `output/logs/`.*

## 4. Visual Tools
On development machines, these can be started manually:
- **Layout Architect:** `node 5-engine/layout-visualizer.js` (Port 5003)
- **Media Mapper:** `node 5-engine/media-mapper.js` (Port 5004)

## 5. Power User CLI Workflow
For rapid generation and maintenance without the dashboard:

```bash
# 1. Generate Sitetype
node 6-utilities/generate-sitetype-from-input.js my-type docked ../input/my-data.txt

# 2. Parse Data
node 3-sitetypes/docked/my-type/parser/parser-my-type.js my-data-bron my-data.txt

# 3. Generate Site
node 6-utilities/generate-site.js my-site my-type docked

# 4. Update All Sites
node 6-utilities/update-all-sites.js
```

## 6. Exporting Changes (Back to Sheets)
After editing the site in the Dock:
```bash
node 6-utilities/export-site-to-sheets.js my-site my-data-bron my-type docked
```
This utilizes `AthenaDataManager` to sync changes.

---

## 7. Important Ports (v7.9.2 Update)
- **5000**: Site Dev Server (Local)
- **5001**: Athena Factory Dashboard
- **5002**: Athena Dock (Visual Editor)
- **5003**: Layout Architect
- **5004**: Media Mapper

---

## 💡 Useful Aliases
Add to `~/.bash_aliases`:

```bash
alias adash='node dashboard/server.js'
alias athena='bash athena.sh'
```
