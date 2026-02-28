import { createProject } from '../5-engine/core/factory.js';

async function main() {
    try {
        await createProject({
            projectName: 'test-medical',
            blueprintFile: 'medical/blueprint/medical.json',
            siteType: 'medical',
            layoutName: 'standard',
            styleName: 'modern.css'
        });
        console.log("✅ Factory runner voltooid!");
    } catch (error) {
        console.error("❌ Fout in factory runner:", error);
        process.exit(1);
    }
}

main();
