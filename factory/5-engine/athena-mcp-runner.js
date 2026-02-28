import { createProject } from './core/factory.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { spawnSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- HELPER: Vind Blueprint ---
function findBlueprint(siteType) {
    const { siteType, projectName, layout = 'standard', style = 'modern' } = args;

    const root = path.resolve(__dirname, '..');
    const blueprintDir = path.join(__dirname, '../3-sitetypes', siteType, 'blueprint');
    const blueprintPath = path.join(blueprintDir, `${siteType}.json`);
    
    if (!fs.existsSync(blueprintDir)) {
        throw new Error(`Sitetype '${siteType}' bestaat niet (geen map: ${blueprintDir})`);
    }

    const files = fs.readdirSync(blueprintDir).filter(f => f.endsWith('.json'));
    if (files.length === 0) {
        throw new Error(`Geen blueprint (.json) gevonden in ${blueprintDir}`);
    }

    // Neem de eerste gevonden JSON als blueprint
    return path.join(siteType, 'blueprint', files[0]);
}

// --- HELPER: Run Data Sync ---
function runDataSync(projectName) {
    console.log(`\n🔄 Automatische Data Sync voor ${projectName}...`);
    const syncScript = path.join(__dirname, 'sync-tsv-to-json.js');
    
    const result = spawnSync('node', [syncScript, projectName], { 
        stdio: 'inherit',
        encoding: 'utf-8' 
    });

    if (result.status !== 0) {
        console.warn(`⚠️ Data sync waarschuwing: Process eindigde met code ${result.status}`);
    }
}

// --- HELPER: Load Test Fixtures ---
function loadTestFixtures(projectName, siteType) {
    if (!projectName.startsWith('test-')) return;

    const fixtureSource = path.join(__dirname, '../tests/fixtures', siteType);
    const projectDest = path.join(__dirname, '../../input', projectName, 'tsv-data');

    if (fs.existsSync(fixtureSource)) {
        console.log(`🧪 Test Fixtures gevonden voor '${siteType}'. Kopiëren naar ../input...`);
        fs.mkdirSync(projectDest, { recursive: true });
        fs.cpSync(fixtureSource, projectDest, { recursive: true });
        console.log(`   ✅ Fixtures geladen.`);
    } else {
        console.log(`ℹ️  Geen specifieke fixtures gevonden voor '${siteType}' in tests/fixtures.`);
    }
}

// --- MAIN MCP ACTION ---
async function run() {
    // Haal argumenten op. We verwachten een --payload='{...}' vlag
    const args = process.argv.slice(2);
    const payloadArg = args.find(a => a.startsWith('--payload='));

    if (!payloadArg) {
        console.error(JSON.stringify({ 
            status: "error", 
            message: "Gebruik: node athena-mcp-runner.js --payload='{\"project\":\"naam\", \"type\":\"medical\"}'" 
        }));
        process.exit(1);
    }

    let payload;
    try {
        payload = JSON.parse(payloadArg.split('=')[1]);
    } catch (e) {
        console.error(JSON.stringify({ status: "error", message: "Ongeldige JSON payload" }));
        process.exit(1);
    }

    const { project, type, layout = 'standard', style = 'modern.css' } = payload;

    if (!project || !type) {
        console.error(JSON.stringify({ status: "error", message: "Parameters 'project' en 'type' zijn verplicht." }));
        process.exit(1);
    }

    try {
        // 0. Laad test fixtures indien van toepassing
        loadTestFixtures(project, type);

        // 1. Zoek de blueprint automatisch
        const blueprintFile = findBlueprint(type);
        console.log(`🔍 Blueprint gevonden: ${blueprintFile}`);

        // 2. Roep de Factory aan
        await createProject({
            projectName: project,
            blueprintFile: blueprintFile,
            siteType: type,
            layoutName: layout,
            styleName: style
        });

        // 3. Voer direct de sync uit (essentieel voor werkende site)
        runDataSync(project);

        // 4. Output succes
        console.log(JSON.stringify({
            status: "success",
            message: `Project '${project}' succesvol aangemaakt als type '${type}'.`,
            details: {
                url: `../sites/${project}`,
                blueprint: blueprintFile
            }
        }));

    } catch (error) {
        console.error(JSON.stringify({
            status: "error",
            message: error.message,
            stack: error.stack
        }));
        process.exit(1);
    }
}
run();
