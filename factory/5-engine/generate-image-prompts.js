/**
 * @file generate-images.js
 * @description PROJECT ATHENA - IMAGE PROMPT GENERATOR v2.0
 * -------------------------------------
 * Doel: Scant alle data tabellen op image-velden (_url) en genereert AI prompts.
 * Input: ../input/[project]/tsv-data/*.tsv
 * Output: ../input/[project]/image-gen/image-prompts.tsv
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadEnv } from './env-loader.js';
import { generateWithAI } from './core/ai-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded
await loadEnv(path.join(__dirname, '../.env'));

// 1. Argumenten & Config
const [projectNameArg] = process.argv.slice(2);
if (!projectNameArg) {
    console.error("❌ Kritieke fout: Geen projectnaam opgegeven.");
    process.exit(1);
}

const projectName = projectNameArg.toLowerCase().replace(/\s+/g, '-');
const ROOT_DIR = path.resolve(__dirname, '..');
const PROJECT_DATA_DIR = path.join(ROOT_DIR, '../input', projectName);
const PARSER_RESULTS_DIR = path.join(PROJECT_DATA_DIR, 'tsv-data');
const IMAGE_GEN_DIR = path.join(PROJECT_DATA_DIR, 'image-gen');
const OUTPUT_FILE = path.join(IMAGE_GEN_DIR, 'image-prompts.tsv');

const modelAlias = process.env.AI_MODEL_IMAGE_DIRECTOR || process.env.AI_MODEL_DEFAULT || "gemini-flash-latest";

async function generatePrompts() {
    console.log(`🎨 Athena Image Generator v2.0 | Project: ${projectName}`);

    if (!fs.existsSync(PARSER_RESULTS_DIR)) {
        console.error(`❌ Parser resultaten niet gevonden: ${PARSER_RESULTS_DIR}`);
        process.exit(1);
    }

    // 2. Scan alle TSV bestanden op _url kolommen
    const files = fs.readdirSync(PARSER_RESULTS_DIR).filter(f => f.endsWith('.tsv'));
    const tasks = [];

    files.forEach(file => {
        const tableName = file.replace('.tsv', '');
        const content = fs.readFileSync(path.join(PARSER_RESULTS_DIR, file), 'utf8');
        const rows = content.split('\n').filter(r => r.trim() !== '');
        if (rows.length < 2) return;

        const headers = rows[0].split('\t');
        const urlCols = headers.reduce((acc, header, idx) => {
            const h = header.toLowerCase();
            if (h.endsWith('_url') || ['foto', 'afbeelding', 'image', 'picture', 'bg_img', 'foto_buiten', 'foto_binnen', 'foto_resultaat'].includes(h)) {
                acc.push({ name: header, index: idx });
            }
            return acc;
        }, []);

        if (urlCols.length === 0) return;

        // Bepaal de "ID/Label" kolom voor context (bijv. 'naam', 'product_naam', of eerste kolom)
        const idIdx = headers.findIndex(h => ['naam', 'product_naam', 'bedrijfsnaam', 'dienst_naam'].includes(h.toLowerCase())) || 0;
        const safeIdIdx = idIdx === -1 ? 0 : idIdx;

        rows.slice(1).forEach(row => {
            const cols = row.split('\t');
            const rowLabel = cols[safeIdIdx] || 'Onbekend item';
            
            urlCols.forEach(urlCol => {
                tasks.push({
                    source_table: tableName,
                    source_label: rowLabel,
                    target_field: urlCol.name,
                    full_context: row.replace(/\t/g, ' | ') // Alle data uit de rij als context
                });
            });
        });
    });

    if (tasks.length === 0) {
        console.log("ℹ️ Geen image-velden (_url) gevonden in de data. Generatie gestopt.");
        process.exit(0);
    }

    console.log(`⏳ Bezig met genereren van ${tasks.length} prompts...`);

    // 3. AI Aanroep
    const aiPrompt = `
    Je bent een Expert Art Director. Je taak is om voor elk item in de onderstaande lijst een perfecte IMAGE PROMPT te schrijven voor een AI image generator (zoals Midjourney of Imagen).

    INPUT LIJST:
    ${tasks.map((t, i) => `ID ${i}: [TABEL: ${t.source_table}] [Vak: ${t.target_field}] [Item: ${t.source_label}] Context: ${t.full_context}`).join('\n')}

    STIJL INSTRUCTIES:
    - Cinematic, High-End, Professional Photography.
    - Sfeer: Modern, Boutique, Warm Lighting, Dark/Elegant Backgrounds.
    - Geen mensen/gezichten tenzij strikt noodzakelijk (focus op handen/tools/resultaat).
    - Aspect Ratio: 4:3

    OUTPUT FORMAAT (JSON Array):
    [
      {
        "id": 0,
        "prompt": "...",
        "suggested_filename": "..."
      }
    ]
    Geef ALLEEN de JSON terug.
    `;

    try {
        const aiResponses = await generateWithAI(aiPrompt, { 
            modelStack: null, // Gebruik de volledige waterfall uit ai-models.json
            isJson: true 
        });

        if (!aiResponses || !Array.isArray(aiResponses)) {
            throw new Error("Ongeldige response van AI engine (geen array).");
        }

        // 4. Output schrijven
        if (!fs.existsSync(IMAGE_GEN_DIR)) fs.mkdirSync(IMAGE_GEN_DIR, { recursive: true });

        let tsvOutput = "Source_Table\tSource_Label\tTarget_Field\tAI_Prompt\tGenerated_Image_Url\tSuggested_Filename\n";

        aiResponses.forEach(res => {
            const task = tasks[res.id];
            if (task) {
                // Escaping tabs just in case
                const cleanPrompt = (res.prompt || "").replace(/\t/g, ' ');
                tsvOutput += `${task.source_table}\t${task.source_label}\t${task.target_field}\t${cleanPrompt}\t\t${res.suggested_filename || ''}\n`;
            }
        });

        fs.writeFileSync(OUTPUT_FILE, tsvOutput);
        console.log(`✅ Succes! Image prompts opgeslagen in: ${OUTPUT_FILE}`);
        process.exit(0);

    } catch (e) {
        console.error("❌ Fout bij AI generatie:", e.message);
        process.exit(1);
    }
}

await generatePrompts();
