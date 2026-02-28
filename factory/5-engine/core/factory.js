import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { provisionSheet } from '../auto-sheet-provisioner.js';
import { generateSectionComponent } from '../logic/standard-layout-generator.js';
import { Validator } from '../lib/validator.js';
import { QualityChecker } from '../lib/quality-check.js';
import { ThemeEngine } from '../lib/theme-engine.js';
import { AssetScavenger } from '../lib/AssetScavenger.js';
import * as recast from 'recast';
import * as babelParser from '@babel/parser';

import { AthenaConfigManager } from '../lib/ConfigManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const defaultCM = new AthenaConfigManager(path.resolve(__dirname, '../../..'));

// --- UTILITIES ---

export function validateProjectName(name) {
    return name.trim().toLowerCase()
        .replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

export function generateClientInstructions(projectDir, projectName, blueprint, configManager = defaultCM) {
    const templatePath = path.join(configManager.get('paths.templates'), 'docs/client-manual.md');
    const destPath = path.join(projectDir, 'HANDLEIDING_BEHEER.md');

    if (fs.existsSync(templatePath)) {
        let templateContent = fs.readFileSync(templatePath, 'utf8');
        let dynamicContent = "";
        if (blueprint.data_structure && Array.isArray(blueprint.data_structure)) {
            for (const table of blueprint.data_structure) {
                dynamicContent += `### Tabblad: \`${table.table_name}\`\n\n`;
                dynamicContent += `| Kolomnaam | Beschrijving |\n| :--- | :--- |\n`;
                if (table.columns && Array.isArray(table.columns)) {
                    for (const col of table.columns) {
                        const name = typeof col === 'object' ? col.name : col;
                        const desc = typeof col === 'object' ? (col.description || "Geen beschrijving.") : "Geen beschrijving.";
                        dynamicContent += `| \`${name}\` | ${desc} |\n`;
                    }
                }
                dynamicContent += `\n`;
            }
        }
        templateContent = templateContent.replace(/{{PROJECT_NAME}}/g, projectName)
            .replace(/{{BLUEPRINT_NAME}}/g, blueprint.blueprint_name)
            .replace(/{{DYNAMIC_CONTENT}}/g, dynamicContent);
        fs.writeFileSync(destPath, templateContent);
    }
}

export function generateReadme(projectDir, safeName, configManager = defaultCM) {
    const ORG = configManager.get('github.org') || configManager.get('github.user') || "athena-cms";
    const destPath = path.join(projectDir, 'README.md');
    const content = `https://${ORG}.github.io/${safeName}`;
    fs.writeFileSync(destPath, content);
}

export function scavengeAssets(projectDir, projectName) {
    const scavenger = new AssetScavenger(projectDir, projectName);
    scavenger.scavenge();
}

/**
 * Transformation Engine
 */
export class TransformationEngine {
    constructor(options = {}) {
        this.variables = options.variables || {};
        this.flags = options.flags || {};
    }

    transform(content, fileName) {
        let result = content;
        Object.entries(this.variables).forEach(([k, v]) => {
            result = result.replace(new RegExp(`{{${k}}}`, 'g'), v);
        });

        // Handle Conditional Blocks (Generic)
        const blocks = ['SHOP', 'NON_SHOP', 'DOCK', 'AUTONOMOUS'];
        blocks.forEach(block => {
            let isMatch = false;
            if (block === 'SHOP') isMatch = this.flags.isWebshop;
            if (block === 'NON_SHOP') isMatch = !this.flags.isWebshop;
            if (block === 'DOCK') isMatch = this.flags.isDocked;
            if (block === 'AUTONOMOUS') isMatch = !this.flags.isDocked;

            const startMarker = new RegExp(`\\/\\* {{${block}.*?_START}} \\*\\/`, 'g');
            const endMarker = new RegExp(`\\/\\* {{${block}.*?_END}} \\*\\/`, 'g');
            const jsxStartMarker = new RegExp(`{\\/\\* {{${block}.*?_START}} \\*\\/}`, 'g');
            const jsxEndMarker = new RegExp(`{\\/\\* {{${block}.*?_END}} \\*\\/}`, 'g');

            if (isMatch) {
                // Keep content, remove markers
                result = result.replace(startMarker, '').replace(endMarker, '')
                    .replace(jsxStartMarker, '').replace(jsxEndMarker, '');
            } else {
                // Remove entire block
                const blockRegex = new RegExp(`\\/\\* {{${block}.*?_START}} \\*\\/[\\s\\S]*?\\/\\* {{${block}.*?_END}} \\*\\/`, 'g');
                const jsxBlockRegex = new RegExp(`{\\/\\* {{${block}.*?_START}} \\*\\/}[\\s\\S]*?{\\/\\* {{${block}.*?_END}} \\*\\/}`, 'g');
                result = result.replace(blockRegex, '').replace(jsxBlockRegex, '');
            }
        });

        if (fileName.endsWith('.jsx')) {
            result = this.fixImports(result);
        }
        return result;
    }

    fixImports(content) {
        try {
            // Use Babel for JSX support
            const ast = recast.parse(content, {
                parser: {
                    parse: (code) => babelParser.parse(code, {
                        sourceType: 'module',
                        plugins: ['jsx', 'typescript']
                    })
                }
            });
            recast.visit(ast, {
                visitImportDeclaration(path) {
                    const source = path.node.source.value;
                    if (source.includes('shared/components/')) {
                        const comp = source.split('shared/components/').pop();
                        path.node.source.value = `./components/${comp}`;
                    }
                    if (source.includes('2-templates/components/')) {
                        const comp = source.split('2-templates/components/').pop();
                        path.node.source.value = `./${comp}`;
                    }
                    return false;
                }
            });
            return recast.print(ast).code;
        } catch (e) {
            // Robust Regex Fallback if AST fails
            return content.replace(/import\s+(.*?)\s+from\s+['"].*?shared\/components\/(.*?)['"]/g, (m, g1, g2) => `import ${g1} from './components/${g2}'`)
                .replace(/import\s+(.*?)\s+from\s+['"].*?2-templates\/components\/(.*?)['"]/g, (m, g1, g2) => `import ${g1} from './${g2}'`);
        }
    }
}

/**
 * Project Generator
 */
export class ProjectGenerator {
    constructor(config, configManager = defaultCM) {
        this.config = config;
        this.configManager = configManager;
        this.safeName = validateProjectName(config.projectName);
        this.projectDir = path.join(configManager.get('paths.sites'), this.safeName);
        this.tplRoot = configManager.get('paths.templates');
    }

    async run() {
        console.log(`\n🔱  Athena Generation: ${this.safeName}`);
        this.initDirs();
        this.resolvePaths();
        await this.handleProvisioning();
        this.generateData();
        this.copyBoilerplate();
        this.generateSpecialComponents();
        await this.finalize();
        console.log(`\n✨  PROJECT READY: sites/${this.safeName}`);
    }

    initDirs() {
        ['src/components/ui', 'src/data', 'project-settings', 'public/images', '.github/workflows'].forEach(d => fs.mkdirSync(path.join(this.projectDir, d), { recursive: true }));
    }

    resolvePaths() {
        const { siteType, layoutName, siteModel } = this.config;
        this.editorStrategy = fs.existsSync(path.join(this.configManager.get('paths.sitetypes'), 'docked', siteType)) ? 'docked' : 'autonomous';
        this.siteTypePath = path.join(this.configManager.get('paths.sitetypes'), this.editorStrategy, siteType);
        this.blueprint = JSON.parse(fs.readFileSync(path.join(this.siteTypePath, 'blueprint', path.basename(this.config.blueprintFile)), 'utf8'));

        // BLUEPRINT VERSION MIGRATION (Phase 4.3)
        if (!this.blueprint.version || this.blueprint.version < '2.0') {
            console.log(`📦 Blueprint migrated to v2.0 (was: ${this.blueprint.version || 'unversioned'})`);
            this.blueprint.version = '2.0';
            if (!this.blueprint.design_system) {
                this.blueprint.design_system = {
                    colors: { primary: '#0f172a', secondary: '#64748b', accent: '#3b82f6', background: '#ffffff', surface: '#f8fafc', text: '#1e293b' },
                    font_sans: "'Inter', ui-sans-serif, system-ui, sans-serif",
                    font_serif: "'Playfair Display', ui-serif, Georgia, serif",
                    radius: '1rem'
                };
            }
        }

        // VALIDATION
        const valResult = Validator.validateBlueprint(this.blueprint);
        if (!valResult.valid) {
            console.error(`❌ Blueprint Validation Failed for ${this.config.blueprintFile}:`);
            valResult.errors.forEach(e => console.error(`   - ${e}`));
            throw new Error("Invalid Blueprint");
        }
        if (valResult.warnings && valResult.warnings.length > 0) {
            valResult.warnings.forEach(w => console.warn(`⚠️  ${w}`));
        }

        this.paths = {
            sourceLayout: path.join(this.siteTypePath, 'web', layoutName),
            fallbackLayout: path.join(this.siteTypePath, 'web', 'standard'),
            trackBoilerplate: path.join(this.tplRoot, 'boilerplate', this.editorStrategy),
            modelBoilerplate: path.join(this.tplRoot, 'boilerplate', this.editorStrategy, siteModel),
            globalShared: path.join(this.tplRoot, 'shared')
        };

        this.engine = new TransformationEngine({
            variables: { PROJECT_NAME: this.config.projectName, SITE_TYPE_NAME: siteType, LAYOUT_NAME: layoutName, STYLE_NAME: this.config.styleName, PRIMARY_TABLE_NAME: this.blueprint.data_structure?.[0]?.table_name || 'basis' },
            flags: {
                isWebshop: !!(this.blueprint.features || {}).ecommerce,
                isDocked: this.editorStrategy === 'docked'
            }
        });
    }

    async handleProvisioning() {
        if (this.config.autoSheet) {
            try {
                const sheetData = await provisionSheet(this.config.projectName, this.config.clientEmail);
                fs.writeFileSync(path.join(this.projectDir, 'project-settings/url-sheet.json'), JSON.stringify({ basis: { editUrl: sheetData.editUrl, exportUrl: sheetData.exportUrl } }, null, 2));
            } catch (e) { console.warn(`⚠️  Auto-Sheet failed: ${e.message}`); }
        }
    }

    generateData() {
        const dataDir = path.join(this.projectDir, 'src/data');
        fs.writeFileSync(path.join(this.projectDir, 'athena-config.json'), JSON.stringify({ ...this.config, safeName: this.safeName, generatedAt: new Date() }, null, 2));
        fs.writeFileSync(path.join(dataDir, 'schema.json'), JSON.stringify(this.blueprint, null, 2));
        if (this.blueprint.data_structure) {
            this.blueprint.data_structure.forEach(t => {
                const p = path.join(dataDir, `${t.table_name.toLowerCase()}.json`);
                if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify([], null, 2));
            });
            fs.writeFileSync(path.join(dataDir, 'section_order.json'), JSON.stringify(this.blueprint.data_structure.map(t => t.table_name.toLowerCase()), null, 2));
        }
        ['site_settings.json', 'display_config.json', 'style_bindings.json', 'layout_settings.json', 'section_settings.json'].forEach(f => {
            const p = path.join(dataDir, f);
            if (!fs.existsSync(p)) fs.writeFileSync(p, JSON.stringify({ site_name: this.config.projectName }, null, 2));
        });

        // Phase 4.2: Generate style_config.json from ThemeEngine
        const styleConfigPath = path.join(dataDir, 'style_config.json');
        if (!fs.existsSync(styleConfigPath)) {
            const themeConfig = ThemeEngine.generate(this.blueprint);
            fs.writeFileSync(styleConfigPath, JSON.stringify(themeConfig, null, 2));
            console.log('🎨 Theme Engine: Generated style_config.json from design_system');
        }
    }

    copyBoilerplate() {
        // Public
        [this.paths.globalShared, path.join(this.paths.trackBoilerplate, 'shared')].forEach(base => {
            const src = path.join(base, 'public');
            if (fs.existsSync(src)) {
                fs.cpSync(src, path.join(this.projectDir, 'public'), { recursive: true });

                // Transform manifest and sw if they exist
                ['manifest.json', 'sw.js'].forEach(f => {
                    const p = path.join(this.projectDir, 'public', f);
                    if (fs.existsSync(p)) {
                        fs.writeFileSync(p, this.engine.transform(fs.readFileSync(p, 'utf8'), f));
                    }
                });
            }
        });

        // Base Logic
        ['logic/fetch-data.js', 'logic/mapper.js', 'config/index.html', 'config/project.gitignore', 'config/deploy.yml'].forEach(src => {
            const srcPath = path.join(this.tplRoot, src);
            if (fs.existsSync(srcPath)) {
                const dest = src.includes('/') ? src.split('/').pop() : src;
                const dPath = src === 'config/deploy.yml' ? '.github/workflows/deploy.yml' : (src === 'config/project.gitignore' ? '.gitignore' : dest);
                fs.writeFileSync(path.join(this.projectDir, dPath), this.engine.transform(fs.readFileSync(srcPath, 'utf8'), src));
            }
        });

        this.copyCoreFile('App.jsx');
        this.copyCoreFile('index.css');
        this.copyCoreFile('main.jsx');

        // Copy CSS Themes
        const cssSrc = path.join(this.paths.trackBoilerplate, 'css');
        if (fs.existsSync(cssSrc)) {
            fs.cpSync(cssSrc, path.join(this.projectDir, 'src/css'), { recursive: true });
        }

        this.assembleComponents();
    }

    copyCoreFile(fileName) {
        let src = [path.join(this.paths.sourceLayout, fileName), path.join(this.paths.fallbackLayout, fileName), path.join(this.paths.modelBoilerplate, fileName)].find(fs.existsSync);
        if (!src) return;
        let content = fs.readFileSync(src, 'utf8');
        if (fileName === 'main.jsx') content = this.injectDataLoading(content);
        if (fileName === 'App.jsx' && this.engine.flags.isWebshop && this.config.siteModel === 'SPA') content = this.transformWebshopApp(content);

        // Fix CSS paths for v7.6.2 structure
        if (fileName === 'index.css') {
            content = content.replace('@import "../css/', '@import "./css/');
        }
        if (fileName.endsWith('.jsx')) {
            // Verplaats thema CSS imports naar de css map, maar laat index.css in de root van src
            content = content.replace(/import '\.\/(?!index)([a-z-]+)\.css'/g, "import './css/$1.css'");
        }

        fs.writeFileSync(path.join(this.projectDir, 'src', fileName), this.engine.transform(content, fileName));
    }

    assembleComponents() {
        const essential = [
            'EditableImage.jsx', 'EditableMedia.jsx', 'EditableText.jsx', 'EditableLink.jsx',
            'CartContext.jsx', 'CartOverlay.jsx', 'Checkout.jsx', 'RepeaterControls.jsx',
            'Header.jsx', 'Footer.jsx', 'SectionToolbar.jsx', 'MetadataConfigModal.jsx', 'AboutSection.jsx',
            'StyleContext.jsx', 'DisplayConfigContext.jsx',
            // New Phase 4 Components:
            'Hero.jsx', 'Testimonials.jsx', 'Team.jsx', 'FAQ.jsx', 'CTA.jsx', 'ProductGrid.jsx', 'GenericSection.jsx'
        ];
        essential.forEach(comp => {
            let src = [
                path.join(this.paths.modelBoilerplate, 'components', comp),
                path.join(this.paths.trackBoilerplate, 'shared/components', comp),
                path.join(this.paths.globalShared, 'components', comp),
                path.join(this.tplRoot, 'components', comp) // Add this new path
            ].find(fs.existsSync);
            if (src) fs.writeFileSync(path.join(this.projectDir, 'src/components', comp), this.engine.transform(fs.readFileSync(src, 'utf8'), comp));
        });
        [path.join(this.paths.globalShared, 'components/ui'), path.join(this.paths.trackBoilerplate, 'shared/components/ui')].forEach(src => {
            if (fs.existsSync(src)) fs.cpSync(src, path.join(this.projectDir, 'src/components/ui'), { recursive: true });
        });

        // 3. Special: dock-connector.js (only for docked track)
        if (this.editorStrategy === 'docked') {
            const connSrc = path.join(this.paths.trackBoilerplate, 'shared/public/dock-connector.js');
            if (fs.existsSync(connSrc)) {
                fs.copyFileSync(connSrc, path.join(this.projectDir, 'src/dock-connector.js'));
            }
        }
    }

    generateSpecialComponents() {
        try {
            const customSectionSrc = [
                path.join(this.paths.sourceLayout, 'components/Section.jsx'),
                path.join(this.paths.sourceLayout, 'Section.jsx')
            ].find(fs.existsSync);

            if (customSectionSrc) {
                console.log(`🎨 Using sitetype-specific Section.jsx from: ${customSectionSrc}`);
                fs.writeFileSync(
                    path.join(this.projectDir, 'src/components/Section.jsx'),
                    this.engine.transform(fs.readFileSync(customSectionSrc, 'utf8'), 'Section.jsx')
                );
            } else {
                const code = generateSectionComponent(this.blueprint, this.editorStrategy);
                fs.writeFileSync(path.join(this.projectDir, 'src/components/Section.jsx'), code);
            }
        } catch (e) { console.error(`⚠️  Failed to generate Section.jsx: ${e.message}`); }

        const styleFileName = this.config.styleName.endsWith('.css') ? this.config.styleName : `${this.config.styleName}.css`;
        const styleSrc = path.join(this.tplRoot, 'boilerplate/docked/css', styleFileName);
        if (fs.existsSync(styleSrc)) fs.copyFileSync(styleSrc, path.join(this.projectDir, 'src', styleFileName));
    }

    injectDataLoading(content) {
        const logic = `
    const dataModules = import.meta.glob('./data/*.json', { eager: true });
    const getData = (name) => {
        const key = Object.keys(dataModules).find(k => k.toLowerCase().endsWith(\`/\${name.toLowerCase()}.json\`));
        return key ? dataModules[key].default : null;
    };
    data['section_order'] = getData('section_order') || [];
    data['site_settings'] = getData('site_settings') || {};
    data['display_config'] = getData('display_config') || { sections: {} };
    data['layout_settings'] = getData('layout_settings') || {};
    for (const sectionName of data['section_order']) {
        const sectionData = getData(sectionName);
        data[sectionName] = sectionData ? (Array.isArray(sectionData) ? sectionData : [sectionData]) : [];
    }
    if (window.athenaScan) window.athenaScan(data);`;

        // Zorg dat we niet .css toevoegen als de styleName dat al heeft
        const styleFile = this.config.styleName.toLowerCase().endsWith('.css') ? this.config.styleName : `${this.config.styleName}.css`;
        return content.replace('{{DATA_LOADING_LOGIC}}', logic).replace('./style-import.css', `./${styleFile}`);
    }

    transformWebshopApp(content) {
        return `import React from 'react';\nimport { HashRouter as Router, Routes, Route } from 'react-router-dom';\nimport Header from './components/Header';\nimport Section from './components/Section';\nimport Footer from './components/Footer';\nimport Checkout from './components/Checkout';\nimport CartOverlay from './components/CartOverlay';\nimport { CartProvider } from './components/CartContext';\nconst Layout = ({ data, children }) => (\n<div className=\"min-h-screen bg-[var(--color-background)]\">\n<Header data={data.basis || Object.values(data)[0]} siteSettings={data.site_settings} />\n<main className=\"pt-20\">{children}</main>\n<Footer siteSettings={data.site_settings} />\n<CartOverlay />\n</div>\n);\nconst App = ({ data }) => (\n<CartProvider>\n<Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>\n<Routes>\n<Route path=\"/\" element={<Layout data={data}><Section data={data} /></Layout>} />\n<Route path=\"/checkout\" element={<Layout data={data}><Checkout /></Layout>} />\n</Routes>\n</Router>\n</CartProvider>\n);\nexport default App;`;
    }

    async finalize() {
        const pkg = {
            name: this.safeName,
            type: "module",
            scripts: {
                "fetch-data": "node fetch-data.js",
                "dev": "vite",
                "build": "vite build"
            },
            dependencies: {
                "react": "^19.0.0",
                "react-dom": "^19.0.0",
                "react-router-dom": "^6.20.0",
                "csvtojson": "^2.0.10",
                "@heroicons/react": "^2.2.0",
                "lucide-react": "^0.300.0"
            },
            devDependencies: {
                "@tailwindcss/vite": "^4.0.0",
                "tailwindcss": "^4.0.0",
                "vite": "^6.0.0",
                "@vitejs/plugin-react": "^4.0.0",
                "dotenv": "^17.2.3"
            }
        };
        const pkgFile = path.join(this.projectDir, 'package.json');
        fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2));

        const viteTplPath = path.join(this.tplRoot, 'config/vite.config.js');
        const viteTpl = fs.readFileSync(viteTplPath, 'utf8');

        // Gebruik vaste poorten uit de centrale registratie indien beschikbaar
        const registryPath = path.join(__dirname, '../../config/site-ports.json');
        let portMap = {};
        if (fs.existsSync(registryPath)) {
            try { portMap = JSON.parse(fs.readFileSync(registryPath, 'utf8')); }
            catch (e) { console.warn("Could not read site-ports.json", e.message); }
        }

        let port = portMap[this.safeName];
        if (!port) {
            // Genereer een veilige poort tussen 5000 en 6500, vermijd 6000
            do {
                port = 5001 + Math.floor(Math.random() * 1499);
            } while (port === 6000 || Object.values(portMap).includes(port));

            // Sla de nieuwe poort direct op in het register
            portMap[this.safeName] = port;
            try {
                fs.writeFileSync(registryPath, JSON.stringify(portMap, null, 4));
            } catch (e) {
                console.warn("Could not update site-ports.json", e.message);
            }
        }

        const finalViteConfig = viteTpl
            .replace(/\{\{\s*BASE_PATH\s*\}\}/g, './')
            .replace(/\{\{\s*PORT\s*\}\}/g, port.toString());

        fs.writeFileSync(path.join(this.projectDir, 'vite.config.js'), finalViteConfig);

        this.syncInputData();
        scavengeAssets(this.projectDir, this.config.projectName);
        generateClientInstructions(this.projectDir, this.safeName, this.blueprint);
        generateReadme(this.projectDir, this.safeName);

        try {
            // Check if we are already inside a git repository (Monorepo detection)
            let isInsideRepo = false;
            try {
                execSync('git rev-parse --is-inside-work-tree', { cwd: path.dirname(this.projectDir), stdio: 'ignore' });
                isInsideRepo = true;
            } catch (e) { }

            if (!isInsideRepo) {
                execSync('git init', { cwd: this.projectDir, stdio: 'ignore' });
                execSync('git add .', { cwd: this.projectDir, stdio: 'ignore' });
                execSync('git commit -m "feat: initial Athena build"', { cwd: this.projectDir, stdio: 'ignore' });
            } else {
                console.log("ℹ️  Monorepo detected: Skipping 'git init' for the new site.");
            }
        } catch (e) { }

        // SEO: Generate sitemap.xml and robots.txt
        await this.generateSEO();

        // Phase 3.4: Post-Generate Quality Check
        QualityChecker.check(this.projectDir);
    }

    async generateSEO() {
        const domain = `https://${this.config.projectName}.netlify.app`;
        const sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${domain}/</loc>
    <lastmod>${new Date().toISOString().split('T')[0]}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>`;

        fs.writeFileSync(path.join(this.projectDir, 'public/sitemap.xml'), sitemapContent);

        const robotsContent = `User-agent: *
Allow: /
Sitemap: ${domain}/sitemap.xml`;

        fs.writeFileSync(path.join(this.projectDir, 'public/robots.txt'), robotsContent);
        console.log("🔍 SEO: Generated sitemap.xml and robots.txt");
    }

    syncInputData() {
        const projectInputBase = (this.config.sourceProject || this.config.projectName).replace('-site', '');
        const jsonDir = path.join(this.configManager.get('paths.input'), projectInputBase, 'json-data');
        const tsvDir = path.join(this.configManager.get('paths.input'), projectInputBase, 'tsv-data');

        if (fs.existsSync(jsonDir) && fs.readdirSync(jsonDir).some(f => f.endsWith('.json'))) {
            fs.cpSync(jsonDir, path.join(this.projectDir, 'src/data'), { recursive: true });
        } else if (fs.existsSync(tsvDir) && fs.readdirSync(tsvDir).some(f => f.endsWith('.tsv'))) {
            try {
                const scriptPath = path.join(this.configManager.get('paths.engine'), 'sync-tsv-to-json.js');
                execSync(`"${process.execPath}" "${scriptPath}" "${projectInputBase}" "${this.safeName}"`, {
                    cwd: this.configManager.get('paths.factory'),
                    stdio: 'ignore'
                });
            } catch (e) { }
        }
    }
}

export async function createProject(config, configManager = defaultCM) {
    const generator = new ProjectGenerator(config, configManager);
    return await generator.run();
}
