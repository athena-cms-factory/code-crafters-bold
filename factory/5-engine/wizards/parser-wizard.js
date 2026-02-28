/**
 * @file parser-wizard.js
 * @description Losstaande wizard om de AI Parser te draaien voor een bestaand project.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { ask, rl } from '../cli-interface.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runParserWizard() {
    const root = path.resolve(__dirname, '..');
    const projectsDataDir = path.join(root, '../input');

    // --- DASHBOARD MODE CHECK ---
    // Argumenten: [projectName, inputFile, siteType, customPrompt]
    const args = process.argv.slice(2);
    if (args.length >= 3) {
        const [projectName, inputFile, siteType, customPrompt] = args;
        console.log(`🤖 [DASHBOARD MODE] Parser gestart voor ${projectName} (${siteType})`);
        
        // Fix: resolve the actual type name from the track/name format
        const typeName = siteType.includes('/') ? siteType.split('/').pop() : siteType;
        const parserScript = path.join(root, '3-sitetypes', siteType, 'parser', `parser-${typeName}.js`);
        if (!fs.existsSync(parserScript)) {
            console.error(`❌ Parser script niet gevonden: ${parserScript}`);
            process.exit(1);
        }

        try {
            // We geven de custom prompt mee via een tijdelijke env variabele of als extra argument
            // Voor nu: we passen het parser script aan of sturen het als argument mee.
            // De meeste parsers accepteren 2 argumenten, we breiden dit uit naar 3.
            execSync(`node "${parserScript}" "${projectName}" "${inputFile}" "${customPrompt || ''}"`, { stdio: 'inherit' });
            process.exit(0);
        } catch (e) {
            console.error(`❌ Fout: ${e.message}`);
            process.exit(1);
        }
    }

    console.log("\n=======================================");
    console.log("🤖 AI Parser Wizard (Update Data)");
    console.log("=======================================");

    // 1. Project selecteren uit ../input
    if (!fs.existsSync(projectsDataDir)) {
        console.error("❌ Map '../input' niet gevonden.");
        process.exit(1);
    }

    const folders = fs.readdirSync(projectsDataDir).filter(f => {
        const fullPath = path.join(projectsDataDir, f);
        return fs.statSync(fullPath).isDirectory() && f !== '.git';
    });

    if (folders.length === 0) {
        console.log("⚠️ Geen projecten gevonden in '../input'.");
        process.exit(0);
    }

    console.log('\n📁 Selecteer een project om te parsen:');
    folders.forEach((f, i) => console.log(`   [${i + 1}] ${f}`));
    console.log('   [Q] Annuleren');

    const projectChoice = await ask('\n🚀 Keuze: ');
    if (projectChoice.toUpperCase() === 'Q') process.exit(0);

    const folderIndex = parseInt(projectChoice, 10);
    if (isNaN(folderIndex) || folderIndex < 1 || folderIndex > folders.length) {
        console.log("❌ Ongeldige keuze.");
        process.exit(1);
    }

    const projectName = folders[folderIndex - 1];
    console.log(`✅ Gekozen project: ${projectName}`);

    // 2. SiteType bepalen
    let siteType = null;
    const configPath = path.resolve(root, '../sites', projectName, 'athena-config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            siteType = config.siteType;
            console.log(`ℹ️  Sitetype gedetecteerd uit configuratie: ${siteType}`);
        } catch (e) {
            console.warn("⚠️ Kon athena-config.json niet goed lezen.");
        }
    }

    if (!siteType) {
        const siteTypesDir = path.join(root, '3-sitetypes');
        const siteTypes = fs.readdirSync(siteTypesDir).filter(f => fs.statSync(path.join(siteTypesDir, f)).isDirectory() && !f.startsWith('.'));
        
        console.log('\n📜 Kies handmatig het sitetype:');
        siteTypes.forEach((t, i) => console.log(`   [${i + 1}] ${t}`));
        const typeChoice = await ask('\n🚀 Keuze: ');
        const typeIdx = parseInt(typeChoice, 10);
        if (!isNaN(typeIdx) && typeIdx >= 1 && typeIdx <= siteTypes.length) {
            siteType = siteTypes[typeIdx - 1];
        } else {
            console.log("❌ Ongeldig type.");
            process.exit(1);
        }
    }

    // 3. Input bestand selecteren
    const inputDir = path.join(projectsDataDir, projectName, 'input');
    if (!fs.existsSync(inputDir)) {
        console.error(`❌ Input map niet gevonden: ${inputDir}`);
        process.exit(1);
    }

    const inputFiles = fs.readdirSync(inputDir).filter(f => !f.startsWith('.'));
    if (inputFiles.length === 0) {
        console.log("⚠️ Geen bestanden gevonden in de input map.");
        process.exit(0);
    }

    console.log('\n📝 Selecteer het input-bestand voor de AI:');
    inputFiles.forEach((f, i) => console.log(`   [${i + 1}] ${f}`));
    const fileChoice = await ask('\n🚀 Keuze: ');
    const fileIdx = parseInt(fileChoice, 10);
    
    let inputFile = "wizard-combined-input.txt"; // Default
    if (!isNaN(fileIdx) && fileIdx >= 1 && fileIdx <= inputFiles.length) {
        inputFile = inputFiles[fileIdx - 1];
    } else {
        console.log(`⚠️ Ongeldige keuze, we gebruiken '${inputFile}' indien aanwezig.`);
    }

    // 4. Parser draaien
    console.log(`\n🤖 AI Parser (${siteType}) wordt gestart voor ${projectName}...`);
    const parserScript = path.join(root, '3-sitetypes', siteType, 'parser', `parser-${siteType}.js`);

    if (!fs.existsSync(parserScript)) {
        console.error(`❌ Parser script niet gevonden: ${parserScript}`);
        process.exit(1);
    }

    try {
        execSync(`node "${parserScript}" "${projectName}" "${inputFile}"`, { stdio: 'inherit' });
        console.log('\n✅ AI Parser succesvol voltooid.');
        console.log(`   Resultaten staan in: ../input/${projectName}/tsv-data/`);
        
        const next = await ask('\n🚀 Wilt u deze data direct uploaden naar Google Sheets? (j/n): ');
        if (next.toLowerCase() === 'j') {
             // We roepen de linker aan, of direct de uploader als er al een URL is
             const urlSheetPath = path.resolve(root, '../sites', projectName, 'project-settings', 'url-sheet.json');
             if (fs.existsSync(urlSheetPath)) {
                 // Haal URL uit de eerste key
                 const urlConfig = JSON.parse(fs.readFileSync(urlSheetPath, 'utf8'));
                 const firstKey = Object.keys(urlConfig)[0];
                 const sheetUrl = urlConfig[firstKey].split('/export')[0]; // Simpele extractie van de basis URL
                 
                 const uploader = path.join(root, '5-engine', 'sync-tsv-to-sheet.js');
                 let saPath = path.join(root, 'sheet-service-account.json');
                 if (!fs.existsSync(saPath)) saPath = path.join(root, 'service-account.json');
                 
                 console.log("📡 Starten upload...");
                 execSync(`node "${uploader}" "${projectName}" "${sheetUrl}" "${saPath}"`, { stdio: 'inherit' });
             } else {
                 console.log("⚠️ Geen Google Sheet gekoppeld aan dit project. Gebruik optie [11] in het dashboard.");
             }
        }
    } catch (error) {
        console.error(`❌ Fout tijdens parser: ${error.message}`);
    }

    rl.close();
}

runParserWizard();
