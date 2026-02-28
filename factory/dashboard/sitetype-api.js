import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateWithAI } from '../5-engine/core/ai-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

// --- AI FUNCTIE VOOR DATASTRUCTUUR GENERATIE ---
async function generateDataStructure(businessDescription) {
    console.log("🧠 AI Data Architect analyseert de business...");
    
    const prompt = `
        Je bent een informatie-architect. Analyseer de volgende business: "${businessDescription}".
        
        Jouw taak: identificeer de essentiële data-eenheden (entiteiten) en hun eigenschappen (kolommen) die nodig zijn voor een website.

        Structuur je output als volgt:
        - Minimum 2, maximum 5 datatabellen
        - Elke tabel met minimum 2, maximum 6 kolommen
        - Reële kolomnamen in het Nederlands
        - Zinnige beschrijvingen
        - Wees specifiek voor de branche

        Output MOET een valide JSON-array zijn met objecten met "table_name" en "columns" (array van objecten met "name" en "description").
        
        Voorbeeld output:
        [
          {
            "table_name": "recepten",
            "columns": [
              {"name": "titel", "description": "De naam van het gerecht"},
              {"name": "bereidingstijd", "description": "Tijd om te koken in minuten"},
              {"name": "ingredienten", "description": "Lijst van benodigde ingrediënten"}
            ]
          }
        ]
    `;

    try {
        const result = await generateWithAI(prompt, { isJson: true });
        if (!result) throw new Error("AI gaf geen geldige output.");
        return result;
    } catch (error) {
        console.error("❌ Fout bij het genereren van datastructuur:", error.message);
        return null;
    }
}

// --- AI FUNCTIE VOOR PARSER INSTRUCTIES ---
async function generateParserInstructions(table) {
    console.log(`🧩 AI Parser Engineer creëert parser voor ${table.table_name}...`);
    
    const prompt = `
        Je bent een data-specialist. Geef instructies om data te extraheren voor de tabel "${table.table_name}".
        
        Tabelkolommen:
        ${table.columns.map(col => `- ${col.name}: ${col.description}`).join('\n')}
        
        Geef praktische tips voor data-extractie. Focus op herkenbare patronen in ongestructureerde tekst (bv. CSV, notities, webcontent).
        
        Output als JSON-object met "strategy" (algemene aanpak) en "fields" (specifieke extractie-tips per kolom).
        
        Voorbeeld:
        {
          "strategy": "Zoek naar patroon [naam] - [omschrijving] - [prijs]",
          "fields": {
            "titel": "Eerste woord of zin, vaak vetgedrukt",
            "prijs": "Getal met euro-teken er direct voor of na"
          }
        }
    `;

    try {
        const result = await generateWithAI(prompt, { isJson: true });
        return result;
    } catch (error) {
        console.error("❌ Fout bij genereren parser-instructies:", error.message);
        return null;
    }
}

// --- AI FUNCTIE VOOR DESIGN SUGGESTIES ---
async function generateDesignSuggestion(businessDescription) {
    console.log("\n🎨 AI Design Architect ontwerpt een visuele stijl...");
    
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

    try {
        const result = await generateWithAI(prompt, { isJson: true });
        return result;
    } catch (error) {
        console.error("❌ Fout bij het genereren van AI-design:", error.message);
        return null;
    }
}

// --- API FUNCTIES ---

// Genereer datastructuur voorstel
export async function generateDataStructureAPI(businessDescription) {
    if (!businessDescription || businessDescription.trim().length === 0) {
        throw new Error("Business beschrijving is verplicht");
    }
    
    const structure = await generateDataStructure(businessDescription);
    if (!structure) {
        throw new Error("Kon geen datastructuur genereren");
    }
    
    return structure;
}

// Genereer parser instructies
export async function generateParserInstructionsAPI(table) {
    const instructions = await generateParserInstructions(table);
    if (!instructions) {
        throw new Error("Kon geen parser-instructies genereren");
    }
    return instructions;
}

// Genereer design suggesties
export async function generateDesignSuggestionAPI(businessDescription) {
    const design = await generateDesignSuggestion(businessDescription);
    if (!design) {
        throw new Error("Kon geen design suggesties genereren");
    }
    return design;
}

// Genereer complete sitetype
export async function generateCompleteSiteType(name, description, dataStructure, designSystem, track = 'autonomous') {
    try {
        const config = {
            name: name.toLowerCase().replace(/\s+/g, '-'),
            description: description,
            data_structure: dataStructure,
            design_system: designSystem,
            track: track
        };

        await generateFiles(config, root);
        return { success: true, message: `Sitetype ${name} succesvol aangemaakt in track ${track}` };
    } catch (error) {
        throw new Error(`Fout bij aanmaken sitetype: ${error.message}`);
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

    // Stap 2: Genereer parser-instructies voor elke tabel
    const parserInstructions = {};
    for (const table of config.data_structure) {
        console.log(`🧩 Parser-instructies genereren voor ${table.table_name}...`);
        const instructions = await generateParserInstructions(table);
        parserInstructions[table.table_name] = instructions;
    }
    console.log("   🧩 Alle parser-instructies zijn klaar.");

    // Pad naar de nieuwe sitetype map (gerespecteerde Two-Track mappenstructuur)
    const sitetypePath = path.join(root, '3-sitetypes', config.track, config.name);
    if (fs.existsSync(sitetypePath)) {
        throw new Error(`Map "${config.name}" bestaat al in 3-sitetypes/${config.track}.`);
    }

    // Stap 3: Genereer blueprint
    console.log(`📄 Blueprint "${config.name}.json" wordt aangemaakt...`);
    const blueprintDir = path.join(sitetypePath, 'blueprint');
    fs.mkdirSync(blueprintDir, { recursive: true });
    const blueprint = {
        blueprint_name: config.name,
        description: config.description,
        data_structure: config.data_structure,
        parser_instructions: parserInstructions,
        design_system: config.design_system || {
            colors: {
                primary: "#1e293b",
                secondary: "#64748b", 
                accent: "#3b82f6",
                background: "#ffffff",
                "surface": "#f8fafc"
            },
            radius: "1rem",
            font_sans: "'Inter', sans-serif",
            font_serif: "'Playfair Display', serif"
        },
        page_structure: {
            home: ["hero", `${primaryTableName}_overzicht`, "contact"],
            overons: ["hero", "beschrijving"],
            contact: ["hero", "contact_formulier"]
        }
    };
    fs.writeFileSync(path.join(blueprintDir, `${config.name}.json`), JSON.stringify(blueprint, null, 2));
    console.log("   ✅ Blueprint opgeslagen.");

    // Stap 4: Kopieer basis bestanden van agency-luxury template (bevindt zich in autonomous track)
    const templatePath = path.join(root, '3-sitetypes', 'autonomous', 'agency-luxury');
    if (fs.existsSync(templatePath)) {
        console.log(`📁 Basisbestanden kopiëren van agency-luxury template...`);
        copyRecursiveSync(templatePath, sitetypePath, [
            path.join(blueprintDir, `${config.name}.json`) // Niet overschrijven
        ]);
        console.log("   ✅ Basisbestanden gekopieerd.");
    }

    // Stap 5: Update package.json voor de parser
    console.log(`🧩 Parser "${config.name}.js" wordt aangemaakt...`);
    const parserDir = path.join(sitetypePath, 'parser');
    if (!fs.existsSync(parserDir)) fs.mkdirSync(parserDir, { recursive: true });

    const parserTemplate = `
import { ParserEngine } from '../../5-engine/parser-engine.js';

export class ${toPascalCase(config.name)}Parser extends ParserEngine {
    constructor() {
        super('${config.name}');
    }

    // Specifieke parsing logica voor ${config.name}
    async customParsing(data) {
        return data;
    }
}
`;

    fs.writeFileSync(path.join(parserDir, `parser-${config.name}.js`), parserTemplate.trim());
    console.log("   ✅ Parser opgeslagen.");

    console.log(`\n🎉 Sitetype "${config.name}" succesvol aangemaakt in:\n   ${sitetypePath}`);
    console.log("\n📋 Volgende stappen:");
    console.log(`1. Pas de componenten aan in: ${path.join(sitetypePath, 'web')}`);
    console.log(`2. Test de parser in: ${path.join(sitetypePath, 'parser')}`);
    console.log(`3. Gebruik de wizard: node 5-engine/site-wizard.js`);
}

// --- HULPFUNCTIES ---

function copyRecursiveSync(src, dest, exclude = []) {
    const exists = fs.existsSync(src);
    const stats = exists && fs.statSync(src);
    const isDirectory = exists && stats.isDirectory();
    
    if (isDirectory) {
        if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
        fs.readdirSync(src).forEach(childItemName => {
            const srcPath = path.join(src, childItemName);
            const destPath = path.join(dest, childItemName);
            
            // Sla uitgesloten bestanden/directories over
            if (exclude.some(excludePath => srcPath === excludePath)) {
                return;
            }
            
            copyRecursiveSync(srcPath, destPath, exclude);
        });
    } else {
        fs.copyFileSync(src, dest);
    }
}

function toPascalCase(str) {
    return str
        .replace(/(?:^|[\s_-])+(.)/g, (_, char) => char.toUpperCase())
        .replace(/[^a-zA-Z0-9]/g, '');
}

// Bestaande sitetypes ophalen
export function getExistingSiteTypes() {
    const tracks = ['docked', 'autonomous'];
    const results = [];

    tracks.forEach(track => {
        const dir = path.join(root, '3-sitetypes', track);
        if (fs.existsSync(dir)) {
            const types = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory() && !f.startsWith('.'));
            
            types.forEach(type => {
                let description = "Geen beschrijving beschikbaar.";
                let tableCount = 0;
                const blueprintPath = path.join(dir, type, 'blueprint', `${type}.json`);

                if (fs.existsSync(blueprintPath)) {
                    try {
                        const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));
                        description = blueprint.description || description;
                        if (Array.isArray(blueprint.data_structure)) {
                            tableCount = blueprint.data_structure.length;
                        }
                    } catch (e) {
                        console.error(`Fout bij lezen blueprint voor ${type}:`, e.message);
                    }
                }

                // Count layouts
                let layoutCount = 0;
                const webDir = path.join(dir, type, 'web');
                if (fs.existsSync(webDir)) {
                    layoutCount = fs.readdirSync(webDir).filter(f => fs.statSync(path.join(webDir, f)).isDirectory()).length;
                }

                results.push({
                    name: type,
                    track: track,
                    description: description,
                    tableCount,
                    layoutCount
                });
            });
        }
    });

    return results;
}
