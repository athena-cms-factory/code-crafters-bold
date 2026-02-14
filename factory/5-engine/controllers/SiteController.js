/**
 * SiteController.js
 * @description Headless business logic for managing generated sites.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { createProject, validateProjectName } from '../factory.js';
import { deployProject } from '../deploy-wizard.js';
import { AthenaDataManager } from '../lib/DataManager.js';

export class SiteController {
    constructor(config) {
        this.config = config;
        this.root = config.paths.root;
        this.sitesDir = config.paths.sites;
        this.dataManager = new AthenaDataManager(config.paths.factory);
    }

    /**
     * List all generated sites with their current status
     */
    list() {
        if (!fs.existsSync(this.sitesDir)) return [];
        const sites = fs.readdirSync(this.sitesDir).filter(f => 
            fs.statSync(path.join(this.sitesDir, f)).isDirectory() && !f.startsWith('.') && f !== 'athena-cms'
        );

        return sites.map(site => {
            const sitePath = path.join(this.sitesDir, site);
            const deployFile = path.join(sitePath, 'project-settings', 'deployment.json');
            const sheetFile = path.join(sitePath, 'project-settings', 'url-sheet.json');

            let status = 'local';
            let deployData = null;
            let sheetData = null;
            let isDataEmpty = false;

            // Check if data exists
            const dataDir = path.join(sitePath, 'src', 'data');
            if (fs.existsSync(dataDir)) {
                const jsonFiles = fs.readdirSync(dataDir).filter(f => f.endsWith('.json') && f !== 'schema.json');
                if (jsonFiles.length > 0) {
                    let allEmpty = true;
                    for (const file of jsonFiles) {
                        if (fs.statSync(path.join(dataDir, file)).size > 5) {
                            allEmpty = false;
                            break;
                        }
                    }
                    isDataEmpty = allEmpty;
                } else isDataEmpty = true;
            } else isDataEmpty = true;

            if (fs.existsSync(deployFile)) {
                deployData = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
                status = deployData.status || 'live';
            }

            if (fs.existsSync(sheetFile)) {
                const json = JSON.parse(fs.readFileSync(sheetFile, 'utf8'));
                const firstKey = Object.keys(json)[0];
                if (firstKey) sheetData = json[firstKey].editUrl;
            }

            return { name: site, status, deployData, sheetUrl: sheetData, isDataEmpty };
        });
    }

    /**
     * Generate a new site from blueprint and source project
     */
    async create(params) {
        const { projectName, sourceProject, siteType, layoutName, styleName, siteModel, autoSheet, clientEmail } = params;
        const config = {
            projectName: validateProjectName(projectName),
            sourceProject: sourceProject ? validateProjectName(sourceProject) : undefined,
            siteType,
            layoutName,
            styleName,
            siteModel: siteModel || 'SPA',
            autoSheet: autoSheet === true || autoSheet === 'true',
            clientEmail,
            blueprintFile: path.join(siteType, 'blueprint', `${siteType}.json`)
        };
        await createProject(config);
        return { success: true, message: `Project ${config.projectName} created!` };
    }

    /**
     * Sync local JSON data to Google Sheet
     */
    async syncToSheet(id) {
        await this.dataManager.syncToSheet(id);
        return { success: true, message: "Sync completed successfully." };
    }

    /**
     * Pull data from Google Sheet to local JSON
     */
    async pullFromSheet(id) {
        await this.dataManager.syncFromSheet(id);
        return { success: true, message: "Data successfully pulled from Google Sheets." };
    }

    /**
     * Deploy site to GitHub Pages
     */
    async deploy(projectName, commitMsg) {
        const result = await deployProject(projectName, commitMsg);
        return { success: true, result };
    }

    /**
     * Run a maintenance script (e.g. sync-deployment-status)
     */
    runScript(script, args) {
        const scriptPath = path.join(this.config.paths.factory, '5-engine', script);
        const output = execSync(`"${process.execPath}" "${scriptPath}" ${args.map(a => `"${a}"`).join(' ')}`, {
            cwd: this.config.paths.factory,
            env: { ...process.env }
        }).toString();
        return { success: true, details: output };
    }
}
