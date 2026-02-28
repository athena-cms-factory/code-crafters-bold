/**
 * @file site-tester.js
 * @description End-to-end site factory tester.
 * Generates test data, runs the full pipeline, creates theme variants, and reports quality.
 *
 * Usage:
 *   node factory/5-engine/site-tester.js --mode mock --type professional-service-provider
 *   node factory/5-engine/site-tester.js --mode scrape --url https://example.be --type de-salon-type
 *
 * Options:
 *   --mode <mock|scrape>     Data source (required)
 *   --type <sitetype>        Site type from 3-sitetypes/docked/ (required)
 *   --url <url>              URL to scrape (required when --mode scrape)
 *   --themes <list>          CSS themes, comma-separated (default: all available)
 *   --name <name>            Base name for test sites (default: "test-{type}-{timestamp}")
 *   --skip-build             Skip pnpm install + build (faster testing)
 *   --cleanup                Remove generated test sites after report
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createProject } from './core/factory.js';
import { generateWithAI } from './core/ai-engine.js';
import { QualityChecker } from './lib/quality-check.js';
import { loadEnv } from './env-loader.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const FACTORY_ROOT = path.resolve(__dirname, '..');
const SITES_DIR = path.resolve(FACTORY_ROOT, '../sites');
const INPUT_DIR = path.resolve(FACTORY_ROOT, '../input');
const REPORTS_DIR = path.join(FACTORY_ROOT, 'test-reports');

const ALL_THEMES = ['modern.css', 'classic.css', 'modern-dark.css', 'warm.css', 'corporate.css', 'bold.css'];

// --- CLI Argument Parsing ---

function parseArgs() {
    const args = process.argv.slice(2);
    const opts = { mode: null, type: null, url: null, themes: null, name: null, skipBuild: false, cleanup: false };

    for (let i = 0; i < args.length; i++) {
        switch (args[i]) {
            case '--mode':    opts.mode = args[++i]; break;
            case '--type':    opts.type = args[++i]; break;
            case '--url':     opts.url = args[++i]; break;
            case '--themes':  opts.themes = args[++i]; break;
            case '--name':    opts.name = args[++i]; break;
            case '--skip-build': opts.skipBuild = true; break;
            case '--cleanup': opts.cleanup = true; break;
        }
    }

    // Validation
    if (!opts.mode || !['mock', 'scrape'].includes(opts.mode)) {
        console.error('❌ --mode is verplicht (mock of scrape)');
        process.exit(1);
    }
    if (!opts.type) {
        console.error('❌ --type is verplicht');
        process.exit(1);
    }
    if (opts.mode === 'scrape' && !opts.url) {
        console.error('❌ --url is verplicht bij --mode scrape');
        process.exit(1);
    }

    // Check sitetype exists
    const siteTypePath = path.join(FACTORY_ROOT, '3-sitetypes/docked', opts.type);
    if (!fs.existsSync(siteTypePath)) {
        console.error(`❌ Sitetype "${opts.type}" niet gevonden in 3-sitetypes/docked/`);
        console.error(`   Beschikbaar: ${fs.readdirSync(path.join(FACTORY_ROOT, '3-sitetypes/docked')).join(', ')}`);
        process.exit(1);
    }

    return opts;
}

// --- Step 1: Generate Data ---

async function generateMockData(testName, type, blueprint) {
    console.log('\n📝 Stap 1: Mock data genereren via AI...');

    const prompt = `Genereer realistische Nederlandstalige mock-data voor een KMO website.
Dit is een ${blueprint.description || blueprint.blueprint_name}.
Genereer een samenhangende tekst van 500-1000 woorden die alle informatie bevat
die nodig is om de volgende datastructuur te vullen: ${JSON.stringify(blueprint.data_structure, null, 2)}
Maak het realistisch: echte Belgische/Nederlandse bedrijfsnamen, adressen,
telefoonnummers, openingsuren, prijzen.`;

    const result = await generateWithAI(prompt, { isJson: false });
    if (!result) {
        console.error('❌ AI mock data generatie mislukt');
        process.exit(1);
    }

    const inputDir = path.join(INPUT_DIR, testName, 'input');
    fs.mkdirSync(inputDir, { recursive: true });
    const inputFile = 'mock-input.txt';
    fs.writeFileSync(path.join(inputDir, inputFile), result);
    console.log(`   ✅ Mock data opgeslagen: input/${testName}/input/${inputFile}`);
    return inputFile;
}

async function scrapeData(testName, url) {
    console.log(`\n🌐 Stap 1: Scraping ${url}...`);
    const scraperPath = path.join(__dirname, 'athena-scraper.js');

    try {
        execSync(`node "${scraperPath}" "${testName}" "${url}"`, {
            cwd: FACTORY_ROOT,
            stdio: 'inherit',
            timeout: 120000
        });
    } catch (e) {
        console.error(`❌ Scraping mislukt: ${e.message}`);
        process.exit(1);
    }

    const inputFile = 'scraped-content.txt';
    const expectedPath = path.join(INPUT_DIR, testName, 'input', inputFile);
    if (!fs.existsSync(expectedPath)) {
        console.error(`❌ Scraper output niet gevonden: ${expectedPath}`);
        process.exit(1);
    }
    console.log(`   ✅ Scrape data opgeslagen: input/${testName}/input/${inputFile}`);
    return inputFile;
}

// --- Step 2: Parse Data ---

async function parseData(testName, type, inputFile) {
    console.log('\n🔄 Stap 2: Data parsen...');
    const parserPath = path.join(FACTORY_ROOT, '3-sitetypes/docked', type, 'parser', `parser-${type}.js`);

    if (!fs.existsSync(parserPath)) {
        console.warn(`   ⚠️  Geen parser gevonden voor ${type}, parsing overgeslagen.`);
        return false;
    }

    const startTime = Date.now();
    try {
        execSync(`node "${parserPath}" "${testName}" "${inputFile}"`, {
            cwd: FACTORY_ROOT,
            stdio: 'inherit',
            timeout: 180000
        });
    } catch (e) {
        console.error(`   ❌ Parser mislukt: ${e.message}`);
        return false;
    }

    const elapsed = Date.now() - startTime;
    console.log(`   ✅ Parsing voltooid (${elapsed}ms)`);
    return { elapsed };
}

// --- Step 3: Generate Sites per Theme ---

async function generateSite(baseName, theme, type, blueprint, inputFile) {
    const themeName = theme.replace('.css', '');
    const siteName = `${baseName}-${themeName}`;
    console.log(`\n🔨 Genereren: ${siteName} (thema: ${theme})`);

    try {
        await createProject({
            projectName: siteName,
            siteType: type,
            siteModel: 'SPA',
            blueprintFile: `${type}/blueprint/${type}.json`,
            layoutName: blueprint.recommended_layout || 'standard',
            styleName: theme,
            inputFile: inputFile,
            autoSheet: false
        });
        return { siteName, success: true };
    } catch (e) {
        console.error(`   ❌ Generatie mislukt voor ${siteName}: ${e.message}`);
        return { siteName, success: false, error: e.message };
    }
}

// --- Step 4: Quality Report per Site ---

function checkSiteQuality(siteName) {
    const projectDir = path.join(SITES_DIR, siteName);
    if (!fs.existsSync(projectDir)) {
        return { quality: 'MISS', errors: ['Project directory not found'] };
    }

    // QualityChecker
    const report = QualityChecker.check(projectDir);
    const qualityPass = !report || report.errors.length === 0;

    // Extra checks
    const extras = [];
    // SEO files
    if (!fs.existsSync(path.join(projectDir, 'public/sitemap.xml'))) extras.push('Missing sitemap.xml');
    if (!fs.existsSync(path.join(projectDir, 'public/robots.txt'))) extras.push('Missing robots.txt');
    // ThemeEngine output
    if (!fs.existsSync(path.join(projectDir, 'src/data/style_config.json'))) extras.push('Missing style_config.json');
    // Component registry
    if (!fs.existsSync(path.join(projectDir, 'src/components/Section.jsx'))) extras.push('Missing Section.jsx');

    // Count JSX components
    const compDir = path.join(projectDir, 'src/components');
    let jsxCount = 0;
    if (fs.existsSync(compDir)) {
        const countJsx = (dir) => {
            for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
                if (item.isDirectory()) countJsx(path.join(dir, item.name));
                else if (item.name.endsWith('.jsx')) jsxCount++;
            }
        };
        countJsx(compDir);
    }

    return {
        quality: qualityPass && extras.length === 0 ? 'PASS' : 'WARN',
        errors: [...(report?.errors || []), ...extras],
        warnings: report?.warnings || [],
        jsxCount
    };
}

function tryBuild(siteName) {
    const projectDir = path.join(SITES_DIR, siteName);
    try {
        execSync('pnpm install --frozen-lockfile 2>/dev/null || pnpm install', {
            cwd: projectDir, stdio: 'pipe', timeout: 120000
        });
        execSync('pnpm build', {
            cwd: projectDir, stdio: 'pipe', timeout: 120000
        });
        return { success: true };
    } catch (e) {
        return { success: false, error: e.stderr?.toString().slice(-200) || e.message };
    }
}

// --- Step 5: Report ---

function generateReport(opts, results, parserInfo, totalTime) {
    const timestamp = new Date().toISOString().replace('T', ' ').slice(0, 16);
    const themes = results.map(r => r.theme);
    const errorCount = results.filter(r => !r.qualityResult?.quality || r.qualityResult.quality !== 'PASS' || r.buildResult?.success === false).length;

    const header = `
═══════════════════════════════════════════════════════════
  ATHENA SITE TESTER - RAPPORT
  Datum: ${timestamp}
  Mode: ${opts.mode} | Sitetype: ${opts.type}
  Thema's: ${themes.length} | Sites gegenereerd: ${results.filter(r => r.genResult.success).length}
═══════════════════════════════════════════════════════════`;

    const rows = results.map(r => {
        const name = (r.genResult.siteName || '').padEnd(36);
        const quality = r.qualityResult?.quality === 'PASS' ? '✅ PASS' : (r.qualityResult?.quality === 'WARN' ? '⚠️ WARN' : '❌ FAIL');
        const build = r.buildResult ? (r.buildResult.success ? '✅ OK ' : '❌ ERR') : '⏭️ SKIP';
        return `  ${name} ${quality}  ${build}  ${r.theme}`;
    });

    const tableHeader = `\n  ${'Site'.padEnd(36)} ${'Quality'}  ${'Build'}  Thema`;
    const separator = `  ${'─'.repeat(60)}`;

    const footer = `
  Parser: ${parserInfo ? `voltooid (${parserInfo.elapsed}ms)` : 'overgeslagen'}
  Totale tijd: ${Math.round(totalTime / 1000)}s
  Fouten: ${errorCount}
═══════════════════════════════════════════════════════════`;

    // Detail section for errors
    let details = '';
    for (const r of results) {
        const allErrors = [...(r.qualityResult?.errors || []), ...(r.qualityResult?.warnings || [])];
        if (allErrors.length > 0 || r.buildResult?.success === false) {
            details += `\n  📋 ${r.genResult.siteName}:`;
            allErrors.forEach(e => { details += `\n     - ${e}`; });
            if (r.buildResult?.success === false) {
                details += `\n     - BUILD ERROR: ${r.buildResult.error?.slice(0, 150) || 'unknown'}`;
            }
        }
    }

    const report = header + tableHeader + '\n' + separator + '\n' + rows.join('\n') + (details ? '\n\n  Details:' + details : '') + '\n' + footer;

    // Output to console
    console.log(report);

    // Save to file
    fs.mkdirSync(REPORTS_DIR, { recursive: true });
    const reportFile = path.join(REPORTS_DIR, `report-${Date.now()}.txt`);
    fs.writeFileSync(reportFile, report);
    console.log(`\n📄 Rapport opgeslagen: ${reportFile}`);

    return report;
}

// --- Main ---

async function main() {
    const totalStart = Date.now();
    const opts = parseArgs();

    // Load env
    await loadEnv(path.join(FACTORY_ROOT, '.env'));

    // Resolve names and blueprint
    const timestamp = new Date().toISOString().slice(2, 10).replace(/-/g, '');
    const baseName = opts.name || `test-${opts.type.slice(0, 15)}-${timestamp}`;
    const testName = baseName;

    const blueprintPath = path.join(FACTORY_ROOT, '3-sitetypes/docked', opts.type, 'blueprint', `${opts.type}.json`);
    const blueprint = JSON.parse(fs.readFileSync(blueprintPath, 'utf8'));

    // Resolve themes
    const availableThemes = ALL_THEMES.filter(t =>
        fs.existsSync(path.join(FACTORY_ROOT, '2-templates/boilerplate/docked/css', t))
    );
    let themes;
    if (opts.themes) {
        themes = opts.themes.split(',').map(t => t.trim().endsWith('.css') ? t.trim() : `${t.trim()}.css`);
    } else {
        themes = availableThemes.length > 0 ? availableThemes : ALL_THEMES;
    }

    console.log(`\n🧪 ATHENA SITE TESTER`);
    console.log(`   Mode: ${opts.mode} | Type: ${opts.type}`);
    console.log(`   Base name: ${baseName}`);
    console.log(`   Thema's: ${themes.join(', ')}`);
    if (opts.skipBuild) console.log(`   ⏭️  Build overgeslagen (--skip-build)`);

    // Step 1: Generate data
    let inputFile;
    if (opts.mode === 'mock') {
        inputFile = await generateMockData(testName, opts.type, blueprint);
    } else {
        inputFile = await scrapeData(testName, opts.url);
    }

    // Step 2: Parse data (1x for all variants)
    const parserInfo = await parseData(testName, opts.type, inputFile);

    // Step 3: Generate sites per theme
    console.log(`\n🎨 Stap 3: ${themes.length} thema-varianten genereren...`);
    const results = [];

    for (const theme of themes) {
        const genResult = await generateSite(baseName, theme, opts.type, blueprint, inputFile);

        // Step 4: Quality check
        let qualityResult = null;
        if (genResult.success) {
            qualityResult = checkSiteQuality(genResult.siteName);
        }

        // Optional build
        let buildResult = null;
        if (genResult.success && !opts.skipBuild) {
            console.log(`   🔧 Building ${genResult.siteName}...`);
            buildResult = tryBuild(genResult.siteName);
            console.log(`   ${buildResult.success ? '✅' : '❌'} Build ${buildResult.success ? 'OK' : 'FAILED'}`);
        }

        results.push({ theme, genResult, qualityResult, buildResult });
    }

    // Step 5: Report
    const totalTime = Date.now() - totalStart;
    generateReport(opts, results, parserInfo, totalTime);

    // Cleanup
    if (opts.cleanup) {
        console.log('\n🧹 Cleanup: test-sites verwijderen...');
        for (const r of results) {
            if (r.genResult.success) {
                const dir = path.join(SITES_DIR, r.genResult.siteName);
                if (fs.existsSync(dir)) {
                    fs.rmSync(dir, { recursive: true, force: true });
                    console.log(`   🗑️  ${r.genResult.siteName}`);
                }
            }
        }
        // Clean input data
        const inputDir = path.join(INPUT_DIR, testName);
        if (fs.existsSync(inputDir)) {
            fs.rmSync(inputDir, { recursive: true, force: true });
            console.log(`   🗑️  input/${testName}`);
        }
    }

    console.log('\n✨ Site tester voltooid.');
}

main().catch(e => {
    console.error(`\n💥 Fatale fout: ${e.message}`);
    console.error(e.stack);
    process.exit(1);
});
