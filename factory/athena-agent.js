/**
 * athena-agent.js
 * @description The master headless CLI for Athena Factory. 
 * Allows AI agents and automation scripts to control the factory.
 */

import { AthenaConfigManager } from './5-engine/lib/ConfigManager.js';
import { ProjectController } from './5-engine/controllers/ProjectController.js';
import { SiteController } from './5-engine/controllers/SiteController.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const config = new AthenaConfigManager(root);
const projectCtrl = new ProjectController(config);
const siteCtrl = new SiteController(config);

const command = process.argv[2];
const args = process.argv.slice(3);

async function run() {
    try {
        switch (command) {
            case 'list-projects':
                console.log(JSON.stringify(projectCtrl.list(), null, 2));
                break;

            case 'list-sites':
                console.log(JSON.stringify(siteCtrl.list(), null, 2));
                break;

            case 'create-site':
                // Usage: athena-agent create-site '{"projectName": "test-site", "siteType": "portfolio"}'
                const params = JSON.parse(args[0]);
                const result = await siteCtrl.create(params);
                console.log(JSON.stringify(result, null, 2));
                break;

            case 'sync-to-sheet':
                const syncRes = await siteCtrl.syncToSheet(args[0]);
                console.log(JSON.stringify(syncRes, null, 2));
                break;

            case 'pull-from-sheet':
                const pullRes = await siteCtrl.pullFromSheet(args[0]);
                console.log(JSON.stringify(pullRes, null, 2));
                break;

            case 'deploy':
                const deployRes = await siteCtrl.deploy(args[0], args[1] || "Update via Agent");
                console.log(JSON.stringify(deployRes, null, 2));
                break;

            case 'get-config':
                console.log(JSON.stringify(config.getAll(), null, 2));
                break;

            default:
                console.log("Usage: node athena-agent.js <command> [args]");
                console.log("Commands: list-projects, list-sites, create-site, sync-to-sheet, pull-from-sheet, deploy, get-config");
        }
    } catch (e) {
        console.error(JSON.stringify({ success: false, error: e.message }, null, 2));
        process.exit(1);
    }
}

run();
