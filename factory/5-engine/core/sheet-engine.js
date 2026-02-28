/**
 * @file generate-url-sheet.js
 * @description Genereert een url-sheet.json op basis van een Google Sheet URL.
 *              Kan zowel als standalone script als als module worden gebruikt.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';
import { loadEnv } from './env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getSpreadsheetIdFromUrl(url) {
    const match = url.match(/spreadsheets\/d\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

function getPubIdFromUrl(url) {
    if (!url) return null;
    const match = url.match(/spreadsheets\/d\/e\/([a-zA-Z0-9-_]+)/);
    return match ? match[1] : null;
}

/**
 * Kernlogica om een Google Sheet te linken en url-sheet.json te genereren.
 * @param {string} projectName - De naam van het project.
 * @param {string} sheetUrl - De volledige URL van de Google Sheet (Edit URL).
 * @param {string} pubUrl - De 'Publiceren op internet' URL (optioneel).
 * @returns {Promise<boolean>} - True bij succes, false bij een fout.
 */
export async function linkGoogleSheet(projectName, sheetUrl, pubUrl = null) {
    console.log("🔗 Bezig met het koppelen van de Google Sheet...");
    const root = path.resolve(__dirname, '..');

    await loadEnv(path.join(root, '.env'));
    const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
    if (!apiKey) {
        console.error("\x1b[31m❌ Fout: GOOGLE_SHEETS_API_KEY niet gevonden in het .env bestand.\x1b[0m");
        return false;
    }

    const spreadsheetId = getSpreadsheetIdFromUrl(sheetUrl);
    if (!spreadsheetId) {
        console.error("\x1b[31m❌ Fout: Kon geen geldig Google Sheet ID uit de URL halen (Edit URL).\x1b[0m");
        return false;
    }

    const pubId = getPubIdFromUrl(pubUrl);

    try {
        console.log("   Verbinding maken met de Google Sheets API...");
        const sheets = google.sheets({ version: 'v4', auth: apiKey });
        const response = await sheets.spreadsheets.get({ spreadsheetId });

        const sheetData = response.data.sheets;
        if (!sheetData || sheetData.length === 0) {
            console.error("\x1b[31m❌ Fout: Geen tabbladen gevonden in de spreadsheet.\x1b[0m");
            return false;
        }

        console.log(`   ${sheetData.length} tabbladen gevonden. Configuratie wordt gegenereerd...`);
        const urlSheetConfig = {};
        for (const sheet of sheetData) {
            const name = sheet.properties.title;
            const gid = sheet.properties.sheetId;
            if (name.startsWith('_')) continue;
            
            // Altijd de directe export-URL gebruiken om Google caching te vermijden
            urlSheetConfig[name] = {
                editUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`,
                exportUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv&gid=${gid}`
            };
        }

        const outputDir = path.resolve(root, '../sites', projectName, 'project-settings');
        const outputPath = path.join(outputDir, 'url-sheet.json');

        fs.mkdirSync(outputDir, { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(urlSheetConfig, null, 2));

        console.log(`\x1b[32m✅ Succes! Koppeling opgeslagen in:\x1b[0m ${outputPath}`);
        if (pubId) console.log(`   ℹ️  Publicatie-ID gedetecteerd: ${pubId}`);
        return true;

    } catch (error) {
        console.error("\x1b[31m❌ Fout bij het communiceren met de Google Sheets API.\x1b[0m");
        console.error("   Controleer de volgende punten:");
        console.error("   1. Is de GOOGLE_SHEETS_API_KEY in uw .env-bestand correct en geldig?");
        console.error("   2. Heeft u de 'Google Sheets API' ingeschakeld in uw Google Cloud Platform-console?");
        console.error("   3. Heeft de spreadsheet de status 'Iedereen met de link kan bekijken'?");
        console.error("\n   Gedetailleerde foutmelding:");
        console.error(error);
        return false;
    }
}

// --- STANDALONE EXECUTIE ---
// Dit blok wordt alleen uitgevoerd als het script direct wordt aangeroepen.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    (async () => {
        const args = process.argv.slice(2);
        // We accepteren nu 2 (alleen edit) of 3 (edit + pub) argumenten
        if (args.length < 2 || args.length > 3) {
            console.error("\x1b[31m❌ Fout: Ongeldig aantal argumenten.\x1b[0m");
            console.log("   Gebruik: node 5-engine/generate-url-sheet.js [projectnaam] \"[edit-url]\" \"[optionele-pub-url]\"");
            process.exit(1);
        }
        const [projectName, sheetUrl, pubUrl] = args;
        const success = await linkGoogleSheet(projectName, sheetUrl, pubUrl || null);
        process.exit(success ? 0 : 1);
    })();
}
