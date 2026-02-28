/**
 * 🤖 project-manager.js (CORE)
 * @description Core logic for project operations like renaming.
 */

import fs from 'fs';
import path from 'path';

export async function renameProject(oldName, newName, rootDir) {
    const sitesDir = path.resolve(rootDir, '../sites');
    const inputDir = path.resolve(rootDir, '../input');

    const oldSitePath = path.join(sitesDir, oldName);
    const newSitePath = path.join(sitesDir, newName);
    const oldDataPath = path.join(inputDir, oldName);
    const newDataPath = path.join(inputDir, newName);

    if (!fs.existsSync(oldSitePath)) throw new Error(`Project ${oldName} does not exist.`);
    if (fs.existsSync(newSitePath)) throw new Error(`Destination ${newName} already exists.`);

    // Rename directories
    fs.renameSync(oldSitePath, newSitePath);
    if (fs.existsSync(oldDataPath)) {
        fs.renameSync(oldDataPath, newDataPath);
    }

    // Update config files (package.json, vite.config.js, index.html)
    updateConfigs(newSitePath, newName);
    
    return true;
}

function updateConfigs(siteDir, newName) {
    const pkgPath = path.join(siteDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        pkg.name = newName;
        fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
    }

    const vitePath = path.join(siteDir, 'vite.config.js');
    if (fs.existsSync(vitePath)) {
        let vite = fs.readFileSync(vitePath, 'utf8');
        const baseRegex = /base:\s*['"][^'"]*['"]/g;
        vite = vite.replace(baseRegex, `base: '/${newName}/'`);
        fs.writeFileSync(vitePath, vite);
    }

    const indexPath = path.join(siteDir, 'index.html');
    if (fs.existsSync(indexPath)) {
        let html = fs.readFileSync(indexPath, 'utf8');
        html = html.replace(/<title>.*?<\/title>/, `<title>${newName}</title>`);
        fs.writeFileSync(indexPath, html);
    }
}
