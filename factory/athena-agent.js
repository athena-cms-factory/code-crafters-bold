/**
 * athena-agent.js
 * @description The master headless CLI for Athena Factory. 
 * Allows AI agents and automation scripts to control the factory.
 */

import { AthenaConfigManager } from './5-engine/lib/ConfigManager.js';
import { ProjectController } from './5-engine/controllers/ProjectController.js';
import { SiteController } from './5-engine/controllers/SiteController.js';
import { MarketingController } from './5-engine/controllers/MarketingController.js';
import { AthenaInterpreter } from './5-engine/lib/Interpreter.js';
import { AthenaGateway } from './5-engine/lib/Gateway.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const config = new AthenaConfigManager(root);
const projectCtrl = new ProjectController(config);
const siteCtrl = new SiteController(config);
const marketingCtrl = new MarketingController(config);
const interpreter = new AthenaInterpreter(config);
const gateway = new AthenaGateway(root);

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

            case 'start-gateway':
                console.log("🔱 Athena Agent Gateway Service wordt opgestart...");
                gateway.watchFileInbox(); // Lokale simulatie
                await gateway.startMailListener(); // Echte mail listener
                break;

            case 'generate-blog':
                // Usage: athena-agent generate-blog <projectName> [topic]
                const blogResult = await marketingCtrl.generateBlog(args[0], args[1]);
                console.log(JSON.stringify(blogResult, null, 2));
                break;

            case 'create-site':
                // Usage: athena-agent create-site '{"projectName": "test-site", "siteType": "portfolio"}'
                // NEW: Also supports --prompt "..."
                if (args[0] === '--prompt') {
                    const prompt = args.slice(1).join(' ');
                    console.log(JSON.stringify({ status: "analyzing", prompt }, null, 2));
                    
                    // Haal werkelijke sitetypes op (zoeken in docked en autonomous)
                    const types = [];
                    ['docked', 'autonomous'].forEach(track => {
                        const dir = path.join(root, 'factory/3-sitetypes', track);
                        if (fs.existsSync(dir)) {
                            fs.readdirSync(dir).forEach(t => {
                                if (fs.statSync(path.join(dir, t)).isDirectory()) types.push(t);
                            });
                        }
                    });

                    const stylesDir = path.join(root, 'factory/2-templates/boilerplate/docked/css');
                    const styles = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css')).map(f => f.replace('.css', ''));
                    
                    const aiConfig = await interpreter.interpretCreate(prompt, types, styles);
                    console.log(JSON.stringify({ status: "generated-config", config: aiConfig }, null, 2));
                    
                    const result = await siteCtrl.create(aiConfig);
                    console.log(JSON.stringify(result, null, 2));
                } else {
                    const params = JSON.parse(args[0]);
                    const result = await siteCtrl.create(params);
                    console.log(JSON.stringify(result, null, 2));
                }
                break;

            case 'sync-to-sheet':
                const syncRes = await siteCtrl.syncToSheet(args[0]);
                console.log(JSON.stringify(syncRes, null, 2));
                break;

            case 'provision-sheet':
                // Usage: athena-agent provision-sheet <projectName>
                const tool = path.join(root, 'factory/5-engine/auto-sheet-provisioner.js');
                const output = execSync(`"${process.execPath}" "${tool}" "${args[0]}"`, { cwd: path.join(root, 'factory') }).toString();
                console.log(JSON.stringify({ success: true, details: output }, null, 2));
                break;

            case 'pull-from-sheet':
                const pullRes = await siteCtrl.pullFromSheet(args[0]);
                console.log(JSON.stringify(pullRes, null, 2));
                break;

            case 'update-site':
                // Usage: athena-agent update-site <projectName> --instruction "Zet de titel op ..."
                if (args[1] === '--instruction') {
                    const instruction = args.slice(2).join(' ');
                    const result = await siteCtrl.updateFromInstruction(args[0], instruction);
                    console.log(JSON.stringify(result, null, 2));
                } else {
                    console.log("Usage: node athena-agent.js update-site <projectName> --instruction \"...\"");
                }
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
