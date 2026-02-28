/**
 * @file onboarding-wizard.js
 * @description Advanced Digital Strategist & Onboarding for Athena CMS.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { ask, closeRl } from '../cli-interface.js';
import { validateProjectName } from '../core/factory.js';
import { provisionSheet } from '../auto-sheet-provisioner.js';
import { loadEnv } from '../env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

async function runOnboarding() {
    await loadEnv(path.join(ROOT, '.env'));

    console.log("====================================================");
    console.log("🔱 Athena Digital Strategist | Onboarding Wizard 🔱");
    console.log("====================================================");

    const args = process.argv.slice(2);
    let rawName = args[0];
    let websiteUrl = (args[1] === 'none' || args[1] === 'null' || !args[1]) ? null : args[1];
    let clientEmail = (args[2] === 'none' || args[2] === 'null' || !args[2]) ? null : args[2];

    if (!rawName) {
        rawName = await ask('\n🏢 Bedrijfsnaam: ');
    }
    
    if (!rawName) {
        console.log("❌ Geen naam opgegeven. Afsluiten.");
        closeRl();
        return;
    }

    const safeName = validateProjectName(rawName);
    const clientDir = path.join(ROOT, '../input', safeName);
    
    if (!fs.existsSync(clientDir)) {
        fs.mkdirSync(clientDir, { recursive: true });
        const subInput = path.join(clientDir, 'input');
        if (!fs.existsSync(subInput)) fs.mkdirSync(subInput, { recursive: true });
    }

    // --- STRATEGIC DATA STRUCTURE ---
    const discovery = {
        meta: {
            company_name: rawName,
            slug: safeName,
            date: new Date().toISOString(),
            status: "prospect",
            version: "2.0"
        },
        strategy: {},
        structure: {},
        assets: {},
        technical: {
            client_email: clientEmail || "",
            legacy_url: websiteUrl || ""
        }
    };

    if (!args[0]) {
        console.log("\n--- Deel 1: Identiteit & Doelgroep ---");
        discovery.strategy.tagline = await ask('🎯 Tagline/Slogan: ');
        discovery.strategy.usp = await ask('💡 De "One Big Thing" (Hoofdbelofte): ');
        discovery.strategy.dream_client = await ask('👤 Wie is de ideale klant (psychografie): ');
        discovery.strategy.pain_point = await ask('😫 Wat is hun grootste probleem dat u oplost: ');

        console.log("\n--- Deel 2: Conversie & Actie ---");
        discovery.strategy.golden_button = await ask('🔘 Wat is de primaire actie (Call, Form, WhatsApp)? ');
        discovery.strategy.social_proof = await ask('🏆 Bewijs (Reviews, Ervaring, Keurmerken): ');

        console.log("\n--- Deel 3: Structuur & Sfeer ---");
        discovery.structure.non_negotiables = await ask('🧩 Welke secties MOETEN er zijn (bijv. Portfolio, Prijzen)? ');
        discovery.strategy.tone = await ask('🎨 Sfeer (Modern, Bold, Classic, Warm): ');
        discovery.assets.photo_source = await ask('📸 Eigen foto\'s of AI-generatie? ');
    } else {
        console.log("⏩ Sla vragen over (CLI argumenten / Dash mode).");
        discovery.strategy.tone = "Modern";
    }

    // Opslaan Discovery
    fs.writeFileSync(
        path.join(clientDir, 'discovery.json'),
        JSON.stringify(discovery, null, 2)
    );

    console.log(`\n✅ Strategisch dossier opgeslagen: input/${safeName}/discovery.json`);

    // Google Sheet Provisioning
    let provision = args[0] ? 'j' : await ask('\n📊 Google Sheet aanmaken? (j/n): ');
    if (provision.toLowerCase() === 'j') {
        try {
            console.log("⏳ Google Sheet provisionen...");
            const result = await provisionSheet(safeName, clientEmail);
            discovery.technical.sheet_id = result.spreadsheetId;
            discovery.technical.sheet_url = result.editUrl;
            
            // Update discovery
            fs.writeFileSync(
                path.join(clientDir, 'discovery.json'),
                JSON.stringify(discovery, null, 2)
            );
        } catch (e) {
            console.error(`❌ Provisioning mislukt: ${e.message}`);
        }
    }

    // Scraping (indien URL)
    if (discovery.technical.legacy_url && discovery.technical.legacy_url.startsWith('http')) {
        let scrape = args[0] ? 'j' : await ask(`\n🌍 Bestaande site scrapen (${discovery.technical.legacy_url})? (j/n): `);
        if (scrape.toLowerCase() === 'j') {
            console.log("🚀 Scraper starten...");
            try {
                const scraperPath = path.join(__dirname, 'athena-scraper.js');
                execSync(`node "${scraperPath}" "${safeName}" "${discovery.technical.legacy_url}"`, { stdio: 'inherit' });
            } catch (e) {
                console.error(`❌ Scraping mislukt: ${e.message}`);
            }
        }
    }

    console.log("\n✨ Onboarding & Strategie voltooid!");
    console.log(`   Map: input/${safeName}/`);
    console.log(`   Volgende stap: node 5-engine/site-wizard.js`);
    
    closeRl();
}

runOnboarding().catch(err => {
    console.error("❌ Fout in onboarding wizard:", err);
    closeRl();
});
