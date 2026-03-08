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
    const projectDir = path.resolve(root, '../../sites', selectedProject);
    const { GITHUB_USER, GITHUB_PAT, GITHUB_ORG, GITHUB_SSH_HOST } = process.env;
    const ORG = GITHUB_ORG || GITHUB_USER;
    const SSH_HOST = GITHUB_SSH_HOST || "github.com";

    if (!GITHUB_USER || !GITHUB_PAT) {
        throw new Error("GITHUB_USER en GITHUB_PAT moeten zijn ingesteld in .env.");
    }

    // --- DETECT MONOREPO ---
    const monorepoRoot = path.resolve(projectDir, '../..');
    const isMonorepo = fs.existsSync(path.join(monorepoRoot, '.git'));

    if (isMonorepo) {
        console.log(`   🏗️  Monorepo-modus gedetecteerd (Root: ${monorepoRoot})`);
        
        // 1. Site-specifieke voorbereiding (nog steeds nuttig voor de subtree repo)
        const readmePath = path.join(projectDir, 'README.md');
        const deployUrl = `https://${ORG}.github.io/${selectedProject}/`;
        const newReadme = `# ${selectedProject}\n\n🚀 **Live Site:** [${deployUrl}](${deployUrl})\n\n---\nBuilt with **Athena CMS Factory** (Monorepo Workflow).`;
        fs.writeFileSync(readmePath, newReadme);

        const viteConfigPath = path.join(projectDir, 'vite.config.js');
        if (fs.existsSync(viteConfigPath)) {
            let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
            const baseRegex = /base:\s*['"][^'"]*['"]|base:\s*process\.env\.NODE_ENV\s*===\s*.*?\?\s*.*?\/.*?:\s*['"]\/['"]/;
            const newBase = `base: process.env.NODE_ENV === 'production' ? '/${selectedProject}/' : '/'`;
            if (!viteConfig.includes(newBase)) {
                if (baseRegex.test(viteConfig)) viteConfig = viteConfig.replace(baseRegex, newBase);
                else viteConfig = viteConfig.replace('defineConfig({', `defineConfig({\n  ${newBase},`);
                fs.writeFileSync(viteConfigPath, viteConfig);
            }
        }

        // 2. Monorepo Commit & Push
        try {
            const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: monorepoRoot, encoding: 'utf8' }).trim();
            console.log(`   📦 Wijzigingen toevoegen aan monorepo (Branch: ${currentBranch})...`);
            
            // Verifieer welke bestanden gewijzigd zijn
            const changes = execSync('git status --porcelain', { cwd: monorepoRoot, encoding: 'utf8' });
            console.log(`   🔍 Gevonden wijzigingen:\n${changes || 'Geen'}`);

            execSync('git add .', { cwd: monorepoRoot, stdio: 'pipe' });
            
            const statusAfterAdd = execSync('git status --porcelain', { cwd: monorepoRoot, encoding: 'utf8' });
            
            if (statusAfterAdd.trim() !== "") {
                console.log(`   📝 Committen naar monorepo: "${commitMsg}"...`);
                execSync(`git commit -m "${commitMsg}"`, { cwd: monorepoRoot, stdio: 'pipe' });
                
                console.log(`   📤 Pushen naar monorepo (origin ${currentBranch})...`);
                const pushOutput = execSync(`git push origin ${currentBranch}`, { cwd: monorepoRoot, encoding: 'utf8' });
                console.log(`   ✅ Monorepo push voltooid:\n${pushOutput}`);
            } else {
                console.log(`   ℹ️ Geen wijzigingen om te committen naar de monorepo.`);
            }

            return {
                success: true,
                repoUrl: `https://github.com/${ORG}/athena-x`,
                liveUrl: deployUrl,
                status: 'pushed'
            };
        } catch (e) {
            const stderr = e.stderr ? e.stderr.toString() : e.message;
            console.error(`   ❌ Monorepo push mislukt: ${stderr}`);
            throw new Error(`Monorepo push failed: ${stderr}`);
        }
    }

    // --- STANDALONE MODUS (Oud gedrag voor losse projecten) ---
    console.log(`   📂 Standalone-modus (geen monorepo gedetecteerd)`);

    // --- STAP 1: GIT INIT & CONFIG ---
    if (!fs.existsSync(path.join(projectDir, '.git'))) {
        console.log(`   ⚙️  Initialiseren van Git repo...`);
        execSync('git init', { cwd: projectDir, stdio: 'pipe' });
    }

    console.log(`   👤 Instellen auteur: ${GITHUB_USER} <${GITHUB_USER}@gmail.com>`);
    execSync(`git config user.name "${GITHUB_USER}"`, { cwd: projectDir, stdio: 'pipe' });
    execSync(`git config user.email "${GITHUB_USER}@gmail.com"`, { cwd: projectDir, stdio: 'pipe' });

    const repoName = selectedProject;
    const readmePath = path.join(projectDir, 'README.md');
    const deployUrl = `https://${ORG}.github.io/${repoName}/`;
    const newReadme = `# ${selectedProject}\n\n🚀 **Live Site:** [${deployUrl}](${deployUrl})\n\n---\nBuilt with **Athena CMS Factory** (Standalone).`;
    fs.writeFileSync(readmePath, newReadme);

    const viteConfigPath = path.join(projectDir, 'vite.config.js');
    if (fs.existsSync(viteConfigPath)) {
        let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
        const baseRegex = /base:\s*['"][^'"]*['"]|base:\s*process\.env\.NODE_ENV\s*===\s*.*?\?\s*.*?\/.*?:\s*['"]\/['"]/;
        const newBase = `base: process.env.NODE_ENV === 'production' ? '/${repoName}/' : '/'`;
        if (!viteConfig.includes(newBase)) {
            if (baseRegex.test(viteConfig)) viteConfig = viteConfig.replace(baseRegex, newBase);
            else viteConfig = viteConfig.replace('defineConfig({', `defineConfig({\n  ${newBase},`);
            fs.writeFileSync(viteConfigPath, viteConfig);
        }
    }

    try {
        let hasBranch = false;
        try {
            execSync('git rev-parse --verify HEAD', { cwd: projectDir, stdio: 'ignore' });
            hasBranch = true;
        } catch (e) {}

        const status = execSync('git status --porcelain', { cwd: projectDir, encoding: 'utf8' });
        if (!hasBranch || status.trim() !== "") {
            execSync('git add .', { cwd: projectDir, stdio: 'pipe' });
            execSync(`git commit -m "${hasBranch ? commitMsg : 'feat: initial commit'}"`, { cwd: projectDir, stdio: 'pipe' });
            if (!hasBranch) execSync('git branch -M main', { cwd: projectDir, stdio: 'pipe' });
        }
    } catch (e) {
        throw new Error(`Git commit failed: ${e.message}`);
    }

    try {
        const createCommand = `gh repo create ${ORG}/${repoName} --public`;
        try {
            execSync(createCommand, { cwd: projectDir, stdio: 'pipe', env: { ...process.env, GH_TOKEN: GITHUB_PAT } });
        } catch (err) {
            if (!(err.stderr && err.stderr.toString().includes("already exists"))) throw err;
        }

        const authRemoteUrl = `git@${SSH_HOST}:${ORG}/${repoName}.git`;
        try { execSync(`git remote add origin "${authRemoteUrl}"`, { cwd: projectDir, stdio: 'pipe' }); }
        catch (e) { execSync(`git remote set-url origin "${authRemoteUrl}"`, { cwd: projectDir, stdio: 'pipe' }); }

        const currentBranch = execSync('git rev-parse --abbrev-ref HEAD', { cwd: projectDir, encoding: 'utf8' }).trim();
        execSync(`git push -u origin ${currentBranch}`, { cwd: projectDir, stdio: 'pipe' });
        
        // GH Pages config
        const apiParams = `-F "source[branch]=gh-pages" -F "source[path]=/"`;
        try { execSync(`git push origin ${currentBranch}:gh-pages`, { cwd: projectDir, stdio: 'ignore' }); } catch(e){}
        try { execSync(`gh api repos/${ORG}/${repoName}/pages -X POST ${apiParams}`, { cwd: projectDir, stdio: 'ignore', env: { ...process.env, GH_TOKEN: GITHUB_PAT } }); }
        catch (apiErr) { execSync(`gh api repos/${ORG}/${repoName}/pages -X PUT ${apiParams}`, { cwd: projectDir, stdio: 'ignore', env: { ...process.env, GH_TOKEN: GITHUB_PAT } }); }
        
        return {
            success: true,
            repoUrl: `https://github.com/${ORG}/${repoName}`,
            liveUrl: deployUrl,
            status: 'live'
        };
    } catch (error) {
        const stderr = error.stderr ? error.stderr.toString() : error.message;
        if (stderr.includes("fetch first") || stderr.includes("rejected")) {
            execSync(`git push --force -u origin main`, { cwd: projectDir, stdio: 'pipe' });
            return { success: true, repoUrl: `https://github.com/${ORG}/${repoName}`, liveUrl: deployUrl, status: 'live' };
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