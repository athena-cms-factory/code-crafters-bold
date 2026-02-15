import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { spawn, execSync } from 'child_process';
import multer from 'multer';
import cors from 'cors';
import { getLogPath } from '../5-engine/lib/logger.js';
import { AthenaDataManager } from '../5-engine/lib/DataManager.js';
import { createProject, validateProjectName } from '../5-engine/factory.js';
import { deployProject } from '../5-engine/deploy-wizard.js';
import { linkGoogleSheet } from '../5-engine/generate-url-sheet.js';
import { deleteLocalProject, deleteRemoteRepo } from '../5-engine/cleanup-wizard.js';
import { AthenaProcessManager } from '../5-engine/lib/ProcessManager.js';
import { AthenaConfigManager } from '../5-engine/lib/ConfigManager.js';
import { AthenaLogManager } from '../5-engine/lib/LogManager.js';
import { AthenaSecretManager } from '../5-engine/lib/SecretManager.js';
import { ProjectController } from '../5-engine/controllers/ProjectController.js';
import { SiteController } from '../5-engine/controllers/SiteController.js';
import { DoctorController } from '../5-engine/controllers/DoctorController.js';
import { PaymentController } from '../5-engine/controllers/PaymentController.js';
import {
    generateDataStructureAPI,
    generateParserInstructionsAPI,
    generateDesignSuggestionAPI,
    generateCompleteSiteType,
    getExistingSiteTypes
} from './sitetype-api.js';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

const configManager = new AthenaConfigManager(root);
const pm = new AthenaProcessManager(root);
const lm = new AthenaLogManager(root);
const sm = new AthenaSecretManager(root);
const projectCtrl = new ProjectController(configManager);
const siteCtrl = new SiteController(configManager);
const doctorCtrl = new DoctorController(configManager);
const paymentCtrl = new PaymentController(configManager);

// --- MULTER CONFIG (voor uploads) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { id } = req.params;
        const uploadDir = path.join(root, '../input', id, 'input');
        if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, file.originalname);
    }
});
const upload = multer({ storage });

let activePreviewProcess = null;

const app = express();
const port = configManager.get('ports.dashboard');

// --- SIMPLE LOGGER ---
app.use((req, res, next) => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
    next();
});

app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(root));

// --- HELPER: DETACHED PROCESS SPAWNER ---
function spawnDetached(script, logBaseName, port = 0) {
    const id = logBaseName.replace('.log', '').replace('.txt', '');
    return pm.startProcess(id, 'utility', port, process.execPath, [`5-engine/${script}`], { cwd: root });
}

// --- API ENDPOINTS ---

app.get('/api/system/config', (req, res) => {
    res.json(configManager.getAll());
});

app.get('/api/system/logs', (req, res) => {
    res.json(lm.getStatus());
});

app.post('/api/system/logs/rotate', async (req, res) => {
    const result = await lm.rotate();
    res.json({ success: true, ...result });
});

app.post('/api/system/logs/clear', (req, res) => {
    const result = lm.clearAll();
    res.json({ success: true, ...result });
});

app.post('/api/system/secrets/sync', async (req, res) => {
    try {
        const { GITHUB_USER, GITHUB_ORG } = process.env;
        const repoName = path.basename(path.resolve(root, '..')); // bv. "athena-x"
        const owner = GITHUB_ORG || GITHUB_USER;
        const fullRepo = `${owner}/${repoName}`;

        console.log(`[SECRETS] Start sync voor repo: ${fullRepo}`);
        const logs = await sm.syncSecrets(fullRepo);
        res.json({ success: true, logs });
    } catch (e) {
        console.error("[SECRETS] Fout:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.get('/api/projects', (req, res) => {
    res.json(projectCtrl.list());
});

app.get('/api/sites', (req, res) => {
    res.json(siteCtrl.list());
});

app.get('/api/projects/:id/files', (req, res) => {
    try {
        res.json(projectCtrl.getFiles(req.params.id));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/projects/:id/content', (req, res) => {
    try {
        res.json(projectCtrl.getContent(req.params.id));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/sitetypes', (req, res) => {
    try {
        const sitetypes = getExistingSiteTypes();
        res.json(sitetypes);
    } catch (e) {
        res.status(500).json([]);
    }
});

app.get('/api/layouts/:sitetype', (req, res) => {
    const { sitetype } = req.params;
    // We moeten zoeken in beide tracks
    let dir = path.join(root, '3-sitetypes', 'docked', sitetype, 'web');
    if (!fs.existsSync(dir)) {
        dir = path.join(root, '3-sitetypes', 'autonomous', sitetype, 'web');
    }

    if (!fs.existsSync(dir)) return res.json([]);
    const layouts = fs.readdirSync(dir).filter(f => fs.statSync(path.join(dir, f)).isDirectory());
    res.json(layouts);
});

app.get('/api/styles', (req, res) => {
    const dir = path.join(root, '2-templates/boilerplate/docked/css');
    if (!fs.existsSync(dir)) return res.json([]);
    const styles = fs.readdirSync(dir).filter(f => f.endsWith('.css')).map(f => f.replace('.css', ''));
    res.json(styles);
});

app.get('/api/todo', (req, res) => {
    const todoPath = path.join(root, 'TASKS/_TODO.md');
    if (fs.existsSync(todoPath)) {
        res.json({ content: fs.readFileSync(todoPath, 'utf8') });
    } else { res.status(404).json({ error: "TODO.md niet gevonden" }); }
});

app.get('/api/roadmaps', (req, res) => {
    const roadmapPath = path.join(root, 'config/roadmaps.json');
    if (fs.existsSync(roadmapPath)) {
        res.json(JSON.parse(fs.readFileSync(roadmapPath, 'utf8')));
    } else { res.status(404).json({ error: "Roadmaps niet gevonden" }); }
});

app.get('/api/docs/:filename', (req, res) => {
    const docPath = path.join(root, 'docs', req.params.filename);
    if (fs.existsSync(docPath)) {
        res.json({ content: fs.readFileSync(docPath, 'utf8') });
    } else { res.status(404).json({ error: "Document niet gevonden" }); }
});

app.get('/api/system-status', (req, res) => {
    try {
        const output = execSync('df -h /').toString().trim().split('\n');
        const stats = output[1].split(/\s+/);
        res.json({ size: stats[1], used: stats[2], avail: stats[3], percent: stats[4] });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/remote-repos', async (req, res) => {
    try {
        const { GITHUB_USER, GITHUB_PAT, GITHUB_ORG } = process.env;
        const owners = [...new Set([GITHUB_ORG, GITHUB_USER].filter(Boolean))];
        let allRepos = [];

        console.log(`[GITHUB] Ophalen repos voor: ${owners.join(', ')}`);

        for (const owner of owners) {
            try {
                const output = execSync(`gh repo list ${owner} --limit 100 --json name,owner,url,isPrivate,updatedAt`, {
                    env: { ...process.env, GH_TOKEN: GITHUB_PAT },
                    encoding: 'utf8',
                    stdio: ['ignore', 'pipe', 'pipe']
                });
                const repos = JSON.parse(output);
                console.log(`[GITHUB] ${repos.length} repos gevonden voor ${owner}`);
                allRepos = [...allRepos, ...repos.map(r => ({
                    name: r.name,
                    fullName: `${r.owner.login}/${r.name}`,
                    url: r.url,
                    isPrivate: r.isPrivate,
                    updatedAt: r.updatedAt,
                    owner: r.owner.login
                }))];
            } catch (err) {
                const stderr = err.stderr ? err.stderr.toString() : err.message;
                console.error(`[GITHUB] Fout bij ${owner}:`, stderr);
            }
        }

        // Verwijder duplicaten (indien user == org)
        const uniqueRepos = Array.from(new Map(allRepos.map(item => [item.fullName, item])).values());
        res.json(uniqueRepos);
    } catch (e) {
        console.error("[API] Remote repos error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/config', (req, res) => {
    let saPath = path.join(root, 'sheet-service-account.json');
    if (!fs.existsSync(saPath)) saPath = path.join(root, 'service-account.json');
    let email = 'athena-cms-sheet-write@gen-lang-client-0519605634.iam.gserviceaccount.com';
    if (fs.existsSync(saPath)) {
        try {
            const saData = JSON.parse(fs.readFileSync(saPath, 'utf8'));
            if (saData.client_email) email = saData.client_email;
        } catch (e) { }
    }
    res.json({ serviceAccountEmail: email });
});

app.get('/api/settings', (req, res) => {
    const envPath = path.join(root, '.env');
    const settings = {};
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        content.split('\n').forEach(line => {
            const [key, ...value] = line.split('=');
            if (key && !key.startsWith('#')) {
                settings[key.trim()] = value.join('=').trim();
            }
        });
    }
    res.json(settings);
});

app.post('/api/settings', (req, res) => {
    try {
        const newSettings = req.body;
        const envPath = path.join(root, '.env');
        let envContent = '';

        if (fs.existsSync(envPath)) {
            envContent = fs.readFileSync(envPath, 'utf8');
        }

        let lines = envContent.split('\n');

        for (const [key, value] of Object.entries(newSettings)) {
            let found = false;
            lines = lines.map(line => {
                if (line.trim().startsWith(`${key}=`)) {
                    found = true;
                    return `${key}=${value}`;
                }
                return line;
            });

            if (!found && key.trim() !== '') {
                lines.push(`${key}=${value}`);
            }
        }

        fs.writeFileSync(envPath, lines.join('\n'));

        // Herlaad process.env voor de huidige sessie
        Object.assign(process.env, newSettings);

        res.json({ success: true, message: 'Instellingen succesvol bijgewerkt in .env' });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- PAYMENTS ---
app.post('/api/payments/create-session', async (req, res) => {
    try {
        const { projectName, cart, successUrl, cancelUrl } = req.body;
        console.log(`💳 Betalingsverzoek voor ${projectName} (${cart.length} items)`);
        
        const session = await paymentCtrl.createStripeSession(projectName, cart, successUrl, cancelUrl);
        res.json({ success: true, url: session.url });
    } catch (e) {
        console.error("❌ Stripe Session Error:", e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- ACTIONS ---

app.post('/api/projects/create', (req, res) => {
    try {
        res.json(projectCtrl.create(req.body.projectName));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// Data Bron van Site genereren
app.post('/api/projects/create-from-site', async (req, res) => {
    try {
        const { sourceSiteName, targetProjectName } = req.body;
        res.json(projectCtrl.createFromSite(sourceSiteName, targetProjectName));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- ROUTES ---

// 1. Upload Bestanden (Multiple)
app.post('/api/projects/:id/upload', upload.array('files'), (req, res) => {
    try {
        console.log(`[UPLOAD] ${req.files.length} bestand(en) geupload voor project ${req.params.id}`);
        res.json({ success: true, message: `${req.files.length} bestand(en) succesvol geüpload.` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// 2. Tekst Toevoegen (Append)
app.post('/api/projects/:id/add-text', (req, res) => {
    try {
        const { id } = req.params;
        const { text, filename } = req.body;
        res.json(projectCtrl.addText(id, text, filename));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// 3. URLs Opslaan
app.post('/api/projects/:id/save-urls', (req, res) => {
    try {
        const { id } = req.params;
        const { urls } = req.body;
        res.json(projectCtrl.saveUrls(id, urls));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/create', async (req, res) => {
    try {
        res.json(await siteCtrl.create(req.body));
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- VARIANT GENERATOR ---
app.get('/api/sites/:id/theme-info', (req, res) => {
    try {
        const { id } = req.params;
        const siteDir = path.resolve(root, '../sites', id);
        if (!fs.existsSync(siteDir)) {
            return res.status(404).json({ error: 'Site niet gevonden' });
        }

        // Get available themes
        const themesDir = path.join(root, '2-templates/boilerplate/docked/css');
        const themes = fs.existsSync(themesDir)
            ? fs.readdirSync(themesDir).filter(f => f.endsWith('.css')).map(f => f.replace('.css', ''))
            : [];

        // Detect current theme
        let currentTheme = null;
        const indexCss = path.join(siteDir, 'src/index.css');
        if (fs.existsSync(indexCss)) {
            const content = fs.readFileSync(indexCss, 'utf8');
            const match = content.match(/@import\s+["']\.\/css\/([a-z0-9-]+)\.css["']/);
            if (match) currentTheme = match[1];
        }
        if (!currentTheme) {
            const mainJsx = path.join(siteDir, 'src/main.jsx');
            if (fs.existsSync(mainJsx)) {
                const content = fs.readFileSync(mainJsx, 'utf8');
                const match = content.match(/import\s+['"]\.\/css\/([a-z0-9-]+)\.css['"]/);
                if (match) currentTheme = match[1];
            }
        }

        res.json({ themes, currentTheme });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/sites/:id/generate-variants', async (req, res) => {
    try {
        const { id } = req.params;
        const { styles } = req.body;

        console.log(`[VARIANT] Generating variants for: ${id} (styles: ${styles ? styles.join(', ') : 'all'})`);

        const tool = path.join(root, '5-engine', 'variant-generator.js');
        const args = [tool, id];
        if (styles && styles.length > 0) {
            args.push('--styles', styles.join(','));
        }

        const output = execSync(`"${process.execPath}" ${args.map(a => `"${a}"`).join(' ')}`, {
            cwd: root,
            env: { ...process.env }
        }).toString();

        console.log(`[VARIANT] Output:`, output);
        res.json({ success: true, message: `Varianten succesvol gegenereerd voor ${id}!`, details: output });
    } catch (e) {
        const stderr = e.stderr ? e.stderr.toString() : e.message;
        console.error(`[VARIANT] Fout:`, stderr);
        res.status(500).json({ success: false, error: stderr });
    }
});

app.post('/api/projects/:id/scrape', async (req, res) => {
    try {
        const { id } = req.params;
        const { inputFile } = req.body;
        const tool = path.join(root, '5-engine', 'athena-scraper.js');
        console.log(`[SCRAPER] Gestart voor: ${id} (file: ${inputFile})`);

        // Gebruik process.execPath om de exact zelfde Node-versie te forceren
        const output = execSync(`"${process.execPath}" "${tool}" "${id}" "${inputFile}"`, {
            cwd: root,
            env: { ...process.env }
        }).toString();
        res.json({ success: true, message: 'Website tekst succesvol binnengehaald!', details: output });
    } catch (e) {
        const stderr = e.stderr ? e.stderr.toString() : e.message;
        console.error(`[SCRAPER] Fout:`, stderr);
        res.status(500).json({ success: false, error: stderr });
    }
});

app.post('/api/projects/:id/auto-provision', async (req, res) => {
    try {
        const { id } = req.params;
        const tool = path.join(root, '5-engine', 'auto-sheet-provisioner.js');
        console.log(`Auto-provisioning gestart voor: ${id}`);
        const output = execSync(`"${process.execPath}" "${tool}" "${id}"`, { cwd: root }).toString();
        res.json({ success: true, message: 'Google Sheet succesvol aangemaakt!', details: output });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/projects/:id/link-sheet', async (req, res) => {
    try {
        const { id } = req.params;
        const { sheetUrl } = req.body;
        const tool = path.join(root, '5-engine', 'generate-url-sheet.js');
        execSync(`"${process.execPath}" "${tool}" "${id}" "${sheetUrl}"`, { cwd: root });
        res.json({ success: true, message: 'Sheet gekoppeld!' });
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/projects/:id/sync-site-to-sheet', async (req, res) => {
    try {
        res.json(await siteCtrl.syncToSheet(req.params.id));
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/sync-to-sheets/:id', async (req, res) => {
    try {
        res.json(await siteCtrl.syncToSheet(req.params.id));
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/pull-from-sheets/:id', async (req, res) => {
    try {
        res.json(await siteCtrl.pullFromSheet(req.params.id));
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/projects/:id/reverse-sync', async (req, res) => {
    try {
        const { id } = req.params;
        // Probeer beide varianten: [id] en [id]-site
        let siteDir = path.join(root, '../sites', id);
        if (!fs.existsSync(siteDir)) {
            siteDir = path.join(root, '../sites', `${id}-site`);
        }

        if (!fs.existsSync(siteDir)) {
            throw new Error(`Site directory niet gevonden voor project ${id} (geprobeerd: ${id} en ${id}-site)`);
        }

        const siteDataDir = path.join(siteDir, 'src', 'data');
        const targetDir = path.join(root, '../input', id, 'tsv-data');
        const tool = path.join(root, '5-engine', 'sync-json-to-tsv.js');

        console.log(`[REVERSE-SYNC] ${siteDataDir} -> ${targetDir}`);

        execSync(`"${process.execPath}" "${tool}" "${siteDataDir}" "${targetDir}" --auto`, {
            cwd: root,
            env: { ...process.env }
        });
        res.json({ success: true });
    } catch (e) {
        console.error(`[REVERSE-SYNC] Fout:`, e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/projects/:id/upload-data', async (req, res) => {
    try {
        const { id } = req.params;
        let siteDir = path.join(root, '../sites', id);
        if (!fs.existsSync(siteDir)) {
            siteDir = path.join(root, '../sites', `${id}-site`);
        }

        const urlSheetPath = path.join(siteDir, 'project-settings', 'url-sheet.json');
        if (!fs.existsSync(urlSheetPath)) {
            throw new Error(`url-sheet.json niet gevonden op ${urlSheetPath}`);
        }

        const urlData = JSON.parse(fs.readFileSync(urlSheetPath, 'utf8'));
        const sheetUrl = Object.values(urlData)[0].editUrl;
        const saPath = fs.existsSync(path.join(root, 'sheet-service-account.json')) ? 'sheet-service-account.json' : 'service-account.json';
        const tool = path.join(root, '5-engine', 'sync-tsv-to-sheet.js');

        console.log(`[UPLOAD-DATA] Syncing ${id} to ${sheetUrl} using ${saPath}`);

        execSync(`"${process.execPath}" "${tool}" "${id}" "${sheetUrl}" "${saPath}"`, {
            cwd: root,
            env: { ...process.env }
        });
        res.json({ success: true });
    } catch (e) {
        console.error(`[UPLOAD-DATA] Fout:`, e.message);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/projects/:id/rename', async (req, res) => {
    try {
        const { id } = req.params;
        const { newName } = req.body;
        const helper = path.join(root, '5-engine', 'athena-mcp-helper.js');
        const sitesDir = path.join(root, 'sites');
        const projects = fs.readdirSync(sitesDir).filter(f => fs.statSync(path.join(sitesDir, f)).isDirectory() && f !== '.git');
        const index = projects.indexOf(id) + 1;

        if (index === 0) throw new Error("Project niet gevonden in sites lijst.");

        execSync(`"${process.execPath}" "${helper}" "rename-site-wizard.js" "${index}" "${newName}"`, { cwd: root });
        res.json({ success: true, message: `Project succesvol hernoemd naar ${newName}!` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/projects/remote-delete', async (req, res) => {
    try {
        const { fullName } = req.body;
        const { GITHUB_PAT, GITHUB_USER } = process.env;

        // --- VEILIGHEIDSCHECK: HOOFDREPO MAG NOOIT WEG ---
        const protectedRepo = `${GITHUB_USER}/athena-cms`;
        if (fullName.toLowerCase() === protectedRepo.toLowerCase()) {
            console.warn(`[SECURITY] Poging tot verwijderen van hoofdrepo geblokkeerd: ${fullName}`);
            return res.status(403).json({ success: false, error: "De hoofdrepository 'athena-cms' is beveiligd en kan niet worden verwijderd via het dashboard." });
        }

        console.log(`[GITHUB] Request om repo te verwijderen: ${fullName}`);

        // Voer het delete commando uit met het token
        execSync(`gh repo delete ${fullName} --yes`, {
            env: { ...process.env, GH_TOKEN: GITHUB_PAT },
            stdio: ['ignore', 'pipe', 'pipe']
        });

        console.log(`[GITHUB] Repo succesvol verwijderd: ${fullName}`);
        res.json({ success: true, message: `Repository ${fullName} verwijderd.` });
    } catch (e) {
        const stderr = e.stderr ? e.stderr.toString() : e.message;
        console.error(`[GITHUB] Verwijder fout voor ${req.body.fullName}:`, stderr);
        res.status(500).json({ success: false, error: stderr });
    }
});

app.post('/api/projects/:id/delete', async (req, res) => {
    const { id } = req.params;
    const { deleteSite, deleteData, deleteRemote } = req.body;

    try {
        console.log(`Deleting project ${id}: site=${deleteSite}, data=${deleteData}, remote=${deleteRemote}`);

        let logs = [];

        // 1. Lokale verwijdering
        if (deleteSite || deleteData) {
            const result = deleteLocalProject(id, deleteSite, deleteData);
            logs = [...logs, ...result.logs];
        }

        // 2. Remote verwijdering
        if (deleteRemote) {
            try {
                // De helper functie deleteRemoteRepo probeert nu de org en user targets.
                const remoteResult = await deleteRemoteRepo(id);
                logs.push(`✅ ${remoteResult.message}`);
            } catch (e) {
                logs.push(`ℹ️ Geen remote repo verwijderd: ${e.message}`);
            }
        }

        res.json({ success: true, logs });
    } catch (e) {
        console.error("Delete failed:", e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/sites/update-deployment', (req, res) => {
    try {
        const { projectName, status, liveUrl, repoUrl } = req.body;
        const projectDir = path.join(root, '../sites', projectName);
        const settingsDir = path.join(projectDir, 'project-settings');
        const deployFile = path.join(settingsDir, 'deployment.json');

        if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });

        const config = {
            deployedAt: new Date().toISOString(),
            repoUrl,
            liveUrl,
            status
        };

        fs.writeFileSync(deployFile, JSON.stringify(config, null, 2));
        res.json({ success: true, message: `Status voor ${projectName} bijgewerkt naar ${status}` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/deploy', async (req, res) => {
    try {
        const { projectName, commitMsg } = req.body;
        res.json(await siteCtrl.deploy(projectName, commitMsg));
    } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/projects/:id/prompts', (req, res) => {
    try {
        const { id } = req.params;
        const filePath = path.join(root, '../input', id, 'image-gen', 'image-prompts.tsv');
        if (!fs.existsSync(filePath)) return res.json([]);

        const content = fs.readFileSync(filePath, 'utf8');
        const lines = content.trim().split('\n');
        if (lines.length < 2) return res.json([]);

        const headers = lines[0].split('\t');
        const prompts = lines.slice(1).map(line => {
            const cols = line.split('\t');
            const obj = {};
            headers.forEach((h, i) => obj[h] = cols[i]);
            return obj;
        });
        res.json(prompts);
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/run-script', (req, res) => {
    const { script, args } = req.body;
    const scriptPath = path.join(root, '5-engine', script);
    const child = spawn(process.execPath, [scriptPath, ...args], { stdio: 'inherit' });

    child.on('close', (code) => {
        if (code === 0) {
            res.json({ success: true, message: "Script succesvol voltooid." });
        } else {
            res.status(500).json({ success: false, error: `Script eindigde met foutcode ${code}` });
        }
    });
});

app.post('/api/generate-overview', (req, res) => {
    try {
        res.json(siteCtrl.runScript('generate-sites-overview.js', []));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- SERVER MANAGEMENT API ---

app.get('/api/servers/check/:port', (req, res) => {
    const { port } = req.params;
    try {
        const active = pm.listActive();
        if (active[port]) return res.json({ online: true });
        
        // Fallback check
        execSync(`fuser ${port}/tcp`, { stdio: 'ignore' });
        res.json({ online: true });
    } catch (e) {
        res.json({ online: false });
    }
});

app.post('/api/servers/stop/:type', async (req, res) => {
    const { type } = req.params;
    let port;
    if (type === 'dock') port = process.env.DOCK_PORT || 5002;
    if (type === 'layout') port = process.env.LAYOUT_EDITOR_PORT || 5003;
    if (type === 'media') port = process.env.MEDIA_MAPPER_PORT || 5004;
    if (type === 'preview') port = process.env.PREVIEW_PORT || 5000;
    if (type === 'dashboard') port = process.env.DASHBOARD_PORT || 5001;

    if (port) {
        const stopped = await pm.stopProcessByPort(port);
        res.json({ success: true, message: stopped ? `Server ${type} op poort ${port} gestopt.` : "Server was waarschijnlijk al gestopt." });
    } else {
        res.status(400).json({ error: "Onbekend server type" });
    }
});

// GET ALL ACTIVE SITE SERVERS (detect via registry and fallback)
app.get('/api/servers/active', (req, res) => {
    try {
        // 1. Get managed processes
        const active = pm.listActive();
        const activeMap = new Map(); // Use Map to prevent duplicates (port as key)

        // Helper to add server to map
        const addServer = (port, info) => {
            if (!activeMap.has(port)) {
                activeMap.set(port, info);
            }
        };

        // Add managed processes first
        for (const port in active) {
            const info = active[port];
            addServer(parseInt(port), {
                siteName: info.id,
                port: parseInt(port),
                pid: info.pid,
                type: info.type,
                url: info.type === 'preview' ? `http://localhost:${port}/${info.id}/` : `http://localhost:${port}/`
            });
        }

        // 2. Discover unmanaged processes (started via CLI)
        const sitesDir = path.resolve(root, '../sites');
        if (fs.existsSync(sitesDir)) {
            const sites = fs.readdirSync(sitesDir).filter(f => fs.statSync(path.join(sitesDir, f)).isDirectory() && !f.startsWith('.'));
            
            for (const site of sites) {
                const siteDir = path.join(sitesDir, site);
                const port = getSitePort(site, siteDir); // Reuse existing helper

                // Skip if already found via ProcessManager
                if (activeMap.has(port)) continue;

                // Check if port is in use
                try {
                    // fuser returns exit code 0 if socket is open, 1 if not
                    execSync(`fuser ${port}/tcp`, { stdio: 'ignore' });
                    
                    // If we get here, the port is open
                    addServer(port, {
                        siteName: site,
                        port: port,
                        pid: 'external', // Unknown PID
                        type: 'preview', // Assume preview/dev server
                        url: `http://localhost:${port}/${site}/`
                    });
                } catch (e) {
                    // Port not in use, skip
                }
            }
        }

        const activeServers = Array.from(activeMap.values());
        res.json({ servers: activeServers });
    } catch (e) {
        console.error("Error in /api/servers/active:", e);
        res.status(500).json({ error: e.message });
    }
});

// STOP A SPECIFIC SERVER BY PORT
app.post('/api/servers/kill/:port', async (req, res) => {
    const { port } = req.params;
    try {
        await pm.stopProcessByPort(port);
        res.json({ success: true, message: `Server on port ${port} stopped` });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/start-layout-server', async (req, res) => {
    try {
        const port = process.env.LAYOUT_EDITOR_PORT || 5003;
        await pm.stopProcessByPort(port);
        pm.startProcess('layout-editor', 'editor', port, process.execPath, ['5-engine/layout-visualizer.js'], { cwd: root });
        res.json({ success: true, message: `Layout Editor starting on port ${port}...` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: "Could not spawn process" });
    }
});

app.post('/api/start-media-server', async (req, res) => {
    try {
        const port = process.env.MEDIA_MAPPER_PORT || 5004;
        await pm.stopProcessByPort(port);
        pm.startProcess('media-mapper', 'editor', port, process.execPath, ['5-engine/media-visualizer.js'], { cwd: root });
        res.json({ success: true, message: `Media Mapper starting on port ${port}...` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: "Could not spawn process" });
    }
});

app.post('/api/start-dock', async (req, res) => {
    try {
        const dockDir = path.join(root, '..', 'dock');
        const port = process.env.DOCK_PORT || 5002;

        await pm.stopProcessByPort(port);

        // NIEUW: Check voor node_modules in dock
        if (!fs.existsSync(path.join(dockDir, 'node_modules'))) {
            console.log("📦 node_modules ontbreken in dock, installeren...");
            execSync('pnpm install', { cwd: dockDir, stdio: 'inherit' });
        }

        pm.startProcess('athena-dock', 'dock', port, 'pnpm', ['dev', '--port', port.toString(), '--host'], { cwd: dockDir });

        res.json({ success: true, message: `Athena Dock starting on port ${port}...` });
    } catch (e) {
        console.error(e);
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/dev/start', async (req, res) => {
    try {
        const { projectName } = req.body;
        const dockPort = process.env.DOCK_PORT || 5002;
        const previewPort = process.env.PREVIEW_PORT || 5000;

        console.log(`[DEV] Starting Full Environment for ${projectName}`);

        // 1. Start Dock
        const dockDir = path.join(root, '..', 'dock');
        await pm.stopProcessByPort(dockPort);
        pm.startProcess('athena-dock', 'dock', dockPort, 'pnpm', ['dev', '--port', dockPort.toString(), '--host'], { cwd: dockDir });

        // 2. Start Site Preview
        const siteDir = path.join(root, '../sites', projectName);
        if (fs.existsSync(siteDir)) {
            await pm.stopProcessByPort(previewPort);
            pm.startProcess(projectName, 'preview', previewPort, 'pnpm', ['dev', '--port', previewPort.toString(), '--host'], { cwd: siteDir });
        }

        res.json({
            success: true,
            dockUrl: `http://localhost:${dockPort}`,
            siteUrl: `http://localhost:${previewPort}`
        });
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

app.post('/api/maintenance', async (req, res) => {
    const { action } = req.body;
    try {
        let output = (action === 'pnpm-prune') ? execSync('pnpm store prune', { cwd: root }).toString() : "Cleanup done";
        res.json({ success: true, message: output });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- HELPER: GET SITE PORT ---
function getSitePort(siteId, siteDir) {
    // 1. Check centraal register
    const registryPath = path.join(root, 'config/site-ports.json');
    if (fs.existsSync(registryPath)) {
        try {
            const ports = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
            if (ports[siteId]) return ports[siteId];
        } catch (e) { }
    }

    // 2. Scan vite.config.js
    const configPath = path.join(siteDir, 'vite.config.js');
    if (fs.existsSync(configPath)) {
        const content = fs.readFileSync(configPath, 'utf8');
        const match = content.match(/port:\s*(\d+)/);
        if (match) return parseInt(match[1]);
    }

    return 5000; // Fallback (sandbox)
}

app.post('/api/sites/:id/preview', async (req, res) => {
    const { id } = req.params;
    const siteDir = path.join(root, '../sites', id);
    const pnpmPath = 'pnpm';

    if (!fs.existsSync(siteDir)) {
        return res.status(404).json({ success: false, error: 'Site niet gevonden' });
    }

    const previewPort = getSitePort(id, siteDir);

    // Stop alleen andere processen op DEZE specifieke poort
    await pm.stopProcessByPort(previewPort);

    console.log(`Starting preview for ${id} on port ${previewPort}...`);

    pm.startProcess(id, 'preview', previewPort, pnpmPath, ['dev', '--port', previewPort.toString(), '--host'], {
        cwd: siteDir,
        env: { ...process.env }
    });

    // Determine the correct base URL
    let baseUrl = `/${id}/`;
    const deployFile = path.join(siteDir, 'project-settings', 'deployment.json');
    if (fs.existsSync(deployFile)) {
        try {
            const deployData = JSON.parse(fs.readFileSync(deployFile, 'utf8'));
            if (deployData.liveUrl) {
                const url = new URL(deployData.liveUrl);
                baseUrl = url.pathname;
                if (!baseUrl.endsWith('/')) baseUrl += '/';
            }
        } catch (e) { }
    }

    res.json({ success: true, url: `http://localhost:${previewPort}${baseUrl}` });
});

// --- INSTALLATION MANAGEMENT ---
const activeInstalls = new Set();

app.get('/api/sites/:name/status', (req, res) => {
    const { name } = req.params;
    const siteDir = path.join(root, '../sites', name);
    const nodeModules = path.join(siteDir, 'node_modules');

    const isInstalling = activeInstalls.has(name);
    const isInstalled = fs.existsSync(nodeModules);

    res.json({ isInstalling, isInstalled });
});

app.post('/api/sites/:name/install', (req, res) => {
    const { name } = req.params;
    const siteDir = path.join(root, '../sites', name);

    if (activeInstalls.has(name)) {
        return res.json({ success: true, message: "Installatie is al bezig..." });
    }

    if (!fs.existsSync(siteDir)) {
        return res.status(404).json({ success: false, error: "Site niet gevonden" });
    }

    console.log(`[INSTALL] Start pnpm install voor ${name}...`);
    activeInstalls.add(name);

    const logPath = getLogPath(`install_${name}`);
    const out = fs.openSync(logPath, 'a');

    const child = spawn('pnpm', ['install'], {
        cwd: siteDir,
        stdio: ['ignore', out, out],
        env: { ...process.env }
    });

    const cleanup = (code) => {
        if (activeInstalls.has(name)) {
            activeInstalls.delete(name);
            console.log(`[INSTALL] ${name} klaar (code ${code})`);
        }
    };

    child.on('close', cleanup);
    child.on('exit', cleanup);
    child.on('error', (err) => {
        cleanup('err');
        console.error(`[INSTALL] Fout bij ${name}:`, err);
    });

    res.json({ success: true, message: "Installatie gestart" });
});

// --- SITETYPE WIZARD API ENDPOINTS ---

// Genereer datastructuur voorstel
app.post('/api/sitetype/generate-structure', async (req, res) => {
    try {
        const { businessDescription } = req.body;
        if (!businessDescription) {
            return res.status(400).json({ error: "Business beschrijving is verplicht" });
        }

        const structure = await generateDataStructureAPI(businessDescription);
        res.json({ success: true, structure });
    } catch (error) {
        console.error('Sitetype structure generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Genereer parser instructies
app.post('/api/sitetype/generate-parser', async (req, res) => {
    try {
        const { table } = req.body;
        if (!table) {
            return res.status(400).json({ error: "Tabel data is verplicht" });
        }

        const instructions = await generateParserInstructionsAPI(table);
        res.json({ success: true, instructions });
    } catch (error) {
        console.error('Parser instructions generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Genereer design suggesties
app.post('/api/sitetype/generate-design', async (req, res) => {
    try {
        const { businessDescription } = req.body;
        if (!businessDescription) {
            return res.status(400).json({ error: "Business beschrijving is verplicht" });
        }

        const design = await generateDesignSuggestionAPI(businessDescription);
        res.json({ success: true, design });
    } catch (error) {
        console.error('Design generation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Genereer complete sitetype
app.post('/api/sitetype/create', async (req, res) => {
    try {
        const { name, description, dataStructure, designSystem, track } = req.body;
        if (!name || !description || !dataStructure) {
            return res.status(400).json({ error: "Naam, beschrijving en datastructuur zijn verplicht" });
        }

        const result = await generateCompleteSiteType(name, description, dataStructure, designSystem, track || 'docked');
        res.json(result);
    } catch (error) {
        console.error('Sitetype creation error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Sitetype van Site genereren
app.post('/api/sitetype/create-from-site', async (req, res) => {
    try {
        const { sourceSiteName, targetSitetypeName } = req.body;
        if (!sourceSiteName || !targetSitetypeName) {
            return res.status(400).json({ error: "Bron site en doel sitetype naam zijn verplicht" });
        }

        const tool = path.join(root, '5-engine', 'sitetype-from-site-generator.js');
        const output = execSync(`"${process.execPath}" "${tool}" "${sourceSiteName}" "${targetSitetypeName}"`, {
            cwd: root,
            env: { ...process.env }
        }).toString();

        res.json({ success: true, message: `Sitetype '${targetSitetypeName}' succesvol gegenereerd van site '${sourceSiteName}'!`, details: output });
    } catch (e) {
        const stderr = e.stderr ? e.stderr.toString() : e.message;
        console.error(`[SITETYPE-FROM-SITE] Fout:`, stderr);
        res.status(500).json({ success: false, error: stderr });
    }
});

// Haal bestaande sitetypes op
app.get('/api/sitetype/existing', (req, res) => {
    try {
        const sitetypes = getExistingSiteTypes();
        res.json({ success: true, sitetypes });
    } catch (error) {
        console.error('Get existing sitetypes error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/sites/:id/update-data', (req, res) => {
    try {
        const { id } = req.params;
        const { table, rowId, field, value } = req.body;

        const filePath = path.join(root, '..', 'sites', id, 'src', 'data', `${table.toLowerCase()}.json`);

        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ success: false, error: `Tabel ${table} niet gevonden.` });
        }

        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        // Update de specifieke rij (op basis van ID of Index)
        let updated = false;
        if (Array.isArray(data)) {
            for (let i = 0; i < data.length; i++) {
                // We checken op 'id', 'uuid' of we gebruiken de index als rowId een nummer is
                if (data[i].id == rowId || data[i].uuid == rowId || i == rowId) {
                    data[i][field] = value;
                    updated = true;
                    break;
                }
            }
        }

        if (updated) {
            fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            console.log(`[DATA] Veld '${field}' in ${table} bijgewerkt voor site ${id}`);
            res.json({ success: true });
        } else {
            res.status(404).json({ success: false, error: "Rij niet gevonden." });
        }
    } catch (e) {
        res.status(500).json({ success: false, error: e.message });
    }
});

// --- STORAGE MANAGEMENT API ---

app.get('/api/storage/status', (req, res) => {
    try {
        const { siteName } = req.query;
        res.json(doctorCtrl.audit(siteName));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/storage/policy', (req, res) => {
    try {
        const { siteName, policy } = req.body;
        res.json(doctorCtrl.setPolicy(siteName, policy));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/storage/enforce', async (req, res) => {
    try {
        const { siteName } = req.body;
        res.json(await doctorCtrl.enforcePolicy(siteName));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/storage/prune-all', async (req, res) => {
    try {
        const auditResults = doctorCtrl.audit();
        const pruneActions = [];
        for (const resObj of auditResults) {
            if (resObj.policy === 'dormant' && resObj.hydration === 'hydrated') {
                const pruneRes = doctorCtrl.dehydrate(resObj.site);
                pruneActions.push({ site: resObj.site, ...pruneRes });
            }
        }
        res.json({ success: true, actions: pruneActions });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- MARKETING API ---

app.post('/api/marketing/generate-seo', async (req, res) => {
    try {
        const { projectName } = req.body;
        res.json(await marketingCtrl.generateSEO(projectName));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.post('/api/marketing/generate-blog', async (req, res) => {
    try {
        const { projectName, topic } = req.body;
        res.json(await marketingCtrl.generateBlog(projectName, topic));
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.listen(port, () => {
    console.log(`🔱 Athena Dashboard running at http://localhost:${port}`);
});
