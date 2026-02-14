/**
 * Interpreter.js
 * @description Translates natural language prompts into structured Athena Factory commands.
 * Uses Gemini API to map user intent to SiteTypes, Layouts, and Styles.
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from 'fs';
import path from 'path';

export class AthenaInterpreter {
    constructor(config) {
        this.config = config;
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) throw new Error("GEMINI_API_KEY niet gevonden in .env");
        
        const genAI = new GoogleGenerativeAI(apiKey);
        this.model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
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

        const result = await this.model.generateContent([systemInstruction, `GEBRUIKER PROMPT: ${prompt}`]);
        const response = await result.response;
        let text = response.text();
        
        // Clean markdown code blocks if AI added them
        text = text.replace(/```json/g, '').replace(/```/g, '').trim();
        
        return JSON.parse(text);
    }
}
