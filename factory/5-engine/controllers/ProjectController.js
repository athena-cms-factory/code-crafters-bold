/**
 * ProjectController.js
 * @description Handless business logic for managing source projects (input data).
 */

import fs from 'fs';
import path from 'path';
import { validateProjectName } from '../factory.js';
import { execSync } from 'child_process';

export class ProjectController {
    constructor(config) {
        this.config = config;
        this.root = config.paths.root;
        this.inputDir = config.paths.input;
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
     * Get files within a project's input directory
     */
    getFiles(id) {
        const dir = path.join(this.inputDir, id, 'input');
        if (!fs.existsSync(dir)) return [];
        return fs.readdirSync(dir).filter(f => 
            fs.statSync(path.join(dir, f)).isFile() && !f.startsWith('.')
        );
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
            fullContent += `--- FILE: ${fileName} ---
${content}

`;
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
        const separator = fs.existsSync(filePath) ? "

--- NIEUWE INVOER ---

" : "";
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

        const urlList = urls.split(/[
,]+/).map(u => u.trim()).filter(u => u.length > 0);
        if (urlList.length === 0) throw new Error("Geen geldige URLs gevonden.");

        const filePath = path.join(dir, 'urls.txt');
        fs.writeFileSync(filePath, urlList.join('
'), 'utf8');
        return { success: true, message: `${urlList.length} URL(s) opgeslagen in urls.txt` };
    }

    /**
     * Create a data source project from an existing site's JSON data
     */
    createFromSite(sourceSiteName, targetProjectName) {
        const tool = path.join(this.config.paths.factory, '5-engine', 'site-to-datasource-generator.js');
        const output = execSync(`"${process.execPath}" "${tool}" "${sourceSiteName}" "${targetProjectName}"`, {
            cwd: this.config.paths.factory,
            env: { ...process.env }
        }).toString();
        return { success: true, message: `Data Bron '${targetProjectName}' succesvol gegenereerd!`, details: output };
    }
}
