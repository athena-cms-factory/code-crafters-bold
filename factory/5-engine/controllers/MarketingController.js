/**
 * MarketingController.js
 * @description Handles autonomous content generation for SEO and marketing.
 * Integrates with AI Engine for brains and DataManager for Sheets sync.
 */

import fs from 'fs';
import path from 'path';
import { generateWithAI } from '../core/ai-engine.js';
import { AthenaDataManager } from '../lib/DataManager.js';

export class MarketingController {
    constructor(configManager) {
        this.configManager = configManager;
        this.dataManager = new AthenaDataManager(configManager.get('paths.factory'));
    }

    /**
     * Generate a new blog post for a specific site
     * @param {string} projectName 
     * @param {string} topic (Optional)
     */
    async generateBlog(projectName, topic = "the future of AI-driven web design") {
        console.log(`✍️  AI Marketing: Blog genereren voor '${projectName}' over '${topic}'...`);

        // 1. Haal context op van de site voor relevante content
        const paths = this.dataManager.resolvePaths(projectName);
        const siteSettings = this.dataManager.loadJSON(path.join(paths.dataDir, 'site_settings.json')) || {};
        const basis = this.dataManager.loadJSON(path.join(paths.dataDir, 'basis.json')) || {};
        
        const systemInstruction = `
            Je bent een 'SEO Copywriter'. Schrijf een boeiende blogpost voor de website '${projectName}'.
            SITE CONTEXT: ${JSON.stringify(siteSettings)}
            BASIS INFO: ${JSON.stringify(basis)}
            ONDERWERP: ${topic}
            
            REGEER UITSLUITEND MET EEN JSON OBJECT:
            {
                "title": "Titel van de blog",
                "excerpt": "Korte samenvatting voor de overzichtspagina",
                "content": "Volledige HTML of Markdown inhoud van de blog",
                "author": "Athena Agent",
                "date": "${new Date().toISOString().split('T')[0]}",
                "category": "Technologie"
            }
        `;

        const blogJson = await generateWithAI(systemInstruction, { isJson: true });
        if (!blogJson) throw new Error("AI kon geen blog genereren.");

        // 2. Voeg de blog toe aan de lokale data (blog.json)
        const blogFilePath = path.join(paths.dataDir, 'blog.json');
        let existingBlogs = [];
        if (fs.existsSync(blogFilePath)) {
            existingBlogs = JSON.parse(fs.readFileSync(blogFilePath, 'utf8'));
        }
        
        existingBlogs.unshift(blogJson); // Nieuwste bovenaan
        fs.writeFileSync(blogFilePath, JSON.stringify(existingBlogs, null, 2));
        
        console.log(`✅ Blog lokaal opgeslagen: ${blogJson.title}`);

        // 3. SYNC NAAR GOOGLE SHEETS
        console.log(`📡 Blog synchroniseren naar Google Sheet van ${projectName}...`);
        await this.dataManager.syncToSheet(projectName);

        return {
            success: true,
            message: "Blog succesvol gegenereerd en gesynchroniseerd naar de Sheet.",
            blog: blogJson
        };
    }

    /**
     * Generate optimized SEO metadata for all pages
     * @param {string} projectName 
     */
    async generateSEO(projectName) {
        console.log(`🔍 AI Marketing: SEO metadata optimaliseren voor '${projectName}'...`);

        const paths = this.dataManager.resolvePaths(projectName);
        const siteSettings = this.dataManager.loadJSON(path.join(paths.dataDir, 'site_settings.json')) || {};
        const basis = this.dataManager.loadJSON(path.join(paths.dataDir, 'basis.json')) || {};
        
        // We proberen ook pagina-specifieke data te laden als die er is
        const pagesDir = path.join(paths.dataDir);
        const dataFiles = fs.readdirSync(pagesDir).filter(f => f.endsWith('.json') && f !== 'seo.json');
        
        const context = {
            settings: siteSettings,
            basis: basis,
            contentOverview: dataFiles.map(f => f.replace('.json', ''))
        };

        const systemInstruction = `
            Je bent een 'SEO Expert'. Genereer geoptimaliseerde meta-tags voor de website '${projectName}'.
            CONTEXT: ${JSON.stringify(context)}
            
            Genereer voor de homepage en algemene site-tags.
            
            REGEER UITSLUITEND MET EEN JSON OBJECT:
            {
                "title": "SEO Geoptimaliseerde Titel (max 60 chars)",
                "description": "Meta description die aanzet tot klikken (max 160 chars)",
                "keywords": "keyword1, keyword2, keyword3, ...",
                "og_title": "Social media titel",
                "og_description": "Social media beschrijving",
                "structured_data": {
                    "@context": "https://schema.org",
                    "@type": "Organization",
                    "name": "${projectName}"
                }
            }
        `;

        const seoJson = await generateWithAI(systemInstruction, { isJson: true });
        if (!seoJson) throw new Error("AI kon geen SEO data genereren.");

        const seoFilePath = path.join(paths.dataDir, 'seo.json');
        // We slaan het op als een array met 1 object voor consistentie met andere data files
        fs.writeFileSync(seoFilePath, JSON.stringify([seoJson], null, 2));
        
        console.log(`✅ SEO metadata lokaal opgeslagen.`);

        // SYNC NAAR GOOGLE SHEETS
        console.log(`📡 SEO synchroniseren naar Google Sheet van ${projectName}...`);
        await this.dataManager.syncToSheet(projectName);

        return {
            success: true,
            message: "SEO metadata succesvol gegenereerd en gesynchroniseerd.",
            seo: seoJson
        };
    }
}
