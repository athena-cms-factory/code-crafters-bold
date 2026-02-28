/**
 * @file quick-create.js
 * @description Developer utility om direct een site te genereren zonder interactieve wizard.
 * 
 * WAAROM: 
 * Handig voor geautomatiseerde tests of wanneer je exact weet welke instellingen je wilt.
 * Omzeilt de prompts van site-wizard.js.
 * 
 * WORKFLOW:
 * 1. Definieer de config (siteType, projectName, etc.)
 * 2. Draai: node 5-engine/quick-create.js
 * 3. De site wordt aangemaakt in ../sites/[projectName]
 */

import { createProject, validateProjectName } from '../5-engine/core/factory.js';
import 'dotenv/config';

async function run() {

    const projectName = 'basic-dock-site';

    const siteType = 'basic-dock-type';

    

    const config = {

        projectName: validateProjectName(projectName),

        siteType: siteType,

        blueprintFile: `${siteType}/blueprint/${siteType}.json`,

        layoutName: 'standard',

        styleName: 'modern',

        siteModel: 'SPA',

        autoSheet: false

    };
    
    console.log("🚀 Athena Quick-Create gestart...");
    console.log(`📂 Project: ${config.projectName}`);
    console.log(`🏗️  Type:    ${config.siteType}`);

    try {
        await createProject(config);
        console.log("\n✅ Succes! Site is gegenereerd in ../sites/" + config.projectName);
        console.log("👉 Volgende stap: Start de site op poort 4000 en open de Dock.");
    } catch (e) {
        console.error("\n❌ Fout tijdens generatie:", e.message);
        process.exit(1);
    }
}

run();
