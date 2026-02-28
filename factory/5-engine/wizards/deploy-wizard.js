/**
 * @file deploy-wizard.js
 * @description Wizard voor het automatisch aanmaken van een GitHub repository en het deployen van een gegenereerd project.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { loadEnv } from '../env-loader.js';
import { rl, ask } from '../cli-interface.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- EXPORTED LOGIC ---
export async function deployProject(selectedProject, commitMsg = "Deploy update") {
    const root = path.resolve(__dirname, '..');
    const projectDir = path.resolve(root, '../sites', selectedProject);
    const { GITHUB_USER, GITHUB_PAT, GITHUB_ORG, GITHUB_SSH_HOST } = process.env;
    const ORG = GITHUB_ORG || GITHUB_USER;
    const SSH_HOST = GITHUB_SSH_HOST || "github.com";

    if (!GITHUB_USER || !GITHUB_PAT) {
        throw new Error("GITHUB_USER en GITHUB_PAT moeten zijn ingesteld in .env.");
    }

    // --- SELF-HEALING: DEPENDENCIES ---
    if (!fs.existsSync(path.join(projectDir, 'node_modules'))) {
        console.log(`   💊 Self-Healing: node_modules ontbreekt. Installeren...`);
        try {
            execSync('pnpm install --child-concurrency 1', { cwd: projectDir, stdio: 'inherit' });
        } catch (e) {
            console.warn("   ⚠️  Kon dependencies niet installeren. Deployment gaat door, maar de site werkt mogelijk niet lokaal.");
        }
    }

    // --- STAP 1: GIT INIT & CONFIG ---
    if (!fs.existsSync(path.join(projectDir, '.git'))) {
        console.log(`   ⚙️  Initialiseren van Git repo...`);
        execSync('git init', { cwd: projectDir, stdio: 'pipe' });
    }

    // Stel lokale git config in voor deze site
    console.log(`   👤 Instellen auteur: ${GITHUB_USER} <${GITHUB_USER}@gmail.com>`);
    execSync(`git config user.name "${GITHUB_USER}"`, { cwd: projectDir, stdio: 'pipe' });
    execSync(`git config user.email "${GITHUB_USER}@gmail.com"`, { cwd: projectDir, stdio: 'pipe' });

    const repoName = selectedProject;
    
    // --- STAP 2: UPDATE README ---
    const readmePath = path.join(projectDir, 'README.md');
    const deployUrl = `https://${ORG}.github.io/${repoName}/`;
    const newReadme = `# ${selectedProject}\n\n🚀 **Live Site:** [${deployUrl}](${deployUrl})\n\n---\nBuilt with **Athena CMS Factory** (MPA Engine).`;
    
    fs.writeFileSync(readmePath, newReadme);
    console.log(`   📝 README.md bijgewerkt met URL: ${deployUrl}`);

    // --- STAP 3: UPDATE VITE CONFIG ---
    const viteConfigPath = path.join(projectDir, 'vite.config.js');
    if (fs.existsSync(viteConfigPath)) {
        let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
        const baseRegex = /base:\s*['"][^'"]*['"]|base:\s*process\.env\.NODE_ENV\s*===\s*.*?\?\s*.*?\/.*?:\s*['"]\/['"]/;
        const newBase = `base: process.env.NODE_ENV === 'production' ? '/${repoName}/' : '/'`;
        
        if (!viteConfig.includes(newBase)) {
            if (baseRegex.test(viteConfig)) {
                viteConfig = viteConfig.replace(baseRegex, newBase);
            } else {
                viteConfig = viteConfig.replace('defineConfig({', `defineConfig({\n  ${newBase},`);
            }
            fs.writeFileSync(viteConfigPath, viteConfig);
        }
    }

    // --- STAP 4: COMMIT WIJZIGINGEN ---
    try {
        // Controleer of we op een geldige branch zitten (bv. main of master)
        let hasBranch = false;
        try {
            execSync('git rev-parse --verify HEAD', { cwd: projectDir, stdio: 'ignore' });
            hasBranch = true;
        } catch (e) {
            console.log("   ℹ️  Nog geen commits gevonden (lege repo).");
        }

        const status = execSync('git status --porcelain', { cwd: projectDir, encoding: 'utf8' });
        
        if (!hasBranch || status.trim() !== "") {
            console.log("   📦 Wijzigingen committen...");
            execSync('git add .', { cwd: projectDir, stdio: 'pipe' });
            // Gebruik -a om zeker te zijn, hoewel git add . al is gedaan
            execSync(`git commit -m "${hasBranch ? commitMsg : 'feat: initial commit'}"`, { cwd: projectDir, stdio: 'pipe' });
            
            // Zorg dat we op 'main' zitten
            if (!hasBranch) {
                execSync('git branch -M main', { cwd: projectDir, stdio: 'pipe' });
            }
            console.log("   ✅ Wijzigingen gecommit.");
        } else {
            console.log("   ℹ️  Geen wijzigingen om te committen.");
        }
    } catch (e) {
        console.error("   ❌ Fout tijdens git commit:", e.message);
        throw new Error(`Git commit failed: ${e.message}`);
    }

    // --- STAP 5: GITHUB CREATE/PUSH ---
    const showSuccess = () => {
        const deployInfo = {
            deployedAt: new Date().toISOString(),
            repoUrl: `https://github.com/${ORG}/${repoName}`,
            liveUrl: `https://${ORG}.github.io/${repoName}`,
            status: 'live'
        };
        const settingsDir = path.join(projectDir, 'project-settings');
        if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
        fs.writeFileSync(path.join(settingsDir, 'deployment.json'), JSON.stringify(deployInfo, null, 2));



        return {
            success: true,
            ...deployInfo,
            actionsUrl: `https://github.com/${ORG}/${repoName}/actions`,
            pagesSettingsUrl: `https://github.com/${ORG}/${repoName}/settings/pages`
        };
    };

    try {
        console.log(`   🚀 Repository aanmaken op GitHub (${ORG}/${repoName})...`);
        
        // Alleen de repo aanmaken, nog niet pushen via GH CLI (om credential conflicten te voorkomen)
        // We dwingen het token af via de GH_TOKEN env variabele
        const createCommand = `gh repo create ${ORG}/${repoName} --public`;
        try {
            execSync(createCommand, {
                cwd: projectDir,
                stdio: 'pipe',
                env: { ...process.env, GH_TOKEN: GITHUB_PAT }
            });
            console.log(`   ✅ Repository aangemaakt.`);
        } catch (err) {
            if (err.stderr && err.stderr.toString().includes("already exists")) {
                console.log(`   ℹ️ Repository bestaat al.`);
            } else {
                throw err;
            }
        }

        // Altijd de remote instellen op onze SSH Alias
        const authRemoteUrl = `git@${SSH_HOST}:${ORG}/${repoName}.git`;
        console.log(`   🔗 Remote instellen op: ${authRemoteUrl}`);
        
        try {
            execSync(`git remote add origin "${authRemoteUrl}"`, { cwd: projectDir, stdio: 'pipe' });
        } catch (e) {
            execSync(`git remote set-url origin "${authRemoteUrl}"`, { cwd: projectDir, stdio: 'pipe' });
        }

        // Handmatig pushen via Git (die onze SSH config gebruikt)
        console.log(`   📤 Pushen naar GitHub...`);
        execSync(`git push -u origin main`, { cwd: projectDir, stdio: 'pipe' });

        // --- STAP 6: CONFIG GIT PAGES (AUTOMATION) ---
        console.log(`   ⚙️  GitHub Pages configureren...`);
        try {
            // 1. Maak gh-pages branch aan op remote (kopie van main voor nu, wordt overschreven door action)
            // Dit is nodig omdat de API faalt als de branch niet bestaat
            try {
                execSync(`git push origin main:gh-pages`, { cwd: projectDir, stdio: 'ignore' });
            } catch (e) {
                // Branch bestaat misschien al, negeer
            }

            // 2. Zet settings via GitHub API
            // source.branch = gh-pages, source.path = /
            // We gebruiken PUT omdat POST faalt als het al bestaat, en PUT werkt voor create/update in veel gevallen
            // Of we proberen POST en vallen terug.
            const apiParams = `-F "source[branch]=gh-pages" -F "source[path]=/"`;
            try {
                execSync(`gh api repos/${ORG}/${repoName}/pages -X POST ${apiParams}`, { 
                    cwd: projectDir, 
                    stdio: 'ignore', 
                    env: { ...process.env, GH_TOKEN: GITHUB_PAT } 
                });
            } catch (apiErr) {
                // Als POST faalt (bv omdat het al bestaat), probeer PUT
                execSync(`gh api repos/${ORG}/${repoName}/pages -X PUT ${apiParams}`, { 
                    cwd: projectDir, 
                    stdio: 'ignore', 
                    env: { ...process.env, GH_TOKEN: GITHUB_PAT } 
                });
            }
            console.log(`   ✅ GitHub Pages ingesteld op branch 'gh-pages'.`);
        } catch (e) {
            console.warn(`   ⚠️  Kon GitHub Pages niet automatisch instellen: ${e.message}`);
        }
        
        return showSuccess();

    } catch (error) {
        const stderr = error.stderr ? error.stderr.toString() : error.message;
        console.error(`   ❌ Fout tijdens deploy: ${stderr}`);
        
        // Fallback voor force push bij conflicten
        if (stderr.includes("fetch first") || stderr.includes("rejected") || stderr.includes("non-fast-forward")) {
            console.log("   ⚠️  Conflict gedetecteerd. Force push uitvoeren...");
            execSync(`git push --force -u origin main`, { cwd: projectDir, stdio: 'pipe' });
            return showSuccess();
        }
        
        throw new Error(`Deployment failed: ${stderr}`);
    }
}

// --- INTERACTIVE CLI ---
async function deployWizard() {
    console.log("======================================");
    console.log("🚀 Welkom bij de Athena Deploy Wizard");
    console.log("======================================");

    const root = path.resolve(__dirname, '..');
    await loadEnv(path.join(root, '.env'));

    // --- STAP 1: PROJECT SELECTEREN ---
    const sitesDir = path.resolve(root, '../sites');
    if (!fs.existsSync(sitesDir)) fs.mkdirSync(sitesDir, { recursive: true });

    const projects = fs.readdirSync(sitesDir).filter(f =>
        fs.statSync(path.join(sitesDir, f)).isDirectory() && f !== '.gitkeep'
    );

    if (projects.length === 0) {
        console.log("\x1b[31m❌ Geen gegenereerde projecten gevonden in '../sites'.\x1b[0m");
        rl.close();
        return;
    }

    console.log('\nSelecteer het te deployen project:');
    projects.forEach((p, i) => console.log(`  [${i + 1}] ${p}`));
    const selectedProject = await askWithValidation('Kies een nummer: ', projects);

    console.log(`   ✅ Project geselecteerd: ${selectedProject}`);

    // Commit Message Vragen
    const msg = await ask('\n✍️  Geef een commit-boodschap (Enter voor "Deploy update"): ');
    const commitMsg = msg.trim() || "Deploy update";

    try {
        const result = await deployProject(selectedProject, commitMsg);
        
        console.log(`      URL: ${result.repoUrl}`);
        console.log("\n\x1b[33m🚀 DEPLOYMENT VOLTOOID:\x1b[0m");
        console.log("   De deployment wordt nu automatisch uitgevoerd door GitHub Actions.");
        console.log("   GitHub Pages is automatisch geconfigureerd op de 'gh-pages' branch.");
        console.log(`   Volg de voortgang hier: \x1b[36m${result.actionsUrl}\x1b[0m`);

    } catch (error) {
        console.error(`\x1b[31m❌ Deployment mislukt: ${error.message}\x1b[0m`);
    }

    rl.close();
}

async function askWithValidation(query, options) {
    while (true) {
        const answer = await ask(query);
        const index = parseInt(answer, 10);
        if (!isNaN(index) && index >= 1 && index <= options.length) {
            return options[index - 1];
        }
        console.log(`\x1b[31m❌ Ongeldige keuze. Voer een nummer in tussen 1 en ${options.length}.\x1b[0m`);
    }
}

// Check if run directly
const isDirectRun = import.meta.url.endsWith(process.argv[1]);
if (isDirectRun) {
    deployWizard();
}