/**
 * @file sitetype-wizard.js
 * @description Wizard voor het aanmaken van een volledig nieuw site-type.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadEnv } from '../env-loader.js';
import { rl, ask } from '../cli-interface.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- HELPER FUNCTIE VOOR OPMAAK ---
function formatInColumns(items) {
    const termWidth = process.stdout.columns || 80;
    const maxColumns = Math.floor(termWidth / 20); // Max breedte per item
    const columns = Math.min(items.length, maxColumns, 4); // Max 4 kolommen
    if (columns === 0) return "";

    const colWidth = Math.floor(termWidth / columns);
    let output = "";
    for (let i = 0; i < items.length; i += columns) {
        const row = items.slice(i, i + columns);
        output += row.map(item => item.padEnd(colWidth)).join("") + "\n";
    }
    return output;
}

// --- AI FUNCTIE VOOR BLUEPRINT SUGGESTIES ---
async function generateBlueprintSuggestion(businessDescription, rawInputData = "") {
    console.log("\n🤖 AI Data Architect denkt na over een structuur...");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const modelName = process.env.AI_MODEL_DATA_ARCHITECT || process.env.AI_MODEL_DEFAULT || "gemini-flash-latest";
        const model = genAI.getGenerativeModel({ model: modelName });

        const contextInfo = rawInputData 
            ? `Analyseer de volgende RUWE DATA van de klant:\n---\n${rawInputData.substring(0, 5000)}\n---\nGebruik deze data om de tabellen en kolommen te bepalen.`
            : `Ontwerp een datastructuur voor het volgende type bedrijf: "${businessDescription}".`;

        const prompt = `
            Je bent een expert in data-architectuur voor websites.
            ${contextInfo}

            Je output MOET een valide JSON-object zijn. Dit object bevat één enkele key: "data_structure".
            De waarde van "data_structure" is een array van JSON-objecten.
            Elk object in de array stelt een datatabel voor en heeft twee keys:
            1. "table_name": Een korte, logische naam voor de tabel (bv. "team", "services", "projects"). Gebruik snake_case.
            2. "columns": Een array van JSON-objecten. Elk object representeert een kolom en heeft TWEE keys:
               - "name": een korte, technische kolomnaam (bv. "product_name", "image_url"). Gebruik snake_case.
               - "description": een KORTE, DUIDELIJKE uitleg voor de EINDGEBRUIKER (de klant) over wat deze kolom betekent. Schrijf dit in het Nederlands.

            Houd de structuur logisch en efficiënt. Maak minimaal 2 tabellen. Een van de tabellen moet altijd 'basis' heten en de algemene info bevatten (naam, adres, etc.).

            Geef ALLEEN de JSON terug, zonder extra tekst of markdown.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Gemini 3 handling: find text part
        const parts = response.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find(p => p.text);
        const text = textPart ? textPart.text : response.text();
        const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();

        const parsed = JSON.parse(cleanJson);
        if (parsed.data_structure && Array.isArray(parsed.data_structure)) {
            console.log("   ✅ AI heeft een voorstel gegenereerd op basis van de input.");
            return parsed.data_structure;
        } else {
            throw new Error("Ongeldig formaat van AI-respons.");
        }
    } catch (error) {
        console.error("❌ Fout bij het genereren van AI-voorstel:", error.message);
        return null;
    }
}

// --- AI FUNCTIE VOOR PROMPT SUGGESTIES ---
async function generatePromptSuggestion(businessDescription, dataStructure) {
    console.log("\n🤖 AI Prompt Engineer denkt na over een goede prompt...");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
            Je bent een expert in het schrijven van instructie-prompts voor AI-modellen.
            Je taak is om een "customPrompt" te schrijven voor onze Athena Parser Engine.
            Deze prompt zal de AI instrueren hoe het ongestructureerde tekst moet omzetten naar een gestructureerde JSON-output.

            CONTEXT:
            - Bedrijfstype: "${businessDescription}"
            - De data moet in de volgende JSON-structuur passen:
              \`\`\`json
              ${JSON.stringify(dataStructure, null, 2)}
              \`\`\`

            SCHRIJF EEN PROMPT DIE:
            1. De AI vertelt om de input-tekst te analyseren.
            2. Specifieke instructies geeft per tabel en kolom. Wees creatief en geef de AI tips over waar het specifieke informatie kan vinden.
            3. Duidelijk maakt welke informatie in welke kolom hoort.

            Je output moet ALLEEN de tekst van de prompt zijn, zonder extra uitleg, titels of markdown.
            De prompt moet beginnen met een algemene instructie en dan per tabel specifieke tips geven.

            VOORBEELD OUTPUT VOOR EEN "RESTAURANT":
            Analyseer de menukaart en website van het restaurant.
            - Voor de 'basis' tabel: Zoek de naam, het adres, contactgegevens en de algemene openingstijden.
            - Voor de 'menu' tabel: Identificeer elk gerecht. Bepaal de naam, beschrijving, prijs en de categorie (bv. 'voorgerecht', 'hoofdgerecht'). Probeer ook eventuele allergenen te extraheren uit de beschrijving.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Gemini 3 handling: find text part
        const parts = response.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find(p => p.text);
        const text = textPart ? textPart.text : response.text();
        console.log("   ✅ AI heeft een prompt-voorstel gegenereerd.");
        return text.trim();

    } catch (error) {
        console.error("❌ Fout bij het genereren van AI-prompt:", error.message);
        return null;
    }
}

// --- AI FUNCTIE VOOR DESIGN SUGGESTIES ---
async function generateDesignSuggestion(businessDescription) {
    console.log("\n🎨 AI Design Architect ontwerpt een visuele stijl...");
    try {
        const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

        const prompt = `
            Je bent een UI/UX expert gespecialiseerd in Tailwind CSS v4.
            Ontwerp een modern design-systeem voor het volgende bedrijf: "${businessDescription}".

            Je output MOET een valide JSON-object zijn met de volgende keys:
            1. "colors": Een object met hex-codes voor primary, secondary, accent, background en surface.
            2. "radius": Een waarde voor de afronding van hoeken (bv. "0.5rem", "1.5rem", "0px").
            3. "font_sans": Een Google Font of systeem-font stack voor de body tekst.
            4. "font_serif": Een passend font voor headers.

            Houd rekening met de sector. Een advocaat heeft andere kleuren nodig dan een kinderdagverblijf.

            Voorbeeld output:
            {
              "colors": {
                "primary": "#1e293b",
                "secondary": "#64748b",
                "accent": "#3b82f6",
                "background": "#ffffff",
                "surface": "#f8fafc"
              },
              "radius": "1rem",
              "font_sans": "'Inter', sans-serif",
              "font_serif": "'Playfair Display', serif"
            }

            Geef ALLEEN de JSON terug, zonder extra tekst of markdown.
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        
        // Gemini 3 handling: find text part
        const parts = response.candidates?.[0]?.content?.parts || [];
        const textPart = parts.find(p => p.text);
        const text = textPart ? textPart.text : response.text();
        const cleanJson = text.replace(/\\\`\`\`json/g, '').replace(/\\\`\`\`/g, '').trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("❌ Fout bij het genereren van AI-design:", error.message);
        return null;
    }
}

// --- GENERATIEFUNCTIE ---
async function generateFiles(config, root) {
    console.log("\n⚙️  Bezig met genereren...");

    // Stap 1: Analyseer de datastructuur
    const primaryTable = config.data_structure[0];
    if (!primaryTable || !primaryTable.table_name || !primaryTable.columns || primaryTable.columns.length === 0) {
        throw new Error("Ongeldige datastructuur: de eerste tabel moet een naam en minstens één kolom hebben.");
    }
    const primaryTableName = primaryTable.table_name;
    const primaryFieldName = primaryTable.columns[0].name;
    console.log(`   🧠 Analyse compleet: Primaire tabel is "${primaryTableName}", primair veld is "${primaryFieldName}".`);

    // Paden definiëren op basis van track
    const track = config.track || 'docked';
    const siteTypeDir = path.join(root, '3-sitetypes', track, config.siteTypeName);
    const blueprintDir = path.join(siteTypeDir, 'blueprint');
    const toolsDir = path.join(siteTypeDir, 'parser');
    const webDir = path.join(siteTypeDir, 'web', 'standard');
    const componentsDir = path.join(webDir, 'components');
    
    // Boilerplate bron bepalen (nu gebaseerd op de track!)
    const boilerplateDir = path.join(root, '2-templates', 'boilerplate', track === 'autonomous' ? 'autonomous' : 'docked');
    const boilerplateComponentsDir = path.join(boilerplateDir, 'components');

    // Mappen aanmaken
    await fs.mkdir(componentsDir, { recursive: true });
    await fs.mkdir(blueprintDir, { recursive: true });
    await fs.mkdir(toolsDir, { recursive: true });
    console.log(`   ✅ Mappenstructuur aangemaakt in: ${siteTypeDir}`);

    // Blueprint schrijven
    const blueprintPath = path.join(blueprintDir, `${config.siteTypeName}.json`);
    const blueprintContent = {
        blueprint_name: config.siteTypeName,
        track: track,
        data_structure: config.data_structure,
        design_system: config.designSystem || null
    };
    await fs.writeFile(blueprintPath, JSON.stringify(blueprintContent, null, 2));
    console.log(`   ✅ Blueprint aangemaakt: ${blueprintPath}`);

    // Boilerplate templates inlezen
    const templates = {};
    try {
        templates['parser.js'] = await fs.readFile(path.join(root, '2-templates', 'boilerplate', 'SPA', 'parser.js'), 'utf8'); // Parser template is vaak generiek SPA
        templates['App.jsx'] = await fs.readFile(path.join(boilerplateDir, 'App.jsx'), 'utf8');
        templates['Header.jsx'] = await fs.readFile(path.join(boilerplateComponentsDir, 'Header.jsx'), 'utf8');
        templates['Section.jsx'] = await fs.readFile(path.join(boilerplateComponentsDir, 'Section.jsx'), 'utf8');
        templates['index.css'] = await fs.readFile(path.join(boilerplateDir, 'index.css'), 'utf8');
        templates['main.jsx'] = await fs.readFile(path.join(boilerplateDir, 'main.jsx'), 'utf8');
    } catch (e) {
        console.warn(`   ⚠️  Sommige boilerplate bestanden ontbreken in ${boilerplateDir}. We proberen fallback naar SPA template.`);
        const spaDir = path.join(root, '2-templates', 'boilerplate', 'SPA');
        templates['App.jsx'] = templates['App.jsx'] || await fs.readFile(path.join(spaDir, 'App.jsx'), 'utf8');
        templates['main.jsx'] = templates['main.jsx'] || await fs.readFile(path.join(spaDir, 'main.jsx'), 'utf8');
        // Voeg andere fallbacks toe indien nodig
    }

    // Placeholders vervangen
    const safePromptContent = (config.customPrompt || `\nHIER KOMT DE CUSTOM PROMPT VOOR ${config.siteTypeName}\n`).replace(/`/g, "'");

    templates['parser.js'] = templates['parser.js']
        .replace(/{{CUSTOM_PROMPT_CONTENT}}/g, safePromptContent)
        .replace(/{{SITE_TYPE_NAME}}/g, config.siteTypeName);

    templates['App.jsx'] = templates['App.jsx']
        .replace(/{{SITE_TYPE_NAME}}/g, config.siteTypeName)
        .replace(/{{PRIMARY_TABLE_NAME}}/g, primaryTableName);

    if (templates['Header.jsx']) {
        templates['Header.jsx'] = templates['Header.jsx']
            .replace(/{{PRIMARY_FIELD_NAME}}/g, primaryFieldName)
            .replace(/{{PRIMARY_TABLE_NAME}}/g, primaryTableName);
    }

    // Design System integreren in CSS
    let themeBlock = `
@theme {
  --color-primary: ${config.designSystem?.colors?.primary || '#0f172a'};
  --color-secondary: ${config.designSystem?.colors?.secondary || '#64748b'};
  --color-accent: ${config.designSystem?.colors?.accent || '#3b82f6'};
  --color-background: ${config.designSystem?.colors?.background || '#ffffff'};
  --color-surface: ${config.designSystem?.colors?.surface || '#f8fafc'};
  
  --font-sans: ${config.designSystem?.font_sans || "'Inter', sans-serif"};
  --font-serif: ${config.designSystem?.font_serif || "'Playfair Display', serif"};
  
  --radius-custom: ${config.designSystem?.radius || '1rem'};
}`;

    if (templates['index.css']) {
        templates['index.css'] = `@import "tailwindcss";
@import "../../../../2-templates/css/modern.css";

${themeBlock}

/* Project-specifieke stijlen voor ${config.siteTypeName} */
`;
    }

    // Bestanden schrijven
    await fs.writeFile(path.join(toolsDir, `parser-${config.siteTypeName}.js`), templates['parser.js']);
    if (templates['App.jsx']) await fs.writeFile(path.join(webDir, 'App.jsx'), templates['App.jsx']);
    if (templates['main.jsx']) await fs.writeFile(path.join(webDir, 'main.jsx'), templates['main.jsx']);
    if (templates['index.css']) await fs.writeFile(path.join(webDir, 'index.css'), templates['index.css']);
    if (templates['Header.jsx']) await fs.writeFile(path.join(componentsDir, 'Header.jsx'), templates['Header.jsx']);
    if (templates['Section.jsx']) await fs.writeFile(path.join(componentsDir, 'Section.jsx'), templates['Section.jsx']);

    console.log('   ✅ Boilerplate bestanden (parser, App.jsx, etc.) aangemaakt.');
}


// --- HOOFDFUNCTIE ---
async function createSiteTypeWizard() {
    await loadEnv(path.join(__dirname, '../.env'));

    console.log("============================================");
    console.log("🧙‍♂️ Welkom bij de Athena Site-Type Wizard");
    console.log("============================================");
    console.log("Deze tool helpt je een nieuw site-type te definiëren.\n");

    const config = {};
    const root = path.resolve(__dirname, '..');

    // --- STAP 0: KIES TRACK ---
    console.log("Kies de track voor dit sitetype:");
    console.log("[1] Docked (Minimale code, beheer via Athena Dock)");
    console.log("[2] Autonomous (Zelfstandige editor-suite)");
    const trackChoice = await ask("Keuze (1/2): ");
    config.track = trackChoice === '2' ? 'autonomous' : 'docked';
    console.log(`✅ Track ingesteld op: ${config.track}\n`);

    // --- STAP 0.5: TOON BESTAANDE SITE TYPES ---
    const siteTypesDir = path.join(root, '3-sitetypes', config.track);
    try {
        const existing = await fs.readdir(siteTypesDir);
        const stats = await Promise.all(existing.map(file => fs.stat(path.join(siteTypesDir, file))));
        const existingDirs = existing.filter((file, index) => stats[index].isDirectory());

        if (existingDirs.length > 0) {
            console.log("-------------------------------------------");
            console.log(`Bestaande ${config.track} sitetypes:`);
            console.log(formatInColumns(existingDirs));
            console.log("-------------------------------------------\n");
        }
    } catch (e) {
        // Directory bestaat wss nog niet
    }

    // --- STAP 1: NAAM VAN HET SITE-TYPE ---
    while (true) {
        const rawName = await ask('📝 Wat is de naam van het nieuwe site-type? (bv. "fotograaf", "restaurant"): ');
        const safeName = rawName.trim().toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-');

        if (safeName.length < 3) {
            console.log("❌ Naam te kort. Gebruik minstens 3 letters.");
            continue;
        }

        const siteTypePath = path.join(root, '3-sitetypes', config.track, safeName);
        if ((await fs.stat(siteTypePath).catch(() => null))?.isDirectory()) {
            console.log(`❌ Site-type "${safeName}" bestaat al in track "${config.track}".`);
            continue;
        }

        config.siteTypeName = safeName;
        console.log(`✅ OK! We gaan een site-type genaamd "${config.siteTypeName}" aanmaken.`);
        break;
    }

    // --- STAP 1.5: INPUT ANALYSE ---
    let rawInputData = "";
    const siteNameSuggestion = config.siteTypeName;
    const defaultInputPath = `../../input/${siteNameSuggestion}/input/raw-input.txt`;
    
    const inputPath = await ask(`\n📄 Pad naar ruwe input data voor analyse? (leeg laten voor: ${defaultInputPath}): `);
    const finalInputPath = path.resolve(__dirname, inputPath.trim() || defaultInputPath);

    try {
        rawInputData = await fs.readFile(finalInputPath, 'utf8');
        console.log(`   ✅ Input bestand geladen (${rawInputData.length} tekens).`);
    } catch (e) {
        console.log(`   ⚠️  Kon input bestand niet laden op ${finalInputPath}. We gaan verder met een algemene omschrijving.`);
    }

    if (!rawInputData) {
        config.businessDescription = await ask('\n🏢 Geef een korte omschrijving van het bedrijf: ');
    } else {
        config.businessDescription = `Gebaseerd op de geanalyseerde tekst van ${config.siteTypeName}`;
    }


    // --- STAP 2: DATASTRUCTUUR (BLUEPRINT) ---
    config.data_structure = [];

    const useAI = await ask('\n🤖 Wilt u dat de AI een voorstel voor de datastructuur genereert? (j/n): ');
    if (useAI.toLowerCase() !== 'n') {
        const suggestion = await generateBlueprintSuggestion(config.businessDescription, rawInputData);
        if (suggestion) {
            console.log("\n   --- AI Voorstel ---");
            console.log(JSON.stringify(suggestion, null, 2));
            console.log("   --------------------");
            const accept = await ask('Wilt u dit voorstel gebruiken als startpunt? (j/n): ');
            if (accept.toLowerCase() !== 'n') {
                config.data_structure = suggestion;
            }
        }
    }

    // --- STAP 2.5: DATASTRUCTUUR EDITOR ---
    while (true) {
        console.log("\n🏛️  Huidige Datastructuur:");
        if (config.data_structure.length === 0) {
            console.log("   [Leeg]");
        } else {
            // Aangepaste weergave voor de nieuwe structuur
            config.data_structure.forEach((table, i) => {
                console.log(`\n   [${i + 1}] Tabel: "${table.table_name}"`);
                table.columns.forEach(col => {
                    console.log(`     - Kolom: "${col.name}" (Beschrijving: "${col.description}")`);
                });
            });
        }

        const action = await ask("\n   Wat wilt u doen? [1] Tabel Toevoegen, [2] Tabel Bewerken/Bekijken, [3] Tabel Verwijderen, [klaar]: ");

        if (action.toLowerCase() === 'klaar') {
            if (config.data_structure.length === 0) {
                console.log("❌ De datastructuur mag niet leeg zijn.");
                continue;
            }
            break;
        }

        if (action === '1') { // Tabel Toevoegen
            const tableName = await ask('   Naam voor de nieuwe tabel: ');
            const columns = [];
            while (true) {
                const colName = await ask(`     - Voeg kolom-naam toe voor "${tableName}" (of 'klaar'): `);
                if (colName.toLowerCase() === 'klaar') break;
                const colDesc = await ask(`       - Beschrijving voor "${colName}": `);
                columns.push({ name: colName, description: colDesc });
            }
            if (columns.length > 0) {
                config.data_structure.push({ table_name: tableName, columns });
            }
        } else if (action === '2') { // Tabel Bewerken
             if (config.data_structure.length === 0) {
                console.log("   Er zijn geen tabellen om te bewerken.");
                continue;
            }
            const tableIndexStr = await ask(`   Nummer van de tabel om te bewerken (1-${config.data_structure.length}): `);
            const tableIndex = parseInt(tableIndexStr) - 1;

            if (tableIndex >= 0 && tableIndex < config.data_structure.length) {
                const table = config.data_structure[tableIndex];
                while(true) {
                     console.log(`\n   Bewerken van Tabel "${table.table_name}":`);
                     table.columns.forEach((col, i) => {
                         console.log(`     [${i + 1}] Kolom: "${col.name}" (Beschrijving: "${col.description}")`);
                     });
                     const colAction = await ask("     Wat wilt u doen? [1] Kolom Toevoegen, [2] Kolom Bewerken, [3] Kolom Verwijderen, [klaar]: ");

                     if (colAction.toLowerCase() === 'klaar') break;

                     if (colAction === '1') { // Kolom toevoegen
                         const colName = await ask(`       - Nieuwe kolom-naam: `);
                         const colDesc = await ask(`       - Beschrijving voor "${colName}": `);
                         table.columns.push({ name: colName, description: colDesc });
                     } else if (colAction === '2') { // Kolom bewerken
                         const colIndexStr = await ask(`       Nummer van de kolom om te bewerken (1-${table.columns.length}): `);
                         const colIndex = parseInt(colIndexStr) - 1;
                         if(colIndex >= 0 && colIndex < table.columns.length) {
                             const oldName = table.columns[colIndex].name;
                             const oldDesc = table.columns[colIndex].description;
                             const newName = await ask(`       - Nieuwe naam voor "${oldName}" (leeg laten om niet te wijzigen): `);
                             const newDesc = await ask(`       - Nieuwe beschrijving voor "${oldName}" (leeg laten om niet te wijzigen): `);
                             if (newName) table.columns[colIndex].name = newName;
                             if (newDesc) table.columns[colIndex].description = newDesc;
                         } else { console.log("       Ongeldig kolomnummer."); }
                     } else if (colAction === '3') { // Kolom verwijderen
                         const colIndexStr = await ask(`       Nummer van de kolom om te verwijderen (1-${table.columns.length}): `);
                         const colIndex = parseInt(colIndexStr) - 1;
                         if(colIndex >= 0 && colIndex < table.columns.length) {
                             table.columns.splice(colIndex, 1);
                             console.log("       ✅ Kolom verwijderd.");
                         } else { console.log("       Ongeldig kolomnummer."); }
                     }
                }
            } else {
                console.log("   Ongeldig tabelnummer.");
            }

        } else if (action === '3') { // Tabel Verwijderen
            if (config.data_structure.length === 0) {
                console.log("   Er zijn geen tabellen om te verwijderen.");
                continue;
            }
            const tableIndex = await ask(`   Nummer van de tabel om te verwijderen (1-${config.data_structure.length}): `);
            const index = parseInt(tableIndex) - 1;
            if (index >= 0 && index < config.data_structure.length) {
                config.data_structure.splice(index, 1);
            } else {
                console.log("   Ongeldig nummer.");
            }
        }
    }


    console.log("\n✅ Datastructuur is compleet.");

    // --- STAP 3: AI DESIGN SUGGESTIE ---
    config.designSystem = null;
    const useAIDesign = await ask('\n🎨 Wilt u dat de AI een voorstel voor het design-systeem (kleuren, fonts) genereert? (j/n): ');
    if (useAIDesign.toLowerCase() !== 'n') {
        const suggestion = await generateDesignSuggestion(config.businessDescription);
        if (suggestion) {
            console.log("\n   --- AI Design Voorstel ---");
            console.log(JSON.stringify(suggestion, null, 2));
            console.log("   ---------------------------");
            const accept = await ask('Wilt u dit design-systeem gebruiken? (j/n): ');
            if (accept.toLowerCase() !== 'n') {
                config.designSystem = suggestion;
            }
        }
    }

    // --- STAP 4: AI PROMPT GENERATIE ---
    const useAIPrompt = await ask('\n🤖 Wilt u dat de AI een voorstel doet voor de parser-prompt? (j/n): ');
    if (useAIPrompt.toLowerCase() !== 'n') {
        const suggestion = await generatePromptSuggestion(config.businessDescription, config.data_structure);
        if (suggestion) {
            console.log("\n   --- AI Voorstel voor Custom Prompt ---");
            console.log(suggestion);
            console.log("   ------------------------------------");
            const accept = await ask('Wilt u deze prompt gebruiken? (j/n): ');
            if (accept.toLowerCase() !== 'n') {
                config.customPrompt = suggestion;
            }
        }
    }

    // --- STAP 4: GENERATIE STARTEN ---
    if ((await ask('\nStart de generatie van het site-type? (j/n): ')).toLowerCase() === 'n') {
        console.log('Generatie geannuleerd.');
        rl.close();
        return;
    }

    await generateFiles(config, root);

    console.log(`\n✨ Site-type '${config.siteTypeName}' is succesvol aangemaakt!`);
    console.log('   Volgende stappen:');
    console.log(`   1. Gebruik 'node 5-engine/site-wizard.js' om een website met dit nieuwe type te genereren.`);
    console.log(`   2. (Optioneel) Controleer en verfijn de AI-prompt in ${path.join('3-sitetypes', config.siteTypeName, 'parser', `parser-${config.siteTypeName}.js`)}`);
    console.log(`   3. (Optioneel) Pas de React-componenten aan in ${path.join('3-sitetypes', config.siteTypeName, 'web', 'standard', 'components')}`);

    rl.close();
}

await createSiteTypeWizard();
