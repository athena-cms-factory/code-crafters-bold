import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProject, validateProjectName } from './core/factory.js';
import { loadEnv } from './env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    await loadEnv(path.join(__dirname, '../.env'));

    const projectName = process.argv[2];
    const siteType = process.argv[3];

    if (!projectName || !siteType) {
        console.error("❌ Gebruik: node rebuild-site.js <project-naam> <sitetype>");
        process.exit(1);
    }

    const config = {
        projectName: validateProjectName(projectName),
        siteType: siteType,
        layoutName: 'standard',
        styleName: 'modern',
        siteModel: 'SPA',
        autoSheet: false,
        blueprintFile: `${siteType}.json`
    };

    console.log(`🚀 Rebuilding project [${projectName}] with sitetype [${siteType}]...`);

    try {
        await createProject(config);
        console.log(`
✅ Project [${projectName}] succesvol herbouwd!`);
    } catch (err) {
        console.error(`
❌ Fout bij herbouwen:`, err);
        process.exit(1);
    }
}

run();
