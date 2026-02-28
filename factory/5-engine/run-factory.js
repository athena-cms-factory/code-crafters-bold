import { createProject } from './core/factory.js';

const projectName = process.argv[2];

if (!projectName) {
    console.error("❌ Geef een projectnaam op: node run-factory.js <project-naam>");
    process.exit(1);
}

const config = {
    projectName: projectName,
    track: 'docked',
    siteType: 'webshop-pay',
    siteModel: 'SPA',
    layoutName: 'modern',
    blueprintFile: 'webshop-pay.json', // Correcte naam voor dit type
    styleName: 'modern'
};

console.log(`🚀 Start Athena Engine v2.0 voor [${projectName}]...`);

createProject(config)
    .then(() => console.log(`\n✅ Project [${projectName}] succesvol gegenereerd!`))
    .catch(err => {
        console.error(`\n❌ Fout bij generatie:`, err);
        process.exit(1);
    });

