/**
 * @file media-mapper.js
 * @description Web-based tool voor het visueel koppelen van media aan data.
 */

import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..'); // factory/

// Laad .env expliciet vanuit de factory map
dotenv.config({ path: path.resolve(root, '.env') });

import express from 'express';
import fs from 'fs';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { generateWithAI } from './core/ai-engine.js';

let activeProject = null;

// --- CLI OVERRIDE ---
const args = process.argv.slice(2);
if (args[0]) {
    activeProject = args[0];
    console.log(`🎯 Initial site set from CLI: ${activeProject}`);
}

const app = express();
const port = process.env.MEDIA_MAPPER_PORT || 4004;

// --- CORS & BODY PARSING ---
app.use(express.json());
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, X-Filename');
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
});

// Serveer images dynamisch uit de sites map
app.use('/images', express.static(path.resolve(root, '../sites')));

// --- EDITOR ENDPOINTS (Drag-and-Drop) ---

/**
 * Endpoint voor het uploaden van een bestand vanuit de Live Editor
 */
app.post('/__athena/upload', express.raw({ type: 'image/*', limit: '10mb' }), async (req, res) => {
    try {
        const filename = req.headers['x-filename'];
        const projectName = req.query.project || activeProject; // Fallback op activeProject

        if (!projectName) throw new Error("Geen projectnaam bekend.");
        if (!filename) throw new Error("Geen bestandsnaam meegegeven.");

        const targetDir = path.resolve(root, '../sites', projectName, 'public/images');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        const filePath = path.join(targetDir, filename);
        fs.writeFileSync(filePath, req.body);

        console.log(`📸 [UPLOAD] ${filename} -> ../sites/${projectName}/public/images`);
        res.json({ success: true, filename });
    } catch (e) {
        console.error("Upload error:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

/**
 * Endpoint voor het bijwerken van de JSON data vanuit de Live Editor
 */
app.post('/__athena/update-json', async (req, res) => {
    try {
        const { projectName, file, index, key, value } = req.body;
        const safeProject = projectName || activeProject;

        if (!safeProject) throw new Error("Project niet gevonden.");

        const dataPath = path.resolve(root, '../sites', safeProject, 'src', 'data', `${file}.json`);
        if (!fs.existsSync(dataPath)) throw new Error(`Data bestand niet gevonden: ${file}.json`);

        const raw = fs.readFileSync(dataPath, 'utf8');
        let data = JSON.parse(raw);
        const isArray = Array.isArray(data);

        // Update de waarde (index kan ook 'all' of specifiek nummer zijn)
        if (isArray) {
            if (data[index]) {
                data[index][key] = value;
            } else {
                // Fallback: zoek op absoluteIndex of id als die er zijn
                data[0][key] = value;
            }
        } else {
            data[key] = value;
        }

        fs.writeFileSync(dataPath, JSON.stringify(data, null, 2));
        console.log(`💾 [DATA] Update ${file}.json [${index}].${key} = ${value}`);
        res.json({ success: true });
    } catch (e) {
        console.error("Data update error:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Serveer de UI
app.get('/', (req, res) => {
    const htmlPath = path.join(__dirname, 'ui/media-editor.html');
    if (fs.existsSync(htmlPath)) {
        res.sendFile(htmlPath);
    } else {
        res.send('<h1>Media Editor UI niet gevonden.</h1>');
    }
});

// API: Lijst van Sites
app.get('/api/sites', (req, res) => {
    const sitesDir = path.resolve(root, '../sites');
    if (!fs.existsSync(sitesDir)) return res.json([]);
    const sites = fs.readdirSync(sitesDir).filter(f => fs.statSync(path.join(sitesDir, f)).isDirectory());
    res.json(sites);
});

// API: Set Active Site
app.post('/api/set-site', (req, res) => {
    const { site } = req.body;
    const siteDir = path.resolve(root, '../sites', site);
    if (fs.existsSync(siteDir)) {
        activeProject = site;
        console.log(`✅ Media Mapper actief voor: ${site}`);
        res.json({ success: true });
    } else {
        res.status(404).json({ error: "Site niet gevonden" });
    }
});

// Middleware voor dynamische image serving (vervangt de app.use in /api/set-site)
app.get('/:project/images/:filename', (req, res, next) => {
    const { project, filename } = req.params;
    const filePath = path.resolve(root, '../sites', project, 'public/images', filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        next();
    }
});

// API: Get Data & Images
app.get('/api/data', (req, res) => {
    if (!activeProject) return res.status(400).json({ error: "Geen site geselecteerd" });

    const siteDir = path.resolve(root, '../sites', activeProject);
    const dataDir = path.join(siteDir, 'src/data');
    const imagesDir = path.join(siteDir, 'public/images');

    // 1. Haal afbeeldingen op
    let images = [];
    if (fs.existsSync(imagesDir)) {
        images = fs.readdirSync(imagesDir).filter(f => /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(f));
    }

    // Helper recursive function to find all JSON files
    function getAllJsonFiles(dir, fileList = []) {
        if (!fs.existsSync(dir)) return fileList;
        const files = fs.readdirSync(dir);
        for (const file of files) {
            const stat = fs.statSync(path.join(dir, file));
            if (stat.isDirectory()) {
                getAllJsonFiles(path.join(dir, file), fileList);
            } else if (file.endsWith('.json') && file !== 'schema.json') {
                fileList.push(path.join(dir, file));
            }
        }
        return fileList;
    }

    // 2. Haal data op (MPA-compatible via recursief zoeken)
    let tables = {};
    if (fs.existsSync(dataDir)) {
        const jsonFiles = getAllJsonFiles(dataDir);
        for (const filePath of jsonFiles) {
            try {
                // Table name becomes relative path from src/data without .json 
                // bijv: pages/home, over-ons, etc.
                const relativePath = path.relative(dataDir, filePath);
                const tableName = relativePath.replace(/\\/g, '/').replace('.json', '');

                const raw = fs.readFileSync(filePath, 'utf8');
                let parsed = JSON.parse(raw);

                // Detect MPA Page Structure vs Flat Array
                if (parsed.content && Array.isArray(parsed.content.sections)) {
                    // This is an MPA JSON (e.g. pages/home.json)
                    parsed.content.sections.forEach((sec, idx) => {
                        const secType = sec.type || 'section';
                        const secData = sec.content || {};
                        let rows = secData.items ? secData.items : [secData];

                        // Inject virtual fields so Media Mapper frontend knows this has images
                        if (['hero', 'features', 'cards', 'highlights', 'text_block', 'list'].includes(secType.toLowerCase())) {
                            rows = rows.map(r => {
                                let merged = typeof r === 'string' ? { titel: r } : { ...r };
                                if (!('afbeelding' in merged) && !('image' in merged)) {
                                    merged.afbeelding = "";
                                }
                                return merged;
                            });
                        }

                        // the internal table name will tell /api/update where to find it
                        // Formaat: filename::sectieIndex_sectieType
                        const subTableName = `${tableName}::${idx}_${secType}`;

                        // Pass along the rows to the UI
                        tables[subTableName] = rows;
                    });
                } else {
                    // Traditional Flat Array (e.g. settings.json or old format)
                    if (!Array.isArray(parsed)) parsed = [parsed];
                    tables[tableName] = parsed;
                }
            } catch (e) {
                console.error(`Media Mapper: kon ${filePath} niet parsen.`);
            }
        }
    }

    // 3. Haal beschikbare modellen op uit .env
    const models = (process.env.AI_MODEL_IMAGE_GENERATOR || "gemini-2.0-flash")
        .split(',')
        .map(m => m.trim())
        .filter(m => m);

    res.json({ project: activeProject, images, tables, models });
});

// API: Update Data
app.post('/api/update', (req, res) => {
    if (!activeProject) return res.status(400).json({ error: "Geen site geselecteerd" });
    const { table, rowIndex, key, value } = req.body;

    const [realTable, sectionInfo] = table.split('::');
    const filePath = path.resolve(root, '../sites', activeProject, 'src/data', `${realTable}.json`);

    try {
        const raw = fs.readFileSync(filePath, 'utf8');
        let data = JSON.parse(raw);

        if (sectionInfo) {
            // het is een specifieke MPA sectie update
            const secIdxStr = sectionInfo.split('_')[0];
            const secIdx = parseInt(secIdxStr, 10);
            const secContent = data.content.sections[secIdx].content;

            if (secContent.items && Array.isArray(secContent.items)) {
                let targetRow = secContent.items[rowIndex];
                if (typeof targetRow === 'string') {
                    // Zet om naar object als het enkel een string was
                    targetRow = { titel: targetRow };
                    secContent.items[rowIndex] = targetRow;
                }
                targetRow[key] = value;
            } else {
                secContent[key] = value;
            }

            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            res.json({ success: true });
        } else {
            // Klassieke tabel array update
            const wasArray = Array.isArray(data);
            if (!wasArray) data = [data];

            if (data[rowIndex]) {
                data[rowIndex][key] = value;

                const contentToWrite = wasArray ? data : data[0];
                fs.writeFileSync(filePath, JSON.stringify(contentToWrite, null, 2));
                res.json({ success: true });
            } else {
                res.status(404).json({ error: "Rij niet gevonden" });
            }
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// API: Upload afbeeldingen naar bibliotheek
app.post('/api/upload-image', express.raw({ type: 'image/*', limit: '10mb' }), async (req, res) => {
    try {
        if (!activeProject) throw new Error("Geen site geselecteerd.");
        const filename = req.headers['x-filename'];
        if (!filename) throw new Error("Geen bestandsnaam meegegeven.");
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            throw new Error("Ongeldige bestandsnaam.");
        }

        const targetDir = path.resolve(root, '../sites', activeProject, 'public/images');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        fs.writeFileSync(path.join(targetDir, filename), req.body);
        console.log(`📸 [UPLOAD] ${filename} -> ../sites/${activeProject}/public/images`);
        res.json({ success: true, filename });
    } catch (e) {
        console.error("Upload error:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Verwijder afbeelding uit bibliotheek
app.post('/api/delete-image', async (req, res) => {
    try {
        if (!activeProject) throw new Error("Geen site geselecteerd.");
        const { filename } = req.body;
        if (!filename) throw new Error("Geen bestandsnaam meegegeven.");
        if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
            throw new Error("Ongeldige bestandsnaam.");
        }

        const filePath = path.resolve(root, '../sites', activeProject, 'public/images', filename);
        if (!fs.existsSync(filePath)) throw new Error("Bestand niet gevonden.");

        fs.unlinkSync(filePath);
        console.log(`🗑️ [DELETE] ${filename} verwijderd uit ../sites/${activeProject}/public/images`);
        res.json({ success: true });
    } catch (e) {
        console.error("Delete error:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: Stock foto zoeken & downloaden (Pexels of Unsplash API)
app.post('/api/unsplash-fetch', async (req, res) => {
    try {
        if (!activeProject) throw new Error("Geen site geselecteerd.");
        const { query, filename } = req.body;
        if (!query) throw new Error("Geen zoekterm meegegeven.");

        const safeName = (filename || `${query.replace(/\s+/g, '-')}-${Date.now()}.jpg`).replace(/[^a-zA-Z0-9._-]/g, '');
        if (safeName.includes('..') || safeName.includes('/') || safeName.includes('\\')) {
            throw new Error("Ongeldige bestandsnaam.");
        }

        const targetDir = path.resolve(root, '../sites', activeProject, 'public/images');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        let imageUrl = null;
        let credit = null;

        // Strategie 1: Pexels API (gratis, 200 req/uur)
        if (process.env.PEXELS_API_KEY) {
            console.log(`🔍 [PEXELS] Zoeken: "${query}"`);
            const searchRes = await fetch(`https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&orientation=landscape&per_page=1`, {
                headers: { 'Authorization': process.env.PEXELS_API_KEY }
            });
            if (searchRes.ok) {
                const data = await searchRes.json();
                const photo = data.photos?.[0];
                if (photo) {
                    imageUrl = photo.src?.large2x || photo.src?.large || photo.src?.original;
                    credit = photo.photographer;
                }
            }
        }

        // Strategie 2: Unsplash API (gratis, 50 req/uur)
        if (!imageUrl && process.env.UNSPLASH_ACCESS_KEY) {
            console.log(`🔍 [UNSPLASH] Zoeken: "${query}"`);
            const searchRes = await fetch(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(query)}&orientation=landscape`, {
                headers: { 'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` }
            });
            if (searchRes.ok) {
                const photo = await searchRes.json();
                imageUrl = photo.urls?.regular;
                credit = photo.user?.name;
            }
        }

        if (!imageUrl) {
            return res.status(400).json({
                success: false,
                error: "Geen foto-API geconfigureerd.",
                hint: [
                    "Je hebt een gratis API key nodig:",
                    "",
                    "Pexels (aanbevolen) — 200 req/uur",
                    "→ https://www.pexels.com/api/",
                    "",
                    "Unsplash — 50 req/uur",
                    "→ https://unsplash.com/developers",
                    "",
                    "Voeg toe aan factory/.env:",
                    "PEXELS_API_KEY=jouw_key_hier",
                    "UNSPLASH_ACCESS_KEY=jouw_key_hier"
                ]
            });
        }

        // Download de afbeelding
        console.log(`📥 [STOCK] Downloaden: ${imageUrl.substring(0, 80)}...`);
        const imgRes = await fetch(imageUrl);
        if (!imgRes.ok) throw new Error(`Download HTTP ${imgRes.status}`);

        const buffer = Buffer.from(await imgRes.arrayBuffer());
        fs.writeFileSync(path.join(targetDir, safeName), buffer);

        console.log(`📸 [STOCK] ${safeName} opgeslagen (${(buffer.length / 1024).toFixed(0)} KB${credit ? `, foto: ${credit}` : ''})`);
        res.json({ success: true, filename: safeName, credit });
    } catch (e) {
        console.error("Stock foto error:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: AI cinematische prompt genereren
app.post('/api/generate-prompt', async (req, res) => {
    try {
        const { description } = req.body;
        if (!description) throw new Error("Geen beschrijving meegegeven.");

        console.log(`🎨 [AI-PROMPT] Genereren voor: "${description}"`);

        const aiPrompt = `
Je bent een Expert Art Director. Schrijf EEN perfecte IMAGE PROMPT voor een AI image generator.

CONTEXT: ${description}

STIJL INSTRUCTIES:
- Cinematic, High-End, Professional Photography.
- Sfeer: Modern, Boutique, Warm Lighting, Dark/Elegant Backgrounds.
- Geen mensen/gezichten tenzij strikt noodzakelijk (focus op handen/tools/resultaat).
- Aspect Ratio: 4:3
- Wees specifiek over compositie, belichting, kleurenpalet en texturen.

Geef ALLEEN de prompt terug als platte tekst, geen JSON, geen uitleg.`;

        const result = await generateWithAI(aiPrompt, { isJson: false });
        if (!result) throw new Error("AI kon geen prompt genereren.");

        console.log(`✅ [AI-PROMPT] Prompt gegenereerd (${result.length} chars)`);
        res.json({ success: true, prompt: result });
    } catch (e) {
        console.error("Prompt generation error:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// API: AI afbeelding genereren
app.post('/api/generate-image', async (req, res) => {
    let resultSent = false;
    try {
        if (!activeProject) throw new Error("Geen site geselecteerd.");
        const { prompt, filename, provider } = req.body;
        if (!prompt) throw new Error("Geen prompt meegegeven.");

        const safeName = (filename || `ai-generated-${Date.now()}.png`).replace(/[^a-zA-Z0-9._-]/g, '');
        const targetDir = path.resolve(root, '../sites', activeProject, 'public/images');
        if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir, { recursive: true });

        // Modellenlijst uit .env halen
        const modelList = (process.env.AI_MODEL_IMAGE_GENERATOR || "gemini-2.0-flash")
            .split(',')
            .map(m => m.trim())
            .filter(m => m);

        console.log(`🖼️ [AI-IMAGE] Start generatie-proces voor: "${prompt.substring(0, 50)}..."`);

        // STAP 1: Probeer Gemini (indien waterfall of specifiek model gekozen)
        let modelsToTry = [];
        if (provider === 'waterfall' || !provider) {
            modelsToTry = modelList;
        } else if (provider.startsWith('gemini:')) {
            modelsToTry = [provider.replace('gemini:', '')];
        }

        if (modelsToTry.length > 0) {
            const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
            if (apiKey) {
                const genAI = new GoogleGenerativeAI(apiKey);
                for (const modelName of modelsToTry) {
                    try {
                        const cleanModelName = modelName.replace(/^google\//, '').split(':')[0].trim();
                        console.log(`🤖 [AI-IMAGE] Poging met Gemini: "${cleanModelName}" (Key found)`);
                        const model = genAI.getGenerativeModel({ model: cleanModelName, generationConfig: { responseModalities: ["IMAGE", "TEXT"] } });
                        const result = await model.generateContent(prompt);
                        const candidates = result.response?.candidates || [];
                        let imagePart = null;
                        for (const cand of candidates) {
                            const parts = cand.content?.parts || [];
                            imagePart = parts.find(p => p.inlineData && p.inlineData.mimeType?.startsWith('image/'));
                            if (imagePart) break;
                        }
                        if (imagePart) {
                            const imageBuffer = Buffer.from(imagePart.inlineData.data, 'base64');
                            fs.writeFileSync(path.join(targetDir, safeName), imageBuffer);
                            console.log(`✅ [GEMINI] Succes met ${cleanModelName}`);
                            resultSent = true;
                            return res.json({ success: true, filename: safeName, provider: `gemini (${cleanModelName})` });
                        } else {
                            console.warn(`⚠️ [GEMINI] Model ${cleanModelName} gaf geen afbeelding terug (mogelijk alleen tekst).`);
                        }
                    } catch (err) {
                        console.warn(`⚠️ [AI-IMAGE] Gemini model ${modelName} gefaald:`, err.message);
                        if (err.message.includes("modalities")) {
                            console.log("💡 Tip: Dit model ondersteunt waarschijnlijk geen beeldgeneratie.");
                        }
                    }
                }
            }
        }

        // STAP 2: Probeer Pollinations.ai (als Gemini faalde of als Pollinations expliciet gekozen werd)
        // We proberen dit ook als waterfall aan staat
        if (!resultSent && (provider === 'pollinations' || provider === 'waterfall' || !provider || provider.startsWith('gemini:'))) {
            console.log(`🎨 [AI-IMAGE] Gebruik Pollinations (met retry)...`);
            for (let attempt = 1; attempt <= 2; attempt++) {
                try {
                    const encodedPrompt = encodeURIComponent(prompt + (attempt > 1 ? ` seed:${Math.random()}` : ''));
                    const pollUrl = `https://image.pollinations.ai/prompt/${encodedPrompt}?width=1024&height=768&nologo=true&seed=${Math.floor(Math.random() * 1000000)}`;
                    const response = await fetch(pollUrl);
                    if (response.ok) {
                        const buffer = Buffer.from(await response.arrayBuffer());
                        if (buffer.length > 1000) {
                            fs.writeFileSync(path.join(targetDir, safeName), buffer);
                            console.log(`✅ [POLLINATIONS] Succes bij poging ${attempt}.`);
                            resultSent = true;
                            return res.json({ success: true, filename: safeName, provider: 'pollinations' });
                        }
                    }
                } catch (pollError) {
                    console.warn(`⚠️ [POLLINATIONS] Poging ${attempt} mislukt:`, pollError.message);
                }
            }
        }

        // STAP 3: ULTIEME NOOD-FALLBACK (Altijd uitvoeren als we nog geen resultaat hebben)
        if (!resultSent) {
            console.log(`🚨 [AI-IMAGE] Gebruik nood-placeholder.`);
            const placeholderUrl = `https://loremflickr.com/1024/768/hair,salon,interior?lock=${Math.floor(Math.random() * 1000)}`;
            const response = await fetch(placeholderUrl);
            const buffer = Buffer.from(await response.arrayBuffer());
            fs.writeFileSync(path.join(targetDir, safeName), buffer);
            resultSent = true;
            return res.json({
                success: true,
                filename: safeName,
                provider: 'fallback-placeholder',
                notice: "AI diensten waren onbereikbaar. Dit is een tijdelijke placeholder."
            });
        }

    } catch (e) {
        console.error("❌ [AI-IMAGE] FATAL ERROR:", e.message);
        if (!resultSent) {
            res.status(500).json({ success: false, error: e.message });
        }
    }
});

app.listen(port, () => {
    console.log(`\n📸 Visual Media Mapper running on http://localhost:${port}`);
});
