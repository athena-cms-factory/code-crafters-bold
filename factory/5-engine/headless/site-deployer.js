/**
 * 🤖 site-deployer.js (HEADLESS)
 * @description Non-interactive deployment to GitHub Pages.
 */

import { deployProject } from '../wizards/deploy-wizard.js';
import { loadEnv } from '../env-loader.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const project = process.argv[2];
    if (!project) {
        console.error("❌ Error: No project name provided for deployment.");
        process.exit(1);
    }

    const root = path.resolve(__dirname, '../..');
    await loadEnv(path.join(root, '.env'));

    console.log(`[AGENT] Starting deployment for: ${project}`);
    try {
        await deployProject(project, "Autonomous Agent Deploy");
        console.log(`✅ Successfully deployed: ${project}`);
    } catch (e) {
        console.error(`❌ Deployment failed: ${e.message}`);
        process.exit(1);
    }
}

run();
