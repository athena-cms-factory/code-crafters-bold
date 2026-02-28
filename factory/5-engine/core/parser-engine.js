/**
 * @file parser-engine.js
 * @description De herbruikbare engine voor het aanroepen van de AI-parser.
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { loadEnv } from '../env-loader.js';

import { generateWithAI } from './ai-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Ensure .env is loaded (if needed, ai-engine also does this)
await loadEnv(path.join(__dirname, '../../.env'));

/**
 * Voert het volledige parsing-proces uit.
 * @param {string} blueprintFile - De bestandsnaam van de blueprint (bv. 'bakkerij.json').
 * @param {string} customPrompt - De site-specifieke instructies voor de AI.
 */
export async function runParser(blueprintFile, customPrompt) {
  try {
    console.log('🚀 Parser engine gestart...');

    // 1. Argumenten lezen
    const [projectName, inputFile] = process.argv.slice(2);
    if (!projectName || !inputFile) {
      throw new Error('Projectnaam en input-bestandsnaam zijn verplicht.');
    }
    console.log(`   - Project: ${projectName}`);
    console.log(`   - Input: ${inputFile}`);

    // 2. Paden construeren
    const root = path.resolve(__dirname, '../..');
    const siteTypeName = blueprintFile.replace('.json', '');

    // Zoek de blueprint in autonomous of docked
    let blueprintPath = path.join(root, '3-sitetypes', siteTypeName, 'blueprint', blueprintFile);
    console.log(`   🔍 Zoeken naar blueprint op: ${blueprintPath}`);

    async function checkPath(p) {
      try {
        await fs.access(p);
        return true;
      } catch (e) {
        return false;
      }
    }

    if (!(await checkPath(blueprintPath))) {
      const dockedPath = path.join(root, '3-sitetypes', 'docked', siteTypeName, 'blueprint', blueprintFile);
      const autoPath = path.join(root, '3-sitetypes', 'autonomous', siteTypeName, 'blueprint', blueprintFile);

      if (await checkPath(dockedPath)) {
        blueprintPath = dockedPath;
      } else if (await checkPath(autoPath)) {
        blueprintPath = autoPath;
      } else {
        throw new Error(`Blueprint niet gevonden voor ${siteTypeName} in 3-sitetypes, autonomous of docked.`);
      }
    }

    const inputPath = path.join(root, '../input', projectName, 'input', inputFile);

    console.log('   - Blueprint pad:', blueprintPath);
    console.log('   - Input pad:', inputPath);

    // 3. Bestanden inlezen
    const blueprint = JSON.parse(await fs.readFile(blueprintPath, 'utf8'));
    const inputText = await fs.readFile(inputPath, 'utf8');

    // --- NIEUW: INPUT VALIDATIE ---
    if (!inputText || inputText.length < 50) {
      console.warn("\n⚠️  WAARSCHUWING: De input-tekst is erg kort (< 50 tekens).");
      console.warn("    De AI heeft mogelijk te weinig context om iets zinnigs te genereren.");
      console.warn("    Controleer: " + inputPath);
    }

    console.log(`   - Blueprint "${blueprint.blueprint_name}" succesvol geladen.`);
    console.log('   - Input-tekst succesvol geladen.');

    // 4. Prompt samenstellen
    const fullPrompt = `
      Je bent een expert in data-extractie en database-architectuur. 
      Je taak is om de onderstaande INPUT-TEKST te analyseren en de relevante informatie te mappen naar de gevraagde JSON-structuur.

      **STRIKTE RICHTLIJNEN VOOR DATA FORMATTING:**
      1. **Taal & Naming:** Gebruik ALTIJD de Nederlandse benamingen voor standaardvelden die in de blueprint staan. Gebruik 'titel' (nooit 'title'), 'tekst' (nooit 'text' of 'description') en 'afbeelding' (nooit 'image').
      2. **Getallen/Prijzen:** Gebruik ENKEL getallen (bv. 19.50). Voeg GEEN valutasymbolen (€, $, etc.) toe. Gebruik een punt als decimaal scheidingsteken.
      2. **Tekst:** Houd teksten beknopt en zakelijk, tenzij de instructies anders aangeven.
      3. **Lege Velden:** Als informatie ontbreekt, gebruik dan een lege string "" of null. Verzin GEEN data.
      4. **Booleans:** Gebruik "true" of "false" voor ja/nee velden.
      5. **Datum:** Gebruik het formaat JJJJ-MM-DD.
      6. **Links/URLs:** In de inputtekst staan links gemarkeerd als [LINK: https://example.com] Tekst [/LINK]. Gebruik de URL uit deze marker om velden zoals 'url', 'link' of 'knop_url' te vullen. Verwijder de marker zelf uit de gewone tekstvelden (houd enkel de tekst tussen de markers over).

      **JSON STRUCTUUR RICHTLIJNEN:**
      1. Geef ENKEL de rauwe JSON terug (GEEN markdown, GEEN uitleg vooraf of achteraf).
      2. De root van de JSON moet een object zijn.
      3. Elke key in de root moet een 'table_name' uit de blueprint zijn.
      4. Elke waarde moet een ARRAY van objecten zijn, zelfs bij één item.
      5. Gebruik exact de kolomnamen uit de blueprint (case-sensitive).

      **DATA BLUEPRINT:**
      ${JSON.stringify(blueprint.data_structure, null, 2)}

      **SPECIFIEKE INSTRUCTIES VOOR DEZE SITE:**
      ${customPrompt}

      **INPUT-TEKST:**
      ---
      ${inputText}
      ---
    `;

    console.log('   - Prompt voor AI succesvol samengesteld.');

    // 5. AI aanroepen via de centrale AI Engine
    console.log('🤖 AI wordt aangeroepen (met Waterfall support)...');

    let parsedData = await generateWithAI(fullPrompt, {
      isJson: true,
      modelStack: process.env.AI_MODEL_PARSER
    });

    // FALLBACK: Als de specifieke stack uit .env faalt, probeer de volledige centrale waterfall
    if (!parsedData) {
      console.warn('   - ⚠️ Specifieke modelStack uit .env faalde. Schakel over naar VOLLEDIGE CENTRALE WATERFALL...');
      parsedData = await generateWithAI(fullPrompt, {
        isJson: true,
        modelStack: null // Dit triggert de volledige lijst in ai-engine.js
      });
    }

    if (!parsedData) {
      throw new Error("❌ AI parsing mislukt: Alle modellen (specifiek + waterfall) hebben gefaald of geen geldige JSON geretourneerd.");
    }

    console.log(`   - ✅ AI response succesvol ontvangen en geparsed.`);

    // 6. Validatie en opslaan (JSON & TSV)
    console.log('🔄 Data valideren en opslaan...');
    const jsonOutputDir = path.join(root, '../input', projectName, 'json-data');
    const tsvOutputDir = path.join(root, '../input', projectName, 'tsv-data');

    // Mappen aanmaken
    await fs.mkdir(jsonOutputDir, { recursive: true });
    await fs.mkdir(tsvOutputDir, { recursive: true });

    // Sloop oude data om vervuiling te voorkomen
    const cleanDir = async (dir) => {
      try {
        const files = await fs.readdir(dir);
        for (const file of files) await fs.unlink(path.join(dir, file));
      } catch (e) { }
    };
    await cleanDir(jsonOutputDir);
    await cleanDir(tsvOutputDir);
    console.log('   - 🧹 Oude data verwijderd.');

    for (const table of blueprint.data_structure) {
      const tableName = table.table_name;

      // FUZZY MATCHING
      let tableData = parsedData[tableName];
      if (!tableData) {
        const fuzzyKey = Object.keys(parsedData).find(k =>
          tableName.toLowerCase().includes(k.toLowerCase()) ||
          k.toLowerCase().includes(tableName.toLowerCase().split('_')[0])
        );
        if (fuzzyKey) {
          console.log(`   - ℹ️ Fuzzy match: AI gebruikte '${fuzzyKey}' voor blueprint tabel '${tableName}'`);
          tableData = parsedData[fuzzyKey];
        }
      }

      tableData = tableData || [];

      // 6a. OPSLAAN ALS JSON (Primair voor de site)
      const jsonPath = path.join(jsonOutputDir, `${tableName}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(tableData, null, 2), 'utf8');
      console.log(`   - ✅ JSON opgeslagen: ${tableName}.json`);

      // 6b. OPSLAAN ALS TSV (Secundair voor Google Sheets)
      const header = table.columns.map(col => typeof col === 'object' ? col.name : col).join('\t') + '\n';
      const rows = tableData.map(row => {
        return table.columns.map(col => {
          const colName = typeof col === 'object' ? col.name : col;
          let value = row[colName];
          if (value === null || value === undefined) value = '';
          return String(value).replace(/\t/g, ' ').replace(/\r?\n|\r/g, ' ').trim();
        }).join('\t');
      }).join('\n');

      const tsvContent = header + rows;
      await fs.writeFile(path.join(tsvOutputDir, `${tableName}.tsv`), tsvContent, 'utf8');
    }

    console.log('✨ Parsing en opslag voltooid!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Fout in de parser engine:', error.message);
    process.exit(1);
  }
}
