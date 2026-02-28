/**
 * @file env-loader.js
 * @description Intelligente lader voor .env bestanden.
 */

import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { ask } from './cli-interface.js';

/**
 * Probeert de .env file te laden en vraagt de gebruiker om input als het mislukt.
 * @param {string} defaultPath - Het standaardpad naar de .env file.
 */
export async function loadEnv(defaultPath) {
    let result = dotenv.config({ path: defaultPath });
    const isHeadless = process.argv.includes('--headless') || process.argv[1].includes('athena-agent.js');

    while (result.error || !process.env.GEMINI_API_KEY) {
        if (isHeadless) {
            console.error(`\n❌ [HEADLESS MODE] Kon de .env file niet vinden op '${defaultPath}' of de GEMINI_API_KEY ontbreekt.`);
            process.exit(1);
        }
        
        console.log(`\n⚠️ Kon de .env file niet vinden op '${defaultPath}' of de GEMINI_API_KEY ontbreekt.`);
        const newPath = await ask('   Geef het correcte pad naar uw .env bestand (of druk op Enter om te stoppen): ');

        if (!newPath) {
            console.error("\n❌ Geen geldig .env bestand geladen. De wizard stopt.");
            process.exit(1);
        }

        defaultPath = newPath;
        result = dotenv.config({ path: newPath });
    }

    console.log(`✅ .env bestand succesvol geladen vanaf '${defaultPath}'.`);
    return true;
}
