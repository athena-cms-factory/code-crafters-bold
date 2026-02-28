import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateWithAI } from '../5-engine/core/ai-engine.js';
import { loadEnv } from '../5-engine/env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const root = path.resolve(__dirname, '..');
    await loadEnv(path.join(root, '.env'));

    // Argumenten: [naam] [track] [inputPath]
    const args = process.argv.slice(2);
    const siteTypeName = args[0] || 'nieuwe-site-type';
    const track = args[1] || 'docked';
    
    // Default pad constructie op basis van naam
    const baseName = siteTypeName.replace('-type', '');
    const defaultInputPath = path.resolve(root, `../input/${baseName}/input/raw-input.txt`);
    const inputFilePath = args[2] ? path.resolve(process.cwd(), args[2]) : defaultInputPath;

    console.log("==================================================");
    console.log(`🧙‍♂️ Athena Automated Site-Type Generator`);
    console.log("==================================================");
    console.log(`📝 Naam  : ${siteTypeName}`);
    console.log(`🛤️  Track : ${track}`);
    console.log(`📄 Input : ${inputFilePath}`);

    // 1. Data inlezen
    let rawInputData = "";
    try {
        rawInputData = await fs.readFile(inputFilePath, 'utf8');
        console.log(`✅ Input geladen (${rawInputData.length} tekens).`);
    } catch (e) {
        console.error(`❌ Fout: Kon input bestand niet vinden op ${inputFilePath}`);
        process.exit(1);
    }

    // 2. Blueprint genereren
    console.log("\n🤖 AI ontwerpt datastructuur...");
    const blueprintSuggestion = await generateWithAI(`
        Je bent een expert in data-architectuur. Ontwerp een datastructuur voor een website gebaseerd op deze tekst:
        ---
        ${rawInputData.substring(0, 5000)}
        ---
        Output MOET een valide JSON zijn: { "data_structure": [ { "table_name": "...", "columns": [ { "name": "...", "description": "..." } ] } ] }.
        Maak tabellen die relevant zijn voor deze specifieke business (bv. services, team, locaties, menu, portfolio). 
        Zorg dat de eerste tabel 'basis' heet met algemene info. Gebruik snake_case voor namen.
    `, { modelStack: process.env.AI_MODEL_DATA_ARCHITECT });

    if (!blueprintSuggestion) {
        console.error("❌ Kon geen blueprint genereren.");
        process.exit(1);
    }

    // 3. Design genereren
    console.log("🎨 AI ontwerpt visuele stijl...");
    const designSuggestion = await generateWithAI(`
        Ontwerp een modern design-systeem voor een website gebaseerd op: "${rawInputData.substring(0, 500)}".
        Houd rekening met de branche-stijl.
        Output JSON: { "colors": { "primary": "...", "secondary": "...", "accent": "...", "background": "...", "surface": "..." }, "radius": "...", "font_sans": "...", "font_serif": "..." }.
    `, { modelStack: process.env.AI_MODEL_IMAGE_GENERATOR });

    // 4. Prompt genereren
    console.log("✍️  AI ontwerpt parser prompt...");
    const promptSuggestion = await generateWithAI(`
        Schrijf een korte, krachtige instructie-prompt voor een AI die ruwe tekst moet omzetten naar de JSON structuur van deze blueprint:
        ${JSON.stringify(blueprintSuggestion.data_structure, null, 2)}
        Noem specifieke velden en geef tips voor extractie.
    `, { isJson: false, modelStack: process.env.AI_MODEL_SITETYPE_PROMPT_ENGINEER });

    // 5. Mappen en bestanden aanmaken
    const siteTypeDir = path.join(root, '3-sitetypes', track, siteTypeName);
    const blueprintDir = path.join(siteTypeDir, 'blueprint');
    const toolsDir = path.join(siteTypeDir, 'parser');
    const webDir = path.join(siteTypeDir, 'web', 'standard');
    const componentsDir = path.join(webDir, 'components');
    
    // Boilerplate bron (Docked Track heeft SPA submap)
    const trackBoilerplateDir = path.join(root, '2-templates/boilerplate', track, 'SPA');
    const genericSpaDir = path.join(root, '2-templates/boilerplate/SPA');

    await fs.mkdir(componentsDir, { recursive: true });
    await fs.mkdir(blueprintDir, { recursive: true });
    await fs.mkdir(toolsDir, { recursive: true });

    // Schrijf Blueprint
    await fs.writeFile(path.join(blueprintDir, `${siteTypeName}.json`), JSON.stringify({
        blueprint_name: siteTypeName,
        track: track,
        data_structure: blueprintSuggestion.data_structure,
        design_system: designSuggestion
    }, null, 2));

    // Schrijf Parser
    const parserTemplate = await fs.readFile(path.join(genericSpaDir, 'parser.js'), 'utf8');
    await fs.writeFile(path.join(toolsDir, `parser-${siteTypeName}.js`), parserTemplate
        .replace(/{{CUSTOM_PROMPT_CONTENT}}/g, promptSuggestion.replace(/`/g, "'"))
        .replace(/{{SITE_TYPE_NAME}}/g, siteTypeName)
        .replace(/\.\.\/\.\.\/\.\.\/5-engine\/parser-engine\.js/g, '../../../../5-engine/parser-engine.js'));

    // Kopieer Web Bestanden
    const webFiles = ['App.jsx', 'main.jsx', 'index.css'];
    for (const f of webFiles) {
        try {
            let content = await fs.readFile(path.join(trackBoilerplateDir, f), 'utf8');
            if (f === 'App.jsx') {
                content = content.replace(/{{SITE_TYPE_NAME}}/g, siteTypeName)
                                 .replace(/{{PRIMARY_TABLE_NAME}}/g, blueprintSuggestion.data_structure[0].table_name);
            }
            await fs.writeFile(path.join(webDir, f), content);
            console.log(`   ✅ Bestand aangemaakt: ${f}`);
        } catch (e) {
            console.warn(`   ⚠️  Kon ${f} niet vinden in ${trackBoilerplateDir}, overgeslagen.`);
        }
    }

    // Kopieer Componenten
    const components = ['Header.jsx', 'Section.jsx'];
    for (const c of components) {
        try {
            let content = await fs.readFile(path.join(trackBoilerplateDir, 'components', c), 'utf8');
            if (c === 'Header.jsx') {
                content = content.replace(/{{PRIMARY_FIELD_NAME}}/g, blueprintSuggestion.data_structure[0].columns[0].name)
                                 .replace(/{{PRIMARY_TABLE_NAME}}/g, blueprintSuggestion.data_structure[0].table_name);
            }
            await fs.writeFile(path.join(componentsDir, c), content);
            console.log(`   ✅ Component aangemaakt: ${c}`);
        } catch (e) {
            console.warn(`   ⚠️  Kon ${c} niet vinden in ${path.join(trackBoilerplateDir, 'components')}, overgeslagen.`);
        }
    }

    console.log("\n==================================================");
    console.log(`✨ SUCCES: Sitetype "${siteTypeName}" is aangemaakt!`);
    console.log(`📂 Locatie: 3-sitetypes/${track}/${siteTypeName}`);
    console.log("==================================================");
    
    process.exit(0);
}

run();