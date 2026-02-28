/**
 * 🤖 site-renamer.js (HEADLESS)
 * @description Non-interactive site renaming.
 */

import { renameProject } from '../core/project-manager.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const factoryRoot = path.resolve(__dirname, '../..');

async function run() {
    const oldName = process.argv[2];
    const newName = process.argv[3];

    if (!oldName || !newName) {
        console.error("❌ Usage: node site-renamer.js <oldName> <newName>");
        process.exit(1);
    }

    console.log(`[AGENT] Renaming project from ${oldName} to ${newName}`);
    try {
        await renameProject(oldName, newName, factoryRoot);
        console.log(`✅ Successfully renamed project.`);
    } catch (e) {
        console.error(`❌ Error: ${e.message}`);
        process.exit(1);
    }
}

run();
