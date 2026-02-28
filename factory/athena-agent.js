/**
 * 🔱 athena-agent.js
 * @description Master Gateway for AI Agents. 
 * Provides a clean, non-interactive interface to all Athena operations.
 */

import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const command = process.argv[2];
const args = process.argv.slice(3).join(' ');

const HEADLESS_DIR = path.join(__dirname, '5-engine/headless');

async function run() {
    if (!command || command === '--help') {
        printHelp();
        return;
    }

    try {
        switch (command) {
            case 'create':
                console.log(`[AGENT] Triggering site-creator for: ${args}`);
                execSync(`node ${path.join(HEADLESS_DIR, 'site-creator.js')} "${args}"`, { stdio: 'inherit' });
                break;

            case 'render':
                console.log(`[AGENT] Triggering site-renderer for: ${args}`);
                execSync(`node ${path.join(HEADLESS_DIR, 'site-renderer.js')} ${args}`, { stdio: 'inherit' });
                break;

            case 'populate':
                console.log(`[AGENT] Triggering content-generator for: ${args}`);
                execSync(`node ${path.join(HEADLESS_DIR, 'content-generator.js')} ${args}`, { stdio: 'inherit' });
                break;

            case 'hydrate':
                console.log(`[AGENT] Triggering data-hydrator for: ${args}`);
                execSync(`node ${path.join(HEADLESS_DIR, 'data-hydrator.js')} ${args}`, { stdio: 'inherit' });
                break;

            case 'link-sheet':
                console.log(`[AGENT] Linking sheet: ${args}`);
                execSync(`node ${path.join(HEADLESS_DIR, 'sheet-linker.js')} ${args}`, { stdio: 'inherit' });
                break;

            case 'rename':
                console.log(`[AGENT] Renaming site: ${args}`);
                execSync(`node ${path.join(HEADLESS_DIR, 'site-renamer.js')} ${args}`, { stdio: 'inherit' });
                break;

            case 'deploy':
                console.log(`[AGENT] Deploying site: ${args}`);
                execSync(`node ${path.join(HEADLESS_DIR, 'site-deployer.js')} ${args}`, { stdio: 'inherit' });
                break;

            case 'sync-sheet':
                console.log(`[AGENT] Syncing sheet for: ${args}`);
                execSync(`node 5-engine/sync-sheet-to-tsv.js --project ${args} --headless`, { stdio: 'inherit' });
                break;

            case 'list-headless':
                // Toont alle beschikbare agent-scripts
                const files = fs.readdirSync(HEADLESS_DIR);
                console.log(JSON.stringify(files, null, 2));
                break;

            default:
                console.log(`❌ Unknown agent command: ${command}`);
                printHelp();
        }
    } catch (e) {
        console.error(`❌ Agent Error: ${e.message}`);
    }
}

function printHelp() {
    console.log(`
🔱 Athena Agent Portal
Usage: node athena-agent.js <command> [args]

Verified Headless Commands:
  create "<prompt>"   Create a new site from an idea (blueprint).
  render <project>    Render a full website from a blueprint.
  link-sheet <p> <u>  Link a Google Sheet URL to a project.
  rename <old> <new>  Rename a project folder and update configs.
  deploy <project>    Build and push site to GitHub Pages.
  sync-sheet <proj>   Pull latest data from Google Sheets.
  list-headless       List all scripts safe for agent use.
    `);
}

run();
