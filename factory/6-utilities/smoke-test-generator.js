import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { createProject } from '../5-engine/core/factory.js';
import { loadEnv } from '../5-engine/env-loader.js';
import { generateWithAI } from '../5-engine/core/ai-engine.js';
import { logToFile } from '../5-engine/lib/logger.js';
import {
    generateDataStructureAPI,
    generateDesignSuggestionAPI,
    generateCompleteSiteType
} from '../dashboard/sitetype-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const factoryRoot = path.resolve(__dirname, '../');
const projectRoot = path.resolve(__dirname, '../../');

// --- CONFIGURATIE ---
const NICHES = [
    { id: 'cleanup-test', niche: 'Test Bedrijf voor Cleanup Verificatie', model: 'SPA', track: 'autonomous' }
];

async function runAutomatedShowcase() {
    await loadEnv(path.join(factoryRoot, '.env'));

    console.log(`\n🚀 Athena Smoke Test Generator gestart (Powered by Hybrid AI Engine)`);
    logToFile('smoke_test', 'START: Athena Smoke Test Generator');

    for (const item of NICHES) {
        try {
            const safeProjectName = `showcase-${item.id}`;
            const projectDir = path.resolve(projectRoot, 'sites', safeProjectName);
            
            console.log(`\n--- [ NICHE: ${item.niche.toUpperCase()} ] ---`);
            logToFile('smoke_test', `Processing Niche: ${item.niche}`);

            if (await fs.access(projectDir).then(() => true).catch(() => false)) {
                console.log(`⏩ Site "${safeProjectName}" bestaat al. Verwijder deze eerst voor een schone test.`);
                continue;
            }

            // 1. Bedrijfsnaam & Beschrijving
            console.log(`🤖 Verzin een geloofwaardig bedrijf...`);
            const biz = await generateWithAI(`Genereer een unieke, professionele naam en een uitgebreide beschrijving (min 500 woorden) for een fictief bedrijf in de niche: "${item.niche}". Output JSON: { "name": "...", "description": "..." }. Nederlands.`);
            if (!biz) continue;

            // 2. Dashboard APIs voor Structuur & Design
            console.log(`📐 API: Datastructuur genereren...`);
            const dataStructure = await generateDataStructureAPI(biz.description);
            
            console.log(`🎨 API: Design genereren...`);
            const designSystem = await generateDesignSuggestionAPI(biz.description);

            // 3. Sitetype aanmaken via Dashboard Logic
            const siteTypeName = `${safeProjectName}-type`;
            const siteTypeDir = path.resolve(factoryRoot, '3-sitetypes', item.track, siteTypeName);
            
            // CLEANUP: Verwijder oude sitetype indien aanwezig (anders crasht de API)
            if (await fs.access(siteTypeDir).then(() => true).catch(() => false)) {
                console.log(`🧹 Oude sitetype "${siteTypeName}" opruimen in track ${item.track}...`);
                await fs.rm(siteTypeDir, { recursive: true, force: true });
            }

            console.log(`🏗️  Sitetype "${siteTypeName}" aanmaken in track ${item.track}...`);
            await generateCompleteSiteType(siteTypeName, biz.description, dataStructure, designSystem, item.track);

            // 4. Project Aanmaken (Factory)
            console.log(`🏭 Project genereren...`);
            // Factory verwacht een relatief pad vanaf 3-sitetypes/
            const blueprintFile = path.join(siteTypeName, 'blueprint', `${siteTypeName}.json`);
            
            await createProject({
                projectName: safeProjectName,
                siteType: siteTypeName,
                blueprintFile: blueprintFile,
                siteModel: item.model,
                layoutName: 'standard',
                styleName: 'modern-dark.css'
            });
            
            // 5. Content Genereren
            console.log(`✍️  Content schrijven...`);
            
             const contentData = {};
             
             // First table is always primary/metadata
             const primaryTableName = dataStructure[0].table_name;

             for (const table of dataStructure) {
                console.log(`   - Data voor tabel: ${table.table_name}`);
                const prompt = `Genereer 3 items voor de tabel "${table.table_name}" voor het bedrijf "${biz.name}".
                Kolommen: ${JSON.stringify(table.columns)}.
                Context: ${biz.description}.
                Zorg voor rijke, realistische data. Gebruik Unsplash URLs voor afbeeldingen.
                Output: JSON Array van objecten.`;
                
                const data = await generateWithAI(prompt, { isJson: true });
                if (data) contentData[table.table_name] = data;
            }

            // 6. Injecteer Data
            console.log(`📝 Data injecteren...`);
            const dataDir = path.resolve(projectRoot, 'sites', safeProjectName, 'src/data');
            for (const [table, content] of Object.entries(contentData)) {
                await fs.writeFile(path.join(dataDir, `${table.toLowerCase()}.json`), JSON.stringify(content, null, 2));
            }
            
            console.log(`✅ VOLTOOID: ${safeProjectName}`);

        } catch (error) {
            console.error(`❌ Fout bij ${item.id}:`, error);
        }
    }
}

runAutomatedShowcase();