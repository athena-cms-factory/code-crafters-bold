/**
 * @file DataManager.js
 * @description Unified data management for Athena monorepo. 
 *              Consolidates JSON, TSV, and Google Sheets sync logic.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { google } from 'googleapis';
import csv from 'csvtojson';

export class AthenaDataManager {
    constructor(root) {
        this.root = root;
    }

    /**
     * Resolve project and site directories (handles -site suffix)
     */
    resolvePaths(projectName) {
        const safeName = projectName.toLowerCase().replace(/\s+/g, '-');
        
        let siteDir = path.resolve(this.root, '../sites', safeName);
        if (!fs.existsSync(siteDir)) {
            const altSiteDir = path.resolve(this.root, '../sites', `${safeName}-site`);
            if (fs.existsSync(altSiteDir)) siteDir = altSiteDir;
        }

        const inputDir = path.resolve(this.root, '../input', safeName);
        
        return {
            projectName: safeName,
            siteDir,
            inputDir,
            dataDir: path.join(siteDir, 'src/data'),
            settingsDir: path.join(siteDir, 'project-settings'),
            tsvDir: path.join(inputDir, 'tsv-data')
        };
    }

    /**
     * Backup existing data files
     */
    backupData(siteDir, dataDir) {
        if (!fs.existsSync(dataDir)) return;
        
        const backupsRoot = path.join(siteDir, 'backups');
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const backupDir = path.join(backupsRoot, `data_${timestamp}`);
        
        console.log(`📦 Creating backup: backups/data_${timestamp}...`);
        fs.mkdirSync(backupDir, { recursive: true });
        
        const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
        files.forEach(file => {
            fs.copyFileSync(path.join(dataDir, file), path.join(backupDir, file));
        });

        // Prune old backups (keep last 2)
        try {
            const existingBackups = fs.readdirSync(backupsRoot)
                .filter(f => f.startsWith('data_'))
                .sort();
            
            if (existingBackups.length > 2) {
                const toDelete = existingBackups.slice(0, existingBackups.length - 2);
                toDelete.forEach(folder => {
                    fs.rmSync(path.join(backupsRoot, folder), { recursive: true, force: true });
                    console.log(`🗑️ Pruned old backup: ${folder}`);
                });
            }
        } catch (e) {}
    }

    /**
     * Load JSON data
     */
    loadJSON(filePath) {
        if (!fs.existsSync(filePath)) return null;
        return JSON.parse(fs.readFileSync(filePath, 'utf8'));
    }

    /**
     * Save JSON data
     */
    saveJSON(filePath, data) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    }

    /**
     * Sync from Sheet (Trigger pnpm fetch-data in site)
     */
    async syncFromSheet(projectName) {
        const paths = this.resolvePaths(projectName);
        if (!fs.existsSync(paths.siteDir)) throw new Error(`Site directory not found for ${projectName}`);

        this.backupData(paths.siteDir, paths.dataDir);

        console.log(`🚀 Fetching data for '${projectName}'...`);
        execSync('pnpm fetch-data', { cwd: paths.siteDir, stdio: 'inherit' });
    }

    /**
     * Sync TSV to JSON
     */
    async syncTSVToJSON(projectName) {
        const paths = this.resolvePaths(projectName);
        if (!fs.existsSync(paths.tsvDir)) throw new Error(`TSV source not found: ${paths.tsvDir}`);

        console.log(`🔄 Injecting TSV data for: '${projectName}'`);
        const files = fs.readdirSync(paths.tsvDir).filter(f => f.endsWith('.tsv'));

        for (const file of files) {
            const tsvPath = path.join(paths.tsvDir, file);
            const json = await csv({ delimiter: '	', checkType: true }).fromFile(tsvPath);
            
            const cleaned = json.map(row => {
                const newRow = {};
                Object.keys(row).forEach(key => {
                    let val = row[key];
                    if (typeof val === 'string') {
                        val = val.replace(/<br>/gi, '
').trim();
                    }
                    newRow[key] = val;
                });
                return newRow;
            });

            const destPath = path.join(paths.dataDir, file.replace('.tsv', '.json').toLowerCase());
            this.saveJSON(destPath, cleaned);
            console.log(`  ✅ Injected: ${path.basename(destPath)}`);
        }
    }
}
