import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createProject } from '../5-engine/core/factory.js';
import { loadEnv } from '../5-engine/env-loader.js';
import { 
    generateDataStructureAPI, 
    generateDesignSuggestionAPI, 
    generateCompleteSiteType 
} from './dashboard/sitetype-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- CONFIGURATIE ---
const NICHES = [
    { id: 'kaasmakerij', niche: 'Artisanale Kaasmakerij', model: 'SPA' },
    { id: 'architect', niche: 'High-end Architectenbureau (Modern & Minimalistisch)', model: 'SPA' },
    { id: 'hondenpension', niche: 'Hondenpension en Gedragstraining (Vrolijk & Duidelijk)', model: 'SPA' },
    { id: 'it-consulting', niche: 'IT Consulting & Cybersecurity (Technisch & Betrouwbaar)', model: 'SPA' },
    { id: 'yoga-studio', niche: 'Yoga & Mindfulness Studio (Rustgevend & Zen)', model: 'SPA' },
    { id: 'bed-and-breakfast', niche: 'Luxe B&B in de Ardennen (Warm & Gastvrij)', model: 'SPA' },
    { id: 'tuinarchitect', niche: 'Biologische Tuinarchitect (Natuurlijk & Groen)', model: 'SPA' },
    { id: 'advocatuur', niche: 'Fiscale Advocatuur (Strak & Zakelijk)', model: 'SPA' },
    { id: 'gym', niche: 'Crossfit Gym (Energiek & Krachtig)', model: 'SPA' },
    { id: 'gaming-lounge', niche: 'Gaming Lounge & Esports Cafe (Neon & Futuristisch)', model: 'SPA' },
    { id: 'classic-cars', niche: 'Verhuur van Klassieke Auto\'s (Rijk & Nostalgisch)', model: 'SPA' },
    { id: 'meubelmaker', niche: 'Ambachtelijke Meubelmaker (Hout & Kwaliteit)', model: 'SPA' },
    { id: 'zonnepanelen', niche: 'Zonnepanelen Installateur (Duurzaam & Tech)', model: 'SPA' },
    { id: 'marketing-agency', niche: 'Boutique Marketing Agency (Creatief & Gedurfd)', model: 'SPA' },
    { id: 'fietsenwinkel', niche: 'Gespecialiseerde E-bike Winkel (Actief & Modern)', model: 'SPA' }
];

async function generateWithAI(prompt, isJson = true, retries = 5) {
     // Recycled helper for content generation
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" }); // Upgraded model
    
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.generateContent(prompt);
            const text = (await result.response).text();
            if (isJson) {
                const jsonStart = text.indexOf('{');
                const jsonEnd = text.lastIndexOf('}');
                if (jsonStart === -1 || jsonEnd === -1) throw new Error("Geen JSON gevonden");
                const cleanJson = text.substring(jsonStart, jsonEnd + 1).trim();
                return JSON.parse(cleanJson);
            }
            return text.trim();
        } catch (e) {
            console.error(`⚠️ AI Poging ${i + 1} mislukt: ${e.message}`);
            if (i === retries - 1) return null;
            await new Promise(r => setTimeout(r, 2000));
        }
    }
    return null;
}

async function runAutomatedShowcase() {
    const root = path.resolve(__dirname);
    await loadEnv(path.join(root, '.env'));

    console.log(`\n🚀 Athena Unified Showcase Generator gestart (Powered by Dashboard API)`);

    for (const item of NICHES) {
        try {
            const safeProjectName = `showcase-${item.id}`;
            const projectDir = path.resolve(root, '../sites', safeProjectName);
            
            console.log(`\n--- [ NICHE: ${item.niche.toUpperCase()} ] ---`);

            if (await fs.access(projectDir).then(() => true).catch(() => false)) {
                console.log(`⏩ Site "${safeProjectName}" bestaat al. Overslaan.`);
                continue;
            }

            // 1. Bedrijfsnaam & Beschrijving
            console.log(`🤖 Verzin een geloofwaardig bedrijf...`);
            const biz = await generateWithAI(`Genereer een unieke, professionele naam en een uitgebreide beschrijving (min 500 woorden) voor een fictief bedrijf in de niche: "${item.niche}". Output JSON: { "name": "...", "description": "..." }. Nederlands.`);
            if (!biz) continue;

            // 2. Dashboard APIs voor Structuur & Design
            console.log(`📐 API: Datastructuur genereren...`);
            const dataStructure = await generateDataStructureAPI(biz.description);
            
            console.log(`🎨 API: Design genereren...`);
            const designSystem = await generateDesignSuggestionAPI(biz.description);

            // 3. Sitetype aanmaken via Dashboard Logic
            const siteTypeName = `${safeProjectName}-type`;
            console.log(`🏗️  Sitetype "${siteTypeName}" aanmaken...`);
            await generateCompleteSiteType(siteTypeName, biz.description, dataStructure, designSystem);

            // 4. Project Aanmaken (Factory)
            console.log(`🏭 Project genereren...`);
            // Factory verwacht een relatief pad vanaf 3-sitetypes/
            const blueprintFile = path.join(siteTypeName, 'blueprint', `${siteTypeName}.json`);
            
            await createProject({
                projectName: safeProjectName,
                siteType: siteTypeName,
                blueprintFile: blueprintFile,
                siteModel: item.model
            });
            
            // 5. Content Genereren
            console.log(`✍️  Content schrijven...`);
            
            // Generate content based on the NEW structure from dashboard API
             const contentData = {};
             
             // First table is always primary/metadata
             const primaryTableName = dataStructure[0].table_name;
             // But dashboard logic might put metadata in a specific table?
             // Usually 'bedrijfsinformatie' or similiar.
             // We'll trust the AI context content generation.

             for (const table of dataStructure) {
                console.log(`   - Data voor tabel: ${table.table_name}`);
                const prompt = `Genereer 5 tot 10 items voor de tabel "${table.table_name}" voor het bedrijf "${biz.name}".
                Kolommen: ${JSON.stringify(table.columns)}.
                Context: ${biz.description}.
                Zorg voor rijke, realistische data. Gebruik Unsplash URLs voor afbeeldingen.
                Output: JSON Array van objecten.`;
                
                const data = await generateWithAI(prompt, true);
                if (data) contentData[table.table_name] = data;
            }

            // 6. Injecteer Data
            console.log(`📝 Data injecteren...`);
            const dataDir = path.resolve(root, '../sites', safeProjectName, 'src/data');
            for (const [table, content] of Object.entries(contentData)) {
                await fs.writeFile(path.join(dataDir, `${table.toLowerCase()}.json`), JSON.stringify(content, null, 2));
            }
            
            // 7. Repair Sites (Ensure dock connector)
            // Ideally we call repairSite logic here, but createProject should have done it if template is up to date.
            // Since we updated templates, it should be fine.

            console.log(`✅ VOLTOOID: ${safeProjectName}`);

        } catch (error) {
            console.error(`❌ Fout bij ${item.id}:`, error);
        }
    }
}

runAutomatedShowcase();
