/**
 * 🤖 site-renderer.js (HEADLESS)
 * @description Renders a full website from an existing blueprint in the input/ folder.
 */

import { createProject } from '../core/factory.js';
import { loadEnv } from '../env-loader.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const factoryRoot = path.resolve(__dirname, '../..');

async function run() {
    const projectName = process.argv[2];
    if (!projectName) {
        console.error("❌ Error: No project name provided for rendering.");
        process.exit(1);
    }

    await loadEnv(path.join(factoryRoot, '.env'));

    // Path to the blueprint (site_settings.json) in the input/ folder
    const athenaXRoot = path.resolve(factoryRoot, '..');
    const projectInputPath = path.join(athenaXRoot, 'input', projectName);
    const settingsPath = path.join(projectInputPath, 'site_settings.json');

    if (!fs.existsSync(settingsPath)) {
        console.error(`❌ Error: Blueprint not found at ${settingsPath}`);
        process.exit(1);
    }

    console.log(`[AGENT] Reading blueprint for: ${projectName}`);
    const config = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));

    console.log(`🚀 Starting Athena Engine for: ${projectName}...`);
    try {
        await createProject(config);
        console.log(`
✅ Project [${projectName}] successfully rendered!`);
        console.log(`📍 Output: ${path.join(athenaXRoot, 'sites', projectName)}`);
    } catch (err) {
        console.error(`
❌ Generation Error:`, err.message);
        process.exit(1);
    }
}

run();
