/**
 * @file cleanup-wizard.js
 * @description Utility voor het opruimen van test-projecten en data (Lokaal & Remote).
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { loadEnv } from '../env-loader.js';

// Dynamische import voor CLI-interface om errors te voorkomen bij server-gebruik
let ask;
async function initCLI() {
    if (!ask) {
        const cli = await import('../cli-interface.js');
        ask = cli.ask;
    }
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

/**
 * Verwijdert een lokaal project (site en/of data).
 * @param {string} projectId - Naam van het project (mapnaam).
 * @param {boolean} deleteSite - Verwijder de site uit 'sites/'.
 * @param {boolean} deleteData - Verwijder de data uit '../input/'.
 * @returns {object} Resultaat log.
 */
export function deleteLocalProject(projectId, deleteSite = true, deleteData = true) {
    const sitesDir = path.resolve(ROOT_DIR, '../sites');
    const dataDir = path.join(ROOT_DIR, '../input');
    const logs = [];

    const pSites = path.join(sitesDir, projectId);
    const pData = path.join(dataDir, projectId);
    
    if (deleteSite && fs.existsSync(pSites)) {
        try {
            // Gewoon verwijderen
            if (fs.existsSync(pSites)) {
                fs.rmSync(pSites, { recursive: true, force: true });
                logs.push(`✅ Map verwijderd: sites/${projectId}`);
            }
        } catch (e) {
            // Fallback: Force delete
            if (fs.existsSync(pSites)) {
                fs.rmSync(pSites, { recursive: true, force: true });
                logs.push(`⚠️  Force delete: sites/${projectId} (Error: ${e.message})`);
            }
        }
    } else if (deleteSite) {
        logs.push(`ℹ️  Site map bestond niet: ../sites/${projectId}`);
    }
    
    if (deleteData && fs.existsSync(pData)) {
        fs.rmSync(pData, { recursive: true, force: true });
        logs.push(`✅ Data verwijderd: ../input/${projectId}`);
    } else if (deleteData) {
        logs.push(`ℹ️  Data map bestond niet: ../input/${projectId}`);
    }

    return { success: true, logs };
}

/**
 * Verwijdert een remote GitHub repository.
 * Probeert zowel de organisatie als de persoonlijke account.
 * @param {string} projectId - De basisnaam van het project (bijv. 'project-x').
 * @returns {object} Resultaat log.
 */
export async function deleteRemoteRepo(projectId) {
    await loadEnv(path.join(ROOT_DIR, '.env'));
    const { GITHUB_USER, GITHUB_ORG, GITHUB_PAT } = process.env;

    if (!GITHUB_USER && !GITHUB_ORG) throw new Error("GITHUB_USER of GITHUB_ORG niet in .env");

    const targets = [];
    if (GITHUB_ORG) {
        targets.push(`${GITHUB_ORG}/${projectId}`);
    }
    if (GITHUB_USER) {
        targets.push(`${GITHUB_USER}/${projectId}`);
    }

    // Unieke targets
    const uniqueTargets = [...new Set(targets)];
    let deletedCount = 0;
    const errors = [];

    for (const target of uniqueTargets) {
        try {
            // Gebruik het PAT uit de env voor de delete operatie om CLI-login conflicten te vermijden
            execSync(`gh repo delete ${target} --yes`, { 
                stdio: 'pipe',
                env: { ...process.env, GH_TOKEN: GITHUB_PAT }
            });
            deletedCount++;
        } catch (e) {
            // Repo bestaat waarschijnlijk niet onder deze specifieke naam/owner combinatie
            errors.push(`${target}: ${e.message}`);
        }
    }

    if (deletedCount > 0) {
        // Check lokale koppeling verwijderen
        const localPath = path.join(ROOT_DIR, 'sites', projectId);
        let localMsg = "";
        if (fs.existsSync(localPath) && fs.existsSync(path.join(localPath, '.git'))) {
            try {
                execSync('git remote remove origin', { cwd: localPath, stdio: 'pipe' });
                localMsg = " (Lokale git remote 'origin' verwijderd)";
            } catch (e) {}
        }
        return { success: true, message: `${deletedCount} remote repository('s) verwijderd.${localMsg}` };
    } else {
        throw new Error(`Geen remote repositories gevonden om te verwijderen (geprobeerd: ${uniqueTargets.join(', ')})`);
    }
}

// --- CLI LOGIC ---

async function manageLocalProjects() {
    await initCLI();
    const sitesDir = path.resolve(ROOT_DIR, '../sites');
    const dataDir = path.join(ROOT_DIR, '../input');

    const getDirectories = (source) => {
        if (!fs.existsSync(source)) return [];
        return fs.readdirSync(source).filter(f => {
            const fullPath = path.join(source, f);
            return fs.statSync(fullPath).isDirectory() && f !== '.gitkeep';
        });
    };

    const sites = getDirectories(sitesDir);
    const dataset = getDirectories(dataDir);
    const allProjects = [...new Set([...sites, ...dataset])];

    if (allProjects.length === 0) {
        console.log("\n✅ Er zijn geen lokale projecten om op te ruimen.");
        await ask('\nDruk op Enter om terug te gaan...');
        return;
    }

    console.log("\nLOKALE PROJECTEN:");
    allProjects.forEach((p, i) => {
        const hasSite = sites.includes(p) ? "\x1b[36m[SITE]\x1b[0m" : "      ";
        const hasData = dataset.includes(p) ? "\x1b[33m[DATA]\x1b[0m" : "      ";
        console.log(`  [${i + 1}] ${hasSite} ${hasData} ${p}`);
    });
    console.log(`\n  [A] ALLES VERWIJDEREN`);
    console.log(`  [Q] Terug naar hoofdmenu`);

    const choice = await ask('\nSelecteer project(en) (bv. 1, 3 of "A"): ');
    if (choice.toUpperCase() === 'Q') return;

    let targets = [];
    if (choice.toUpperCase() === 'A') {
        targets = allProjects;
    } else {
        const indices = choice.split(',').map(s => parseInt(s.trim()) - 1);
        targets = indices.filter(i => allProjects[i]).map(i => allProjects[i]);
    }

    if (targets.length === 0) return;

    console.log("\nWAT MOET ER VERWIJDERD WORDEN?");
    console.log("[1] 🏗️  Enkel de gegenereerde site(s) (../sites/)");
    console.log("[2] 📂 Enkel de bron-data (../input/)");
    console.log("[3] 🧨 ALLES (zowel site als data)");
    console.log("[Q] Annuleren");

    const deleteMode = await ask('\nKies een optie: ');
    if (deleteMode.toUpperCase() === 'Q') return;

    const deleteSite = deleteMode === '1' || deleteMode === '3';
    const deleteData = deleteMode === '2' || deleteMode === '3';

    if (!deleteSite && !deleteData) return;

    const confirm = await ask(`⚠️  \x1b[31mWEET JE HET ZEKER? Dit verwijderde ${targets.length} project(en).\x1b[0m (ja/nee): `);
    if (confirm.toLowerCase() !== 'ja') return;

    console.log(`\n⏳ Bezig met verwijderen...`);
    targets.forEach(project => {
        const result = deleteLocalProject(project, deleteSite, deleteData);
        result.logs.forEach(l => console.log("   " + l));
    });
    
    await ask('\nDruk op Enter om door te gaan...');
}

async function manageRemoteRepos() {
    await initCLI();
    await loadEnv(path.join(ROOT_DIR, '.env'));
    const { GITHUB_USER, GITHUB_ORG } = process.env;

    if (!GITHUB_USER && !GITHUB_ORG) {
        console.log("\x1b[31m❌ GITHUB_USER of GITHUB_ORG niet gevonden in .env\x1b[0m");
        await ask('Druk op Enter...');
        return;
    }

    const owners = [GITHUB_ORG, GITHUB_USER].filter(Boolean);
    let allAthRepos = [];

    for (const owner of owners) {
        console.log(`\n⏳ Ophalen van repositories voor '${owner}'...`);
        try {
            const output = execSync(`gh repo list ${owner} --limit 200 --json name,owner`, { encoding: 'utf8' });
            const repos = JSON.parse(output);
            // We laten alle repositories zien die horen bij de eigenaar.
            repos.forEach(r => {
                allAthRepos.push({
                    name: r.name,
                    fullName: `${r.owner.login}/${r.name}`
                });
            });
        } catch (error) {
            console.error(`❌ Fout bij ophalen repos voor ${owner}:`, error.message);
        }
    }

    if (allAthRepos.length === 0) {
        console.log("\n✅ Geen repositories gevonden.");
        await ask('Druk op Enter...');
        return;
    }

    console.log("\nREMOTE REPOSITORIES:");
    allAthRepos.forEach((r, i) => {
        console.log(`  [${i + 1}] ${r.fullName}`);
    });
    console.log(`\n  [A] ALLES VERWIJDEREN`);
    console.log(`  [Q] Terug naar hoofdmenu`);

    const choice = await ask('\nSelecteer repo(s) om te verwijderen: ');
    if (choice.toUpperCase() === 'Q') return;

    let targets = [];
    if (choice.toUpperCase() === 'A') {
        const confirm = await ask('⚠️  \x1b[31mDIT IS DESTRUCTIEF! WEET JE HET ZEKER?[0m (ja/nee): ');
        if (confirm.toLowerCase() !== 'ja') return;
        targets = allAthRepos;
    } else {
        const indices = choice.split(',').map(s => parseInt(s.trim()) - 1);
        targets = indices.filter(i => allAthRepos[i]).map(i => allAthRepos[i]);
    }

    if (targets.length === 0) return;

    console.log(`\n⏳ Bezig met verwijderen van ${targets.length} repository('s)...`);
    for (const repo of targets) {
        process.stdout.write(`   🗑️  Verwijderen ${repo.fullName}... `);
        try {
            execSync(`gh repo delete ${repo.fullName} --yes`, { stdio: 'pipe' });
            process.stdout.write("✅\n");
        } catch (e) {
            console.log(`❌ Fout: ${e.message}`);
        }
    }
    await ask('\nDruk op Enter om door te gaan...');
}

async function cleanupWizard() {
    await initCLI();
    while (true) {
        console.log("======================================");
        console.log("🧹 Athena Cleanup & Reset Wizard");
        console.log("======================================");
        console.log("[1] 📂 Lokale Projecten Opruimen");
        console.log("[2] ☁️  Remote GitHub Repos Opruimen");
        console.log("[Q] Stoppen");

        const choice = await ask('\nMaak een keuze: ');

        switch (choice.toUpperCase()) {
            case '1': await manageLocalProjects(); break;
            case '2': await manageRemoteRepos(); break;
            case 'Q': process.exit(0);
            default: break;
        }
    }
}

// Alleen uitvoeren als dit bestand direct wordt aangeroepen
if (process.argv[1] === fileURLToPath(import.meta.url)) {
    cleanupWizard().catch(err => {
        console.error("❌ Onverwachte fout:", err);
        process.exit(1);
    });
}