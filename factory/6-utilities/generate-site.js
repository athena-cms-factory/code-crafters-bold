import { createProject } from '../5-engine/core/factory.js';
import path from 'path';

const args = process.argv.slice(2);
const projectName = args[0] || 'nieuwe-site';
const siteType = args[1] || 'basic-dock-type';
const track = args[2] || 'docked';

console.log("==================================================");
console.log("🏭 Athena Site Factory - Automated Generator");
console.log("==================================================");
console.log(`📝 Project   : ${projectName}`);
console.log(`🏗️  Sitetype  : ${siteType}`);
console.log(`🛤️  Track     : ${track}`);
console.log("==================================================\n");

try {
    // Constructie van de blueprint file path
    const blueprintFile = `${track}/${siteType}/blueprint/${siteType}.json`;

    await createProject({
        projectName: projectName,
        siteType: siteType,
        blueprintFile: blueprintFile,
        layoutName: 'standard',
        styleName: 'modern.css',
        siteModel: 'SPA',
        autoSheet: false
    });
    
    console.log(`\n✅ SUCCES: Website '${projectName}' is gegenereerd!`);
    console.log(`📂 Locatie: sites/${projectName}`);
    console.log("==================================================");
    process.exit(0);
} catch (error) {
    console.error("\n❌ Fout bij het genereren van de site:", error.message);
    process.exit(1);
}
