/**
 * 🤖 content-generator.js (HEADLESS)
 * @description Generates AI content (text) for a site based on its blueprint.
 */

import { generateWithAI } from '../core/ai-engine.js';
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
        console.error("❌ Error: No project name provided.");
        process.exit(1);
    }

    await loadEnv(path.join(factoryRoot, '.env'));

    const athenaXRoot = path.resolve(factoryRoot, '..');
    const projectInputPath = path.join(athenaXRoot, 'input', projectName);
    const settingsPath = path.join(projectInputPath, 'site_settings.json');

    if (!fs.existsSync(settingsPath)) {
        console.error(`❌ Error: Blueprint not found at ${settingsPath}`);
        process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    console.log(`[AGENT] Generating content for: ${projectName} (${config.siteType})`);

    const prompt = `
        Je bent een professionele copywriter. Schrijf de volledige inhoud voor een website van het type "${config.siteType}" met de stijl "${config.styleName}".
        PROJECTNAAM: ${projectName}
        CONCEPT: ${config.reasoning || "Professionele website"}

        REAGEER UITSLUITEND MET EEN JSON OBJECT dat de volgende velden bevat voor de homepage:
        {
            "hero": { "title": "...", "subtitle": "...", "cta": "..." },
            "about": { "title": "Over mij", "text": "..." },
            "services": [ { "title": "...", "desc": "..." } ],
            "contact": { "email": "info@example.com", "phone": "+32..." }
        }
    `;

    try {
        const content = await generateWithAI(prompt, { isJson: true });
        const contentPath = path.join(projectInputPath, 'content.json');
        fs.writeFileSync(contentPath, JSON.stringify(content, null, 2));
        console.log(`✅ Content generated and saved to: ${contentPath}`);
    } catch (e) {
        console.error(`❌ Content generation failed: ${e.message}`);
        process.exit(1);
    }
}

run();
