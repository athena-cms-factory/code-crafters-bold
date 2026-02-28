import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateWithAI } from './core/ai-engine.js';
import * as cheerio from 'cheerio';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');
const INPUT_SITES_DIR = path.resolve(ROOT_DIR, 'inputsites');
const SITETYPES_DIR = path.resolve(ROOT_DIR, 'factory/3-sitetypes/docked');
const INPUT_DATA_DIR = path.resolve(ROOT_DIR, 'input');

/**
 * Athenafier Engine
 * Converts external sites (prototypes) into Athena Sitetypes & Data.
 */

async function main() {
    const args = process.argv.slice(2);
    const targetSite = args[0];

    if (!targetSite) {
        console.log("Usage: node athenafier.js [site-name]");
        listSites();
        return;
    }

    const sitePath = path.join(INPUT_SITES_DIR, targetSite);
    if (!fs.existsSync(sitePath)) {
        console.error(`Error: Site '${targetSite}' not found in inputsites/`);
        return;
    }

    console.log(`\n🚀 Athena-fying: ${targetSite}...`);
    
    // 1. Analyze the site structure
    await analyzeSite(targetSite, sitePath);

    console.log("\n✅ Athena-fication complete!");
    process.exit(0);
}

function listSites() {
    const sites = fs.readdirSync(INPUT_SITES_DIR).filter(f => 
        fs.statSync(path.join(INPUT_SITES_DIR, f)).isDirectory()
    );
    console.log("\nAvailable sites in inputsites/:");
    sites.forEach(s => console.log(` - ${s}`));
}

async function analyzeSite(name, sitePath) {
    const indexPath = path.join(sitePath, 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error(`❌ No index.html found in ${sitePath}`);
        return;
    }

    const html = fs.readFileSync(indexPath, 'utf8');
    console.log("🧠 Analyzing HTML structure with AI...");

    const prompt = `
    You are an expert Athena CMS architect. 
    Analyze the provided HTML of a prototype website and identify the logical sections.
    For each section, extract:
    1. Table Name (e.g., 'hero', 'services', 'about_us') - lowercase, snake_case.
    2. Fields (e.g., 'title', 'subtitle', 'image', 'text') - the data keys needed to fill this section.
    3. Type: 'single' (for hero/about) or 'list' (for services/testimonials/features).

    Also, generate a suggested 'blueprint.json' structure that Athena can use.
    
    HTML CONTENT:
    ${html.substring(0, 10000)} // Truncate if too long
    
    RESPONSE FORMAT (JSON ONLY):
    {
        "project_name": "${name}",
        "sections": [
            { "table": "hero", "type": "single", "fields": ["title", "subtitle", "button_text"] },
            ...
        ],
        "blueprint": {
            "hero": ["title", "subtitle", "button_text"],
            "features": ["title", "text", "icon"],
            ...
        }
    }
    `;

    try {
        const result = await generateWithAI(prompt, { isJson: true });
        
        if (!result) {
            console.error("❌ AI failed to analyze site.");
            return;
        }

        console.log("✅ Analysis complete.");
        console.log("Detected Sections:", result.sections.map(s => s.table).join(', '));

        // 2. Create Sitetype
        createSitetype(name, result.blueprint);

        // 3. Create Input Data folder & initial JSONs
        await createInputData(name, result.sections, html);

        // 4. Perform "Quick Wrap" - Inject Tags into HTML
        await performQuickWrap(name, result.sections, html, sitePath);

    } catch (e) {
        console.error("❌ Error during analysis:", e.message);
    }
}

async function performQuickWrap(name, sections, html, sitePath) {
    console.log("⚓ Performing Quick Wrap (Injecting Athena Dock tags)...");

    const prompt = `
    You are an Athena CMS developer. Your task is to provide a list of transformations to inject 'data-dock' attributes into a prototype HTML.
    
    For each major section and each editable element (h1, h2, h3, p, img, button), provide:
    1. A CSS selector that uniquely identifies the element.
    2. The attribute name to add (data-dock-section or data-dock-bind).
    3. The attribute value (e.g., "hero" or '{"file":"hero", "index":0, "key":"title"}').

    SECTIONS & FIELDS:
    ${JSON.stringify(sections, null, 2)}

    HTML SNIPPET FOR CONTEXT:
    ${html.substring(0, 15000)}

    RESPONSE FORMAT (JSON ONLY):
    {
        "transformations": [
            { "selector": "header", "attr": "data-dock-section", "value": "hero" },
            { "selector": "header h1", "attr": "data-dock-bind", "value": "{\\"file\\":\\"hero\\", \\"index\\":0, \\"key\\":\\"title\\"}" },
            ...
        ]
    }
    `;

    try {
        const result = await generateWithAI(prompt, { isJson: true });
        if (result && result.transformations) {
            console.log(`🧠 AI suggested ${result.transformations.length} transformations.`);
            
            // For now, we simulate the injection for the POC or use a simple replacement
            // In a real scenario, we'd use a DOM library like JSDOM here.
            // Since we want to keep it light for 4GB RAM, we'll do a basic implementation later
            // or save the transformation map for reference.
            
            const mapPath = path.join(sitePath, 'dock-map.json');
            fs.writeFileSync(mapPath, JSON.stringify(result.transformations, null, 4));
            console.log(`📍 Transformation map saved to ${mapPath}`);
            
            // Apply transformations automatically
            applyDockMap(sitePath, result.transformations);
        }
    } catch (e) {
        console.error("❌ Error during Quick Wrap:", e.message);
    }
}

function applyDockMap(sitePath, transformations) {
    const indexPath = path.join(sitePath, 'index.html');
    const outputPath = path.join(sitePath, 'index.docked.html');
    
    if (!fs.existsSync(indexPath)) return;

    console.log("🛠️  Applying transformations to HTML...");
    const html = fs.readFileSync(indexPath, 'utf8');
    const $ = cheerio.load(html);

    transformations.forEach(({ selector, attr, value }) => {
        try {
            const elements = $(selector);
            if (elements.length > 0) {
                elements.attr(attr, value);
                // console.log(`   ✅ Applied ${attr} to '${selector}'`);
            } else {
                // console.warn(`   ⚠️  Selector not found: '${selector}'`);
            }
        } catch (e) {
            console.error(`   ❌ Error applying transformation to '${selector}':`, e.message);
        }
    });

    fs.writeFileSync(outputPath, $.html());
    console.log(`✨ Athena-fied HTML generated: ${outputPath}`);
}

function createSitetype(name, blueprint) {
    const sitetypePath = path.join(SITETYPES_DIR, name);
    
    // 1. Create blueprint folder and file
    const blueprintDir = path.join(sitetypePath, 'blueprint');
    if (!fs.existsSync(blueprintDir)) fs.mkdirSync(blueprintDir, { recursive: true });
    fs.writeFileSync(path.join(blueprintDir, `${name}.json`), JSON.stringify({
        blueprint_name: name,
        track: "docked",
        data_structure: Object.entries(blueprint).map(([table, fields]) => ({
            table_name: table,
            columns: fields.map(f => ({ name: f, description: `Auto-generated field: ${f}` }))
        }))
    }, null, 4));

    // 2. Create parser folder and prompt
    const parserDir = path.join(sitetypePath, 'parser');
    if (!fs.existsSync(parserDir)) fs.mkdirSync(parserDir, { recursive: true });
    const parserPrompt = `
    You are an AI parser for the Athena CMS. 
    Map unstructured text to this blueprint: ${name}
    Tables: ${Object.keys(blueprint).join(', ')}
    `;
    fs.writeFileSync(path.join(parserDir, 'parser-prompt.md'), parserPrompt.trim());

    // 3. Create web/standard folder structure
    const webStandardDir = path.join(sitetypePath, 'web', 'standard');
    if (!fs.existsSync(webStandardDir)) {
        fs.mkdirSync(webStandardDir, { recursive: true });
        fs.mkdirSync(path.join(webStandardDir, 'components'), { recursive: true });
    }

    console.log(`📁 Sitetype created: factory/3-sitetypes/docked/${name} (blueprint/, parser/, web/standard/)`);
}

async function createInputData(name, sections, html) {
    const projectInputPath = path.join(INPUT_DATA_DIR, name);
    const jsonDataPath = path.join(projectInputPath, 'json-data');

    if (!fs.existsSync(jsonDataPath)) {
        fs.mkdirSync(jsonDataPath, { recursive: true });
    }

    console.log("✍️ Extracting initial data from HTML...");
    
    // We use AI again to extract the actual content into JSON files
    const extractPrompt = `
    Based on the following HTML and section definitions, extract the actual content into JSON format.
    Return a map where keys are table names and values are arrays of objects (even for 'single' type, use an array with one object).

    SECTIONS: ${JSON.stringify(sections)}
    
    HTML:
    ${html.substring(0, 10000)}

    RESPONSE FORMAT (JSON ONLY):
    {
        "hero": [{ "title": "...", "subtitle": "...", "button_text": "..." }],
        "features": [ { "title": "...", "text": "...", "icon": "..." }, ... ]
    }
    `;

    const data = await generateWithAI(extractPrompt, { isJson: true });

    if (data) {
        for (const [table, content] of Object.entries(data)) {
            fs.writeFileSync(path.join(jsonDataPath, `${table}.json`), JSON.stringify(content, null, 4));
        }
        console.log(`📊 Initial data saved to input/${name}/json-data/`);
    }
}

main();
