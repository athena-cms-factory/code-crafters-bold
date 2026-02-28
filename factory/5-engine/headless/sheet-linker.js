/**
 * 🤖 sheet-linker.js (HEADLESS)
 * @description Non-interactive Google Sheet linking for projects.
 */

import { linkGoogleSheet } from '../core/sheet-engine.js';
import path from 'path';

async function run() {
    const projectName = process.argv[2];
    const sheetUrl = process.argv[3];
    const pubUrl = process.argv[4] || null;

    if (!projectName || !sheetUrl) {
        console.error("❌ Usage: node sheet-linker.js <projectName> <sheetUrl> [pubUrl]");
        process.exit(1);
    }

    console.log(`[AGENT] Linking sheet to project: ${projectName}`);
    try {
        const success = await linkGoogleSheet(projectName, sheetUrl, pubUrl);
        if (success) {
            console.log(`✅ Successfully linked sheet to: ${projectName}`);
        } else {
            console.error(`❌ Failed to link sheet.`);
            process.exit(1);
        }
    } catch (e) {
        console.error(`❌ Error: ${e.message}`);
        process.exit(1);
    }
}

run();
