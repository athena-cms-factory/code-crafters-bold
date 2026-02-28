/**
 * Interpreter.js
 * @description Translates natural language prompts into structured Athena Factory commands.
 * Uses Athena AI Engine for robust, multi-provider waterfall support.
 */

import { generateWithAI } from './ai-engine.js';
import fs from 'fs';
import path from 'path';

export class AthenaInterpreter {
    constructor(configManager) {
        this.configManager = configManager;
    }

    /**
     * Analyze a prompt and return a site configuration object
     */
    async interpretCreate(prompt, siteTypes, styles) {
        const systemInstruction = `
            Je bent de 'Athena Architect'. Jouw taak is om een gebruikersprompt te vertalen naar een JSON configuratie voor een nieuwe website.
            
            BESCHIKBARE SITETYPES: ${JSON.stringify(siteTypes)}
            BESCHIKBARE STIJLEN: ${JSON.stringify(styles)}
            
            REGEER UITSLUITEND MET EEN JSON OBJECT IN DIT FORMAAT:
            {
                "projectName": "een-korte-safe-name",
                "siteType": "gekozen-sitetype",
                "layoutName": "standard",
                "styleName": "gekozen-stijl",
                "siteModel": "SPA",
                "reasoning": "waarom heb je dit gekozen?"
            }
        `;

        const result = await generateWithAI(`${systemInstruction}\n\nGEBRUIKER PROMPT: ${prompt}`, { isJson: true });
        if (!result) throw new Error("AI kon geen geldige configuratie genereren.");
        return result;
    }

    /**
     * Translate an update instruction into a set of data patches
     */
    async interpretUpdate(instruction, siteContext) {
        const systemInstruction = `
            Je bent de 'Athena Assistant'. Jouw taak is om een update-instructie van een klant te vertalen naar specifieke wijzigingen in de data-bestanden.
            
            PROJECT DATA CONTEXT (Enkele voorbeelden van velden):
            ${JSON.stringify(siteContext)}
            
            REGEER UITSLUITEND MET EEN JSON OBJECT IN DIT FORMAAT:
            {
                "patches": [
                    { "file": "basis", "index": 0, "key": "veldnaam", "value": "nieuwe waarde" },
                    { "file": "site_settings", "index": 0, "key": "light_primary_color", "value": "#hexcode" }
                ],
                "syncRequired": true,
                "reasoning": "waarom heb je deze wijzigingen gekozen?"
            }
        `;

        const result = await generateWithAI(`${systemInstruction}\n\nINSTRUCTIE: ${instruction}`, { isJson: true });
        if (!result) throw new Error("AI kon de update-instructie niet interpreteren.");
        return result;
    }
}
