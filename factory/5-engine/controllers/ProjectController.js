/**
 * ProjectController.js
 * @description Handless business logic for managing source projects (input data).
 */

import fs from 'fs';
import path from 'path';
import { validateProjectName } from '../core/factory.js';
import { execSync } from 'child_process';
import { deleteLocalProject, deleteRemoteRepo } from '../wizards/cleanup-wizard.js';

export class ProjectController {
    constructor(configManager, executionService) {
        this.configManager = configManager;
        this.execService = executionService;
        this.root = configManager.get('paths.root');
        this.inputDir = configManager.get('paths.input');
    }

    /**
     * List all available source projects
     */
    list() {
        if (!fs.existsSync(this.inputDir)) return [];
        return fs.readdirSync(this.inputDir).filter(f => 
            fs.statSync(path.join(this.inputDir, f)).isDirectory() && !f.startsWith('.')
        );
    }

    /**
     * Create a new source project directory
     */
    create(projectName) {
        const safeName = validateProjectName(projectName);
        const dir = path.join(this.inputDir, safeName, 'input');
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(path.join(this.inputDir, safeName, '.gitkeep'), '');
        }
        return { success: true, message: `Bronproject '${safeName}' aangemaakt.`, projectName: safeName };
    }

    /**
     * Get files within a project's input and tsv-data directories
     */
    getFiles(id) {
        const inputDir = path.join(this.inputDir, id, 'input');
        const tsvDir = path.join(this.inputDir, id, 'tsv-data');
        let files = [];

        if (fs.existsSync(inputDir)) {
            const inputFiles = fs.readdirSync(inputDir).filter(f => 
                fs.statSync(path.join(inputDir, f)).isFile() && !f.startsWith('.')
            );
            files = [...files, ...inputFiles];
        }

        if (fs.existsSync(tsvDir)) {
            const tsvFiles = fs.readdirSync(tsvDir).filter(f => 
                fs.statSync(path.join(tsvDir, f)).isFile() && !f.startsWith('.')
            );
            files = [...files, ...tsvFiles];
        }

        return files;
    }

    /**
     * Collect all text/content files for AI processing
     */
    getContent(id) {
        const baseDir = path.join(this.inputDir, id);
        const inputDir = path.join(baseDir, 'input');

        const collectFiles = (directory) => {
            if (fs.existsSync(directory)) {
                return fs.readdirSync(directory).filter(f => {
                    return fs.statSync(path.join(directory, f)).isFile() &&
                        !f.startsWith('.') &&
                        (f.endsWith('.txt') || f.endsWith('.md') || f.endsWith('.json'));
                }).map(f => path.join(directory, f));
            }
            return [];
        };

        const filesToRead = [...collectFiles(baseDir), ...collectFiles(inputDir)];
        if (filesToRead.length === 0) return { content: "" };

        let fullContent = "";
        for (const filePath of filesToRead) {
            const content = fs.readFileSync(filePath, 'utf8');
            const fileName = path.basename(filePath);
            fullContent += `--- FILE: ${fileName} ---\n${content}\n\n`;
        }

        return { content: fullContent };
    }

    /**
     * Append text to a project file
     */
    addText(id, text, filename = 'input.txt') {
        if (!text) throw new Error("Geen tekst ontvangen.");
        const dir = path.join(this.inputDir, id, 'input');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const filePath = path.join(dir, filename);
        const separator = fs.existsSync(filePath) ? "\n\n--- NIEUWE INVOER ---\n\n" : "";
        fs.appendFileSync(filePath, separator + text, 'utf8');
        return { success: true, message: "Tekst succesvol toegevoegd aan " + filename };
    }

    /**
     * Save a list of URLs to urls.txt
     */
    saveUrls(id, urls) {
        if (!urls) throw new Error("Geen URLs ontvangen.");
        const dir = path.join(this.inputDir, id, 'input');
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

        const urlList = urls.split(/[\n,]+/).map(u => u.trim()).filter(u => u.length > 0);
        if (urlList.length === 0) throw new Error("Geen geldige URLs gevonden.");

        const filePath = path.join(dir, 'urls.txt');
        fs.writeFileSync(filePath, urlList.join('\n'), 'utf8');
        return { success: true, message: `${urlList.length} URL(s) opgeslagen in urls.txt` };
    }

    /**
     * Create a data source project from an existing site's JSON data
     */
    createFromSite(sourceSiteName, targetProjectName) {
        return this.execService.runEngineScript('site-to-datasource-generator.js', [sourceSiteName, targetProjectName]);
    }

    /**
     * Rename a project and its associated site
     */
    async rename(oldName, newName) {
        return this.execService.runEngineScript('rename-site-wizard.js', [oldName, newName]);
    }

    /**
     * Sync JSON data back to TSV format
     */
    async reverseSync(id) {
        return this.execService.runEngineScript('sync-json-to-tsv.js', [id]);
    }

    /**
     * Upload TSV data to a linked Google Sheet
     */
    async uploadData(id) {
        return this.execService.runEngineScript('sync-tsv-to-sheets.js', [id]);
    }

    /**
     * Delete project parts (local data, local site, remote repo)
     */
    async deleteProject(id, { deleteSite, deleteData, deleteRemote }) {
        let logs = [];
        if (deleteSite || deleteData) {
            const result = deleteLocalProject(id, deleteSite, deleteData);
            logs = [...logs, ...result.logs];
        }
        if (deleteRemote) {
            try {
                const remoteResult = await deleteRemoteRepo(id);
                logs.push(`✅ ${remoteResult.message}`);
            } catch (e) {
                logs.push(`ℹ️ Geen remote repo verwijderd: ${e.message}`);
            }
        }
        return { success: true, logs };
    }
}
