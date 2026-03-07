# Athena Agent CLI (v8.0)

The `athena-agent.js` script is the headless interface for the Athena CMS Factory. It allows AI agents, automation scripts (like cron jobs), and power users to control the factory without using the interactive menu or dashboard.

## Usage

```bash
node athena-agent.js <command> [arguments]
```

## Core Commands

### Project & Site Management

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `list-projects` | None | Lists all data sources in `input/`. |
| `list-sites` | None | Lists all generated sites in `sites/`. |
| `create-site` | JSON String | Creates a new site from a data source. <br>Ex: `'{"projectName": "foo", "siteType": "portfolio"}'` |
| `update-site` | `name` `--instruction "..."` | Updates a site using AI instructions. |
| `deploy` | `name` `[message]` | Deploys a site to GitHub Pages. |

### Data Synchronization

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `sync-to-sheet` | `name` | Pushes local JSON data to the linked Google Sheet. |
| `pull-from-sheet` | `name` | Pulls data from Google Sheet to local JSON. |
| `provision-sheet` | `name` | Auto-generates a new Google Sheet for a data source. |

### Marketing & SEO (New in v8.0)

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `generate-blog` | `projectName` `[topic]` | Generates a new blog post using AI and syncs it to Sheets. |
| `generate-seo` | `projectName` | Generates/optimizes `metaTitle`, `metaDescription`, and `keywords`. |

### Health & Storage (Doctor)

| Command | Arguments | Description |
| :--- | :--- | :--- |
| `doctor-check` | `[siteName]` | Audits one or all sites for integrity issues (missing node_modules, corrupt JSON). |
| `doctor-heal` | `siteName` | Attempts to fix issues (e.g., `pnpm install`). |
| `storage-status` | None | Shows disk usage of all sites and identifies `node_modules` size. |
| `storage-policy` | None | Displays the current storage retention policy. |
| `storage-enforce` | None | Enforces the storage policy (e.g., auto-pruning). |
| `storage-prune-all` | None | Deletes `node_modules` in ALL sites to free up space. (Use `doctor-heal` to restore when needed). |

## Automation Examples

### Nightly Health Monitor
See `athena-monitor.sh` for a full implementation.

```bash
# Check status
node athena-agent.js storage-status >> storage.log
```

### Auto-Blog Generation
```bash
node athena-agent.js generate-blog my-client-site "Trends in 2025"
```
