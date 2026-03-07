import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import multer from 'multer';
import cors from 'cors';
import 'dotenv/config';

// Managers & Libs
import { AthenaConfigManager } from '../5-engine/lib/ConfigManager.js';
import { AthenaProcessManager } from '../5-engine/lib/ProcessManager.js';
import { AthenaLogManager } from '../5-engine/lib/LogManager.js';
import { AthenaSecretManager } from '../5-engine/lib/SecretManager.js';
import { ExecutionService } from '../5-engine/lib/ExecutionService.js';

// Controllers
import { ProjectController } from '../5-engine/controllers/ProjectController.js';
import { SiteController } from '../5-engine/controllers/SiteController.js';
import { DoctorController } from '../5-engine/controllers/DoctorController.js';
import { PaymentController } from '../5-engine/controllers/PaymentController.js';
import { MarketingController } from '../5-engine/controllers/MarketingController.js';
import { SystemController } from '../5-engine/controllers/SystemController.js';
import { ToolController } from '../5-engine/controllers/ToolController.js';
import { ServerController } from '../5-engine/controllers/ServerController.js';
import { GithubController } from '../5-engine/controllers/GithubController.js';

import {
    generateDataStructureAPI,
    generateParserInstructionsAPI,
    generateDesignSuggestionAPI,
    generateCompleteSiteType,
    getExistingSiteTypes
} from './sitetype-api.js';
import { generateWithAI } from '../5-engine/core/ai-engine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');

// --- INITIALIZATION ---
const configManager = new AthenaConfigManager(root);
const pm = new AthenaProcessManager(root);
const lm = new AthenaLogManager(root);
const sm = new AthenaSecretManager(root);
const execService = new ExecutionService(configManager, lm);

const projectCtrl = new ProjectController(configManager, execService);
const siteCtrl = new SiteController(configManager, execService, pm);
const doctorCtrl = new DoctorController(configManager);
const paymentCtrl = new PaymentController(configManager);
const marketingCtrl = new MarketingController(configManager);
const systemCtrl = new SystemController(configManager, lm, sm, execService);
const toolCtrl = new ToolController(configManager, execService);
const serverCtrl = new ServerController(configManager, pm, execService);
const githubCtrl = new GithubController(configManager, execService);

const app = express();
const port = 5001; // Forceer dashboard op poort 5001 voor de Site Reviewer

// --- MULTER CONFIG ---
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

// --- MIDDLEWARE ---
app.use(express.json());
app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(root));

// --- STRATEGY CHAT API ---
app.post('/api/onboard/chat', async (req, res) => {
    const { history, companyName } = req.body;
    
    const systemPrompt = `
        Je bent de Digital Strategist van Athena CMS. Jouw doel is om een nieuwe klant (${companyName || 'onbekend'}) te helpen hun online strategie te bepalen.
        Focus op:
        1. Wie is de doelgroep?
        2. Wat zijn de USP's?
        3. Welke actie moet de bezoeker ondernemen?
        4. Welke data-tabellen zijn essentieel voor hun business?

        Stel korte, krachtige vragen. Wees professioneel maar toegankelijk.
        Antwoord in het Nederlands. Gebruik NOOIT markdown-titels (geen # of ##), alleen tekst en bullets.
    `;

    const fullPrompt = `${systemPrompt}\n\nINTERVIEW HISTORY:\n${history ? history.map(h => `${h.role}: ${h.content}`).join('\n') : ''}\n\nStrategist:`;

    try {
        const response = await generateWithAI(fullPrompt, { 
            isJson: false,
            modelStack: "gemini-3-flash-preview"
        });
        res.json({ response: response || "Excuses, ik kon geen antwoord genereren. Probeer het nog eens." });
    } catch (e) {
        console.error("Chat Error:", e.message);
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/onboard/finalize', async (req, res) => {
    const { companyName, history } = req.body;
    const safeName = companyName.toLowerCase().replace(/[^a-z0-9]/g, '-');
    const clientDir = path.join(root, 'input', safeName);
    
    const prompt = `
        Vat het volgende interview samen voor een technisch dossier.
        INTERVIEW:
        ${history.map(h => `${h.role}: ${h.content}`).join('\n')}

        Genereer een JSON object met:
        - "tagline": Korte slogan
        - "business_vertical": Branche type
        - "target_audience": Beschrijving doelgroep
        - "required_tables": Array van tabelnamen die nodig zijn
        - "design_preferences": Sfeerbeschrijving (Modern, Classic, etc.)
        - "summary": Een korte samenvatting voor de site-generator.
    `;

    try {
        const report = await generateWithAI(prompt, { isJson: true });
        if (!fs.existsSync(clientDir)) fs.mkdirSync(clientDir, { recursive: true });
        
        fs.writeFileSync(path.join(clientDir, 'discovery.json'), JSON.stringify(report, null, 2));
        res.json({ success: true, report });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- SYSTEM API ---
app.get('/api/system/config', (req, res) => res.json(systemCtrl.getConfig()));
app.get('/api/system/logs', (req, res) => res.json(systemCtrl.getLogsStatus()));
app.post('/api/system/logs/rotate', async (req, res) => res.json(await systemCtrl.rotateLogs()));
app.post('/api/system/logs/clear', (req, res) => res.json(systemCtrl.clearLogs()));
app.post('/api/system/secrets/sync', async (req, res) => res.json(await systemCtrl.syncSecrets()));
app.get('/api/system-status', (req, res) => res.json(systemCtrl.getSystemStatus()));
app.get('/api/config', (req, res) => res.json(systemCtrl.getSAConfig()));
app.get('/api/settings', (req, res) => res.json(systemCtrl.getSettings()));
app.post('/api/settings', (req, res) => res.json(systemCtrl.updateSettings(req.body)));

// --- PROJECT API ---
app.get('/api/projects', (req, res) => res.json(projectCtrl.list()));
app.get('/api/projects/:id/files', (req, res) => res.json(projectCtrl.getFiles(req.params.id)));
app.get('/api/projects/:id/content', (req, res) => res.json(projectCtrl.getContent(req.params.id)));
app.post('/api/projects/create', (req, res) => res.json(projectCtrl.create(req.body.projectName)));
app.post('/api/projects/create-from-site', async (req, res) => res.json(projectCtrl.createFromSite(req.body.sourceSiteName, req.body.targetProjectName)));
app.post('/api/projects/:id/upload', upload.array('files'), (req, res) => res.json({ success: true, message: `${req.files.length} bestand(en) geüpload.` }));
app.post('/api/projects/:id/add-text', (req, res) => res.json(projectCtrl.addText(req.params.id, req.body.text, req.body.filename)));
app.post('/api/projects/:id/save-urls', (req, res) => res.json(projectCtrl.saveUrls(req.params.id, req.body.urls)));
app.post('/api/projects/:id/delete', async (req, res) => res.json(await projectCtrl.deleteProject(req.params.id, req.body)));
app.post('/api/projects/:id/rename', async (req, res) => res.json(await projectCtrl.rename(req.params.id, req.body.newName)));
app.post('/api/projects/:id/link-sheet', async (req, res) => res.json(await siteCtrl.linkSheet(req.params.id, req.body.sheetUrl)));
app.post('/api/projects/:id/auto-provision', async (req, res) => res.json(await siteCtrl.autoProvision(req.params.id)));
app.post('/api/projects/:id/reverse-sync', async (req, res) => res.json(await projectCtrl.reverseSync(req.params.id)));
app.post('/api/projects/:id/upload-data', async (req, res) => res.json(await projectCtrl.uploadData(req.params.id)));
app.get('/api/remote-repos', async (req, res) => {
    try {
        res.json(await githubCtrl.listRepositories());
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});
app.post('/api/projects/remote-delete', async (req, res) => {
    try {
        res.json(await githubCtrl.deleteRepository(req.body.fullName));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// --- SITE API ---
app.get('/api/sites/all-deployments', (req, res) => res.json(siteCtrl.getAllDeployments()));
app.get('/api/sites', (req, res) => res.json(siteCtrl.list()));
app.get('/api/styles', (req, res) => res.json(siteCtrl.getStyles()));
app.get('/api/layouts/:track/:type', (req, res) => res.json(siteCtrl.getLayouts(`${req.params.track}/${req.params.type}`)));
app.post('/api/create', async (req, res) => res.json(await siteCtrl.create(req.body)));
app.post('/api/deploy', async (req, res) => res.json(await siteCtrl.deploy(req.body.projectName, req.body.commitMsg)));
app.get('/api/sites/:id/theme-info', (req, res) => res.json(siteCtrl.getThemeInfo(req.params.id)));
app.post('/api/sites/:id/update-data', (req, res) => res.json(siteCtrl.updateData(req.params.id, req.body)));
app.get('/api/sites/:name/status', (req, res) => res.json(siteCtrl.getStatus(req.params.name)));
app.post('/api/sites/:name/install', async (req, res) => res.json(await siteCtrl.install(req.params.name)));
app.post('/api/sites/:id/preview', async (req, res) => res.json(await siteCtrl.preview(req.params.id)));
app.post('/api/sites/update-deployment', (req, res) => res.json(siteCtrl.updateDeployment(req.body)));
app.post('/api/sites/:id/pull-from-sheet', async (req, res) => res.json(await siteCtrl.pullFromSheet(req.params.id)));
app.post('/api/sites/:id/sync-to-sheet', async (req, res) => res.json(await siteCtrl.syncToSheet(req.params.id)));

// --- TOOL API ---
app.post('/api/onboard', async (req, res) => res.json(toolCtrl.onboard(req.body.companyName, req.body.websiteUrl, req.body.clientEmail)));
app.post('/api/projects/:id/scrape', async (req, res) => res.json(toolCtrl.scrape(req.params.id, req.body.inputFile)));
app.post('/api/sites/:id/generate-variants', async (req, res) => res.json(toolCtrl.generateVariants(req.params.id, req.body.styles)));
app.post('/api/run-script', async (req, res) => res.json(await toolCtrl.runScript(req.body.script, req.body.args)));

app.post('/api/set-site', async (req, res) => {
    // Forward to Media Visualizer if it's running
    const port = configManager.get('ports.media') || 5004;
    try {
        const response = await fetch(`http://localhost:${port}/api/set-site`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(req.body)
        });
        const data = await response.json();
        res.json(data);
    } catch (e) {
        // Fallback: just return success if media server is not up
        res.json({ success: true, note: "Media server not reachable, but request accepted." });
    }
});

app.post('/api/sync-to-sheets/:id', async (req, res) => res.json(await siteCtrl.syncToSheet(req.params.id)));
app.post('/api/pull-from-sheets/:id', async (req, res) => res.json(await siteCtrl.pullFromSheet(req.params.id)));

// --- SERVER API ---
app.get('/api/servers/check/:port', (req, res) => res.json(serverCtrl.checkStatus(req.params.port)));
app.post('/api/servers/stop/:type', async (req, res) => res.json(await serverCtrl.stopByType(req.params.type)));
app.get('/api/servers/active', (req, res) => res.json({ servers: serverCtrl.getActive(req.hostname) }));
app.post('/api/servers/kill/:port', async (req, res) => res.json(await serverCtrl.kill(req.params.port)));
app.post('/api/start-layout-server', async (req, res) => res.json(await serverCtrl.startLayoutEditor()));
app.post('/api/start-media-server', async (req, res) => res.json(await serverCtrl.startMediaVisualizer(req.body.siteName)));
app.post('/api/start-dock', async (req, res) => res.json(await serverCtrl.startDock()));

// --- SITETYPE API ---
app.get('/api/sitetypes', (req, res) => res.json(getExistingSiteTypes()));
app.get('/api/sitetype/existing', (req, res) => res.json({ success: true, sitetypes: getExistingSiteTypes() }));
app.post('/api/sitetype/create-from-site', async (req, res) => res.json(await toolCtrl.createSitetypeFromSite(req.body.sourceSiteName, req.body.targetSitetypeName)));
app.post('/api/sitetype/generate-structure', async (req, res) => res.json({ success: true, structure: await generateDataStructureAPI(req.body.businessDescription) }));
app.post('/api/sitetype/generate-parser', async (req, res) => res.json({ success: true, instructions: await generateParserInstructionsAPI(req.body.table) }));
app.post('/api/sitetype/generate-design', async (req, res) => res.json({ success: true, design: await generateDesignSuggestionAPI(req.body.businessDescription) }));
app.post('/api/sitetype/create', async (req, res) => res.json(await generateCompleteSiteType(req.body.name, req.body.description, req.body.dataStructure, req.body.designSystem, req.body.track || 'docked')));

// --- STORAGE API ---
app.get('/api/storage/status', (req, res) => res.json(doctorCtrl.audit(req.query.siteName)));
app.post('/api/storage/policy', (req, res) => res.json(doctorCtrl.setPolicy(req.body.siteName, req.body.policy)));
app.post('/api/storage/enforce', async (req, res) => res.json(await doctorCtrl.enforcePolicy(req.body.siteName)));
app.post('/api/storage/prune-all', async (req, res) => {
    const auditResults = doctorCtrl.audit();
    const actions = auditResults.filter(r => r.policy === 'dormant' && r.hydration === 'hydrated').map(r => ({ site: r.site, ...doctorCtrl.dehydrate(r.site) }));
    res.json({ success: true, actions });
});

// --- MARKETING API ---
app.post('/api/marketing/generate-seo', async (req, res) => res.json(await marketingCtrl.generateSEO(req.body.projectName)));
app.post('/api/marketing/generate-blog', async (req, res) => res.json(await marketingCtrl.generateBlog(req.body.projectName, req.body.topic)));

// --- PAYMENT API ---
app.post('/api/payments/create-session', async (req, res) => res.json(await paymentCtrl.createStripeSession(req.body.projectName, req.body.cart, req.body.successUrl, req.body.cancelUrl)));

// --- ROADMAP & TODO API ---
app.get('/api/roadmaps', (req, res) => {
    const roadmapPath = path.join(root, 'factory/config/roadmaps.json');
    if (fs.existsSync(roadmapPath)) {
        try {
            const data = JSON.parse(fs.readFileSync(roadmapPath, 'utf8'));
            res.json(data);
        } catch (e) {
            res.status(500).json({ error: "Fout bij laden roadmaps.json: " + e.message });
        }
    } else {
        res.json({
            tracks: [
                {
                    title: "Roadmaps niet gevonden",
                    id: "not-found",
                    description: `Bestand niet gevonden op: ${roadmapPath}`,
                    difficulty: "N/A",
                    time: "N/A",
                    steps: []
                }
            ]
        });
    }
});

// --- BLUEPRINT API ---
app.get('/api/blueprints/:track/:name', (req, res) => {
    const { track, name } = req.params;
    const blueprintPath = path.join(root, 'factory/3-sitetypes', track, name, 'blueprint', `${name}.json`);
    if (fs.existsSync(blueprintPath)) {
        res.json(JSON.parse(fs.readFileSync(blueprintPath, 'utf8')));
    } else {
        res.status(404).json({ error: "Blueprint niet gevonden" });
    }
});

app.post('/api/blueprints/:track/:name', (req, res) => {
    const { track, name } = req.params;
    const blueprintPath = path.join(root, 'factory/3-sitetypes', track, name, 'blueprint', `${name}.json`);
    try {
        fs.writeFileSync(blueprintPath, JSON.stringify(req.body, null, 2));
        res.json({ success: true, message: "Blueprint succesvol opgeslagen." });
    } catch (e) {
        res.status(500).json({ error: "Kon blueprint niet opslaan: " + e.message });
    }
});

app.get('/api/todo', (req, res) => {
    const todoPath = path.join(root, 'factory/TASKS/_TODO.md');
    if (fs.existsSync(todoPath)) {
        res.json({ content: fs.readFileSync(todoPath, 'utf8') });
    } else {
        res.json({ content: "# TODO\n\n_TODO.md niet gevonden._" });
    }
});

app.listen(port, () => {
    console.log(`🔱 Athena Dashboard running at http://localhost:${port}`);
});
