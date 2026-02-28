/**
 * 🤖 data-hydrator.js (HEADLESS)
 * @description Splits the AI generated content.json into individual JSON files for the site data folder.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const factoryRoot = path.resolve(__dirname, '../..');

async function run() {
    const projectName = process.argv[2];
    if (!projectName) {
        console.error("❌ Error: No project name provided.");
        process.exit(1);
    }

    const athenaXRoot = path.resolve(factoryRoot, '..');
    const contentPath = path.join(athenaXRoot, 'input', projectName, 'content.json');
    const siteDataDir = path.join(athenaXRoot, 'sites', projectName, 'src/data');

    if (!fs.existsSync(contentPath)) {
        console.error(`❌ Error: content.json not found at ${contentPath}`);
        process.exit(1);
    }

    if (!fs.existsSync(siteDataDir)) {
        fs.mkdirSync(siteDataDir, { recursive: true });
    }

    console.log(`[AGENT] Hydrating data for: ${projectName}`);
    const content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

    // Map content to files
    const mapping = {
        'hero.json': content.hero,
        'about_me.json': content.about,
        'services.json': content.services,
        'contact.json': content.contact,
        'projects.json': [] // Optioneel
    };

    for (const [file, data] of Object.entries(mapping)) {
        if (data) {
            const filePath = path.join(siteDataDir, file);
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`   ✅ Written: ${file}`);
        }
    }

    console.log(`✨ Data hydration complete!`);
}

run();
