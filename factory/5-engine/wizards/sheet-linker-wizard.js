/**
 * @file sheet-linker-wizard.js
 * @description Losstaande wizard voor het koppelen van een Google Sheet aan een project.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { ask, rl } from '../cli-interface.js';
import { linkGoogleSheet } from '../core/sheet-engine.js';
import { loadEnv } from '../env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runLinkerWizard() {
    const root = path.resolve(__dirname, '..');
    await loadEnv(path.join(root, '.env'));

    console.log("\n=======================================");
    console.log("📊 Google Sheet Koppeling Wizard");
    console.log("=======================================");

    // 1. Project selecteren
    const sitesDir = path.resolve(root, '../sites');
    if (!fs.existsSync(sitesDir)) {
        console.error("❌ Map 'sites' niet gevonden.");
        process.exit(1);
    }

    const projects = fs.readdirSync(sitesDir).filter(f => {
        const fullPath = path.join(sitesDir, f);
        return fs.statSync(fullPath).isDirectory() && f !== '.git';
    });

    if (projects.length === 0) {
        console.log("⚠️ Geen sites gevonden in de 'sites' map. Maak eerst een site aan.");
        process.exit(0);
    }

    console.log('\n📁 Selecteer een project om te koppelen:');
    projects.forEach((f, i) => console.log(`   [${i + 1}] ${f}`));
    console.log('   [Q] Annuleren');

    const choice = await ask('\n🚀 Keuze: ');
    if (choice.toUpperCase() === 'Q') process.exit(0);

    const index = parseInt(choice, 10);
    if (isNaN(index) || index < 1 || index > projects.length) {
        console.log("❌ Ongeldige keuze.");
        process.exit(1);
    }

    const projectName = projects[index - 1];
    console.log(`✅ Gekozen project: ${projectName}`);

    // 2. Instructies & URL vragen
    console.log("\nINSTRUCTIES:");
    console.log("1. Maak een nieuwe Google Sheet aan.");
    console.log("2. Maak tabbladen aan volgens de blueprint.");
    console.log("3. Publiceer via 'Bestand' > 'Delen' > 'Publiceren op internet' (TSV).");
    console.log("4. Zet 'Algemene toegang' op 'Iedereen met de link'.");
    console.log("5. Deel de Sheet met het 'client_email' uit uw service-account (zie hieronder).");
    console.log("6. Kopieer de URL uit de ADRESBALK (Edit URL).");
    console.log("7. Kopieer de URL uit 'Publiceren op internet' (Export URL).");

    const sheetUrl = await ask('\n🔗 Google Sheet URL (Edit Link): ');
    if (!sheetUrl.trim()) {
        console.log("❌ Geen URL opgegeven. Afgebroken.");
        process.exit(0);
    }

    const pubUrl = await ask('🔗 Publicatie URL (Export Link, optioneel): ');

    // 3. Koppelen
    const success = await linkGoogleSheet(projectName, sheetUrl.trim(), pubUrl.trim() || null);

    if (success) {
        // 4. Toon Service Account Email
        let saPath = path.join(root, 'sheet-service-account.json');
        if (!fs.existsSync(saPath)) saPath = path.join(root, 'service-account.json');
        
        if (fs.existsSync(saPath)) {
            try {
                const saData = JSON.parse(fs.readFileSync(saPath, 'utf8'));
                if (saData.client_email) {
                    console.log(`\n🔑 \x1b[33mBELANGRIJK: Deel uw Google Sheet met dit e-mailadres als 'Bewerker':\x1b[0m`);
                    console.log(`\x1b[36m${saData.client_email}\x1b[0m\n`);
                }
            } catch (e) { /* Negeer */ }

            const fileName = path.basename(saPath);
            const auto = await ask(`🚀 "${fileName}" gevonden! Data nu ook uploaden? (j/n): `);
            if (auto.toLowerCase() === 'j') {
                const uploader = path.join(root, '5-engine', 'sync-tsv-to-sheet.js');
                const ghUser = process.env.GITHUB_USER || "";
                try {
                    execSync(`node "${uploader}" "${projectName}" "${sheetUrl}" "${saPath}" "${ghUser}" "${projectName}"`, { stdio: 'inherit' });
                } catch (e) {
                    console.error("❌ Upload mislukt.");
                }
            }
        } else {
            console.log("\n(Geen service-account gevonden voor auto-upload.)");
        }
        
        console.log("\n💉 Vergeet niet de data te injecteren via optie [8] in het dashboard.");
    }

    rl.close();
}

runLinkerWizard();
