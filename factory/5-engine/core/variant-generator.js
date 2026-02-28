#!/usr/bin/env node
/**
 * @file variant-generator.js
 * @description Generates multiple CSS-style variants of an existing Athena site.
 * Each variant is a fully independent site directory with a different visual theme.
 * 
 * Usage:
 *   node 5-engine/variant-generator.js "demo-bakkerij"                     # All variants
 *   node 5-engine/variant-generator.js "demo-bakkerij" --styles "bold,warm" # Specific
 *   node 5-engine/variant-generator.js "demo-bakkerij" --dry-run            # Preview
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SITES_DIR = path.resolve(__dirname, '../../../../athena-x/sites');
const THEMES_DIR = path.resolve(__dirname, '../../2-templates/boilerplate/docked/css');
const PORTS_FILE = path.resolve(__dirname, '../../config/site-ports.json');
console.log(`   🔍 variant-generator.js: SITES_DIR = ${SITES_DIR}`);

// --- Exported Utility Functions ---

/**
 * Returns all available theme names (without .css extension).
 */
export function getAvailableThemes() {
    if (!fs.existsSync(THEMES_DIR)) return [];
    return fs.readdirSync(THEMES_DIR)
        .filter(f => f.endsWith('.css'))
        .map(f => f.replace('.css', ''));
}

/**
 * Detects the current active theme of a site by inspecting index.css and main.jsx.
 * @param {string} siteDir - Absolute path to the site directory.
 * @returns {string|null} Theme name without .css, or null if not detected.
 */
export function detectCurrentTheme(siteDir) {
    // Strategy 1: Check index.css for @import "./css/xxx.css" or @import "css/xxx.css"
    const indexCss = path.join(siteDir, 'src/index.css');
    if (fs.existsSync(indexCss)) {
        const content = fs.readFileSync(indexCss, 'utf8');
        const match = content.match(/@import\s+["'](?:\.\/)?css\/([a-z0-9-]+)\.css["']/);
        if (match) return match[1];
    }

    // Strategy 2: Check main.jsx for import './css/xxx.css'
    const mainJsx = path.join(siteDir, 'src/main.jsx');
    if (fs.existsSync(mainJsx)) {
        const content = fs.readFileSync(mainJsx, 'utf8');
        const match = content.match(/import\s+['"](?:\.\/)?css\/([a-z0-9-]+)\.css['"]/);
        if (match) return match[1];
    }

    // Strategy 3: Check src/data/style_config.json (Newly generated sites store it here)
    const styleDataPath = path.join(siteDir, 'src/data/style_config.json');
    if (fs.existsSync(styleDataPath)) {
        try {
            const styleConfig = JSON.parse(fs.readFileSync(styleDataPath, 'utf8'));
            // If it has a specific theme name or just based on colors... 
            // Actually, newly generated sites don't have the theme NAME in this specific file, 
            // but the generator might want to know it's already 'warm' or 'corporate'.
        } catch (e) { /* ignore */ }
    }

    // Strategy 4: Check athena-config.json
    const configFile = path.join(siteDir, 'athena-config.json');
    if (fs.existsSync(configFile)) {
        try {
            const config = JSON.parse(fs.readFileSync(configFile, 'utf8'));
            if (config.styleName) return config.styleName.replace('.css', '');
        } catch (e) { /* ignore */ }
    }

    return null;
}

/**
 * Generates a variant site name from a base name and theme.
 * @param {string} baseName - The original site name (e.g., "demo-bakkerij").
 * @param {string} theme - The theme name (e.g., "bold").
 * @returns {string} Variant name (e.g., "demo-bakkerij-bold").
 */
export function generateVariantName(baseName, theme) {
    // Strip any existing theme suffix to avoid "demo-bakkerij-modern-bold"
    const availableThemes = getAvailableThemes();
    let cleanName = baseName;
    for (const t of availableThemes) {
        if (cleanName.endsWith(`-${t}`)) {
            cleanName = cleanName.slice(0, -(t.length + 1));
            break;
        }
    }
    return `${cleanName}-${theme}`;
}

/**
 * Parses CSS variables from a theme file's :root and @theme blocks.
 * @param {string} themePath - Absolute path to the theme CSS file.
 * @returns {Object} Map of CSS variable name -> value.
 */
export function parseThemeColors(themePath) {
    if (!fs.existsSync(themePath)) return {};

    const content = fs.readFileSync(themePath, 'utf8');
    const vars = {};

    // Match both @theme { ... } and :root { ... } blocks
    const blockRegex = /(?:@theme|:root)\s*\{([^}]+)\}/g;
    let blockMatch;
    while ((blockMatch = blockRegex.exec(content)) !== null) {
        const block = blockMatch[1];
        const varRegex = /(--[a-z-]+)\s*:\s*([^;]+);/g;
        let varMatch;
        while ((varMatch = varRegex.exec(block)) !== null) {
            vars[varMatch[1]] = varMatch[2].trim();
        }
    }

    // Also match font definitions
    const fontRegex = /(--font-[a-z]+)\s*:\s*([^;]+);/g;
    let fontMatch;
    while ((fontMatch = fontRegex.exec(content)) !== null) {
        vars[fontMatch[1]] = fontMatch[2].trim();
    }

    return vars;
}

/**
 * Allocates a unique port for a new site variant.
 * @param {string} siteName - The site name to register.
 * @returns {number} The allocated port number.
 */
function allocatePort(siteName) {
    let portMap = {};
    if (fs.existsSync(PORTS_FILE)) {
        try { portMap = JSON.parse(fs.readFileSync(PORTS_FILE, 'utf8')); }
        catch (e) { /* ignore */ }
    }

    if (portMap[siteName]) return portMap[siteName];

    let port;
    const usedPorts = new Set(Object.values(portMap));
    do {
        port = 5001 + Math.floor(Math.random() * 1499);
    } while (port === 6000 || usedPorts.has(port));

    portMap[siteName] = port;
    try {
        fs.writeFileSync(PORTS_FILE, JSON.stringify(portMap, null, 4));
    } catch (e) {
        console.warn(`⚠️  Could not update site-ports.json: ${e.message}`);
    }
    return port;
}

/**
 * Creates a single style variant of an existing site.
 * @param {string} sourceSiteDir - Absolute path to the source site.
 * @param {string} targetTheme - Theme name (without .css).
 * @param {Object} options - { dryRun: boolean }
 * @returns {{ variantName: string, variantDir: string, created: boolean }}
 */
export function createVariant(sourceSiteDir, targetTheme, options = {}) {
    const baseName = path.basename(sourceSiteDir);
    const variantName = generateVariantName(baseName, targetTheme);
    const variantDir = path.join(SITES_DIR, variantName);
    const themeFile = path.join(THEMES_DIR, `${targetTheme}.css`);

    if (options.dryRun) {
        return { variantName, variantDir, created: false, dryRun: true };
    }

    if (fs.existsSync(variantDir)) {
        console.log(`   ⏩ Skip: ${variantName} (already exists)`);
        return { variantName, variantDir, created: false, exists: true };
    }

    if (!fs.existsSync(themeFile)) {
        console.error(`   ❌ Theme file not found: ${targetTheme}.css`);
        return { variantName, variantDir, created: false, error: 'theme_not_found' };
    }

    // 1. Copy entire site (excluding node_modules and .git)
    console.log(`   📋 Copying ${baseName} → ${variantName}...`);
    fs.cpSync(sourceSiteDir, variantDir, {
        recursive: true,
        filter: (src) => {
            const rel = path.relative(sourceSiteDir, src);
            return !rel.startsWith('node_modules') && !rel.startsWith('.git');
        }
    });

    // 2. Replace/add the theme CSS file
    const cssDest = path.join(variantDir, 'src/css');
    fs.mkdirSync(cssDest, { recursive: true });
    fs.copyFileSync(themeFile, path.join(cssDest, `${targetTheme}.css`));

    // 3. Update index.css to import the new theme
    const indexCssPath = path.join(variantDir, 'src/index.css');
    if (fs.existsSync(indexCssPath)) {
        let css = fs.readFileSync(indexCssPath, 'utf8');
        css = css.replace(
            /@import\s+["']\.\/css\/[a-z0-9-]+\.css["']\s*;/,
            `@import "./css/${targetTheme}.css";`
        );
        fs.writeFileSync(indexCssPath, css);
    }

    // 4. Update main.jsx CSS import
    const mainJsxPath = path.join(variantDir, 'src/main.jsx');
    if (fs.existsSync(mainJsxPath)) {
        let jsx = fs.readFileSync(mainJsxPath, 'utf8');
        jsx = jsx.replace(
            /import\s+['"]\.\/css\/[a-z0-9-]+\.css['"]\s*;/,
            `import './css/${targetTheme}.css';`
        );
        fs.writeFileSync(mainJsxPath, jsx);
    }

    // 5. Regenerate style_config.json from theme CSS variables
    const themeVars = parseThemeColors(themeFile);
    if (Object.keys(themeVars).length > 0) {
        const styleConfigPath = path.join(variantDir, 'src/data/style_config.json');
        fs.writeFileSync(styleConfigPath, JSON.stringify(themeVars, null, 2));
    }

    // 6. Update package.json name
    const pkgPath = path.join(variantDir, 'package.json');
    if (fs.existsSync(pkgPath)) {
        try {
            const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
            pkg.name = variantName;
            fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
        } catch (e) { /* ignore */ }
    }

    // 7. Update athena-config.json
    const configPath = path.join(variantDir, 'athena-config.json');
    if (fs.existsSync(configPath)) {
        try {
            const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            config.projectName = variantName;
            config.safeName = variantName;
            config.styleName = targetTheme;
            config.variantOf = baseName;
            config.generatedAt = new Date().toISOString();
            fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        } catch (e) { /* ignore */ }
    }

    // 8. Update vite.config.js port
    const viteConfigPath = path.join(variantDir, 'vite.config.js');
    if (fs.existsSync(viteConfigPath)) {
        const port = allocatePort(variantName);
        let viteConfig = fs.readFileSync(viteConfigPath, 'utf8');
        viteConfig = viteConfig.replace(/port:\s*\d+/, `port: ${port}`);
        fs.writeFileSync(viteConfigPath, viteConfig);
    }

    // 9. Update README.md
    const readmePath = path.join(variantDir, 'README.md');
    if (fs.existsSync(readmePath)) {
        let readme = fs.readFileSync(readmePath, 'utf8');
        readme = readme.replace(baseName, variantName);
        fs.writeFileSync(readmePath, readme);
    }

    // 10. Rename Image Folder in public/images
    const oldImgDir = path.join(variantDir, 'public/images', baseName);
    const newImgDir = path.join(variantDir, 'public/images', variantName);
    if (fs.existsSync(oldImgDir) && !fs.existsSync(newImgDir)) {
        try {
            fs.renameSync(oldImgDir, newImgDir);
            console.log(`   📸 Renamed images: ${baseName} → ${variantName}`);
        } catch (e) {
            console.warn(`   ⚠️ Could not rename image folder: ${e.message}`);
        }
    }

    console.log(`   ✅ Created: ${variantName}`);
    return { variantName, variantDir, created: true };
}

/**
 * Generates all (or specified) style variants for a site.
 * @param {string} siteName - Name of the source site in sites/.
 * @param {Object} options - { styles: string[], dryRun: boolean }
 * @returns {Array} Results for each variant.
 */
export function generateVariants(siteName, options = {}) {
    const sourceSiteDir = path.join(SITES_DIR, siteName);

    if (!fs.existsSync(sourceSiteDir)) {
        console.error(`❌ Site niet gevonden: sites/${siteName}`);
        return [];
    }

    const currentTheme = detectCurrentTheme(sourceSiteDir);
    const allThemes = getAvailableThemes();
    const targetThemes = options.styles
        ? options.styles.filter(s => {
            const exists = allThemes.includes(s);
            if (!exists) console.log(`   ⚠️ Style '${s}' niet gevonden in ${THEMES_DIR}`);
            return exists;
        })
        : allThemes;

    console.log(`   🔍 targetThemes: ${targetThemes.join(', ')}`);
    console.log(`   🔍 allThemes: ${allThemes.join(', ')}`);
    console.log(`   🔍 currentTheme: ${currentTheme}`);

    // Filter out the current theme if found
    const themesToGenerate = currentTheme
        ? targetThemes.filter(t => t !== currentTheme)
        : targetThemes;

    if (themesToGenerate.length === 0) {
        console.log('ℹ️  Geen nieuwe varianten om te genereren.');
        return [];
    }

    console.log(`\n🎨 Variant Generator: ${siteName}`);
    console.log(`   Huidige stijl: ${currentTheme || 'onbekend'}`);
    console.log(`   Te genereren: ${themesToGenerate.join(', ')}`);
    if (options.dryRun) console.log(`   📝 DRY RUN - er wordt niets aangemaakt.\n`);
    else console.log('');

    const results = [];
    for (const theme of themesToGenerate) {
        const result = createVariant(sourceSiteDir, theme, { dryRun: options.dryRun });
        results.push(result);

        if (options.dryRun) {
            console.log(`   📝 Zou aanmaken: ${result.variantName}`);
        }
    }

    // Summary
    const created = results.filter(r => r.created).length;
    const skipped = results.filter(r => r.exists).length;
    const dryRunCount = results.filter(r => r.dryRun).length;

    console.log('\n' + '='.repeat(50));
    if (options.dryRun) {
        console.log(`📝 DRY RUN: ${dryRunCount} variant(en) zouden worden aangemaakt.`);
    } else {
        console.log(`✨ Klaar! ${created} variant(en) aangemaakt, ${skipped} overgeslagen.`);
    }

    if (created > 0) {
        console.log('\n💡 Vergeet niet om per variant te installeren:');
        results.filter(r => r.created).forEach(r => {
            console.log(`   cd ../sites/${r.variantName} && pnpm install`);
        });
    }

    return results;
}

// --- CLI Entry Point ---
function main() {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
        console.log(`
🎨 Athena Variant Generator
============================
Genereert meerdere stijl-varianten van een bestaande website.

Gebruik:
  node 5-engine/variant-generator.js <site-naam> [opties]

Opties:
  --styles "bold,warm"   Specifieke stijlen (komma-gescheiden)
  --dry-run              Toon wat er zou worden aangemaakt
  --help, -h             Toon deze hulptekst

Voorbeelden:
  node 5-engine/variant-generator.js "demo-bakkerij"
  node 5-engine/variant-generator.js "demo-bakkerij" --styles "bold,warm"
  node 5-engine/variant-generator.js "demo-bakkerij" --dry-run

Beschikbare stijlen: ${getAvailableThemes().join(', ')}
        `);
        process.exit(0);
    }

    const siteName = args[0];
    const options = {};

    // Parse --styles
    const stylesIdx = args.indexOf('--styles');
    if (stylesIdx !== -1 && args[stylesIdx + 1]) {
        options.styles = args[stylesIdx + 1].split(',').map(s => s.trim());
    }

    // Parse --dry-run
    if (args.includes('--dry-run')) {
        options.dryRun = true;
    }

    generateVariants(siteName, options);
}

// Only run CLI if this is the main module
const isMain = process.argv[1] && (
    process.argv[1] === __filename ||
    process.argv[1].endsWith('/variant-generator.js')
);
if (isMain) {
    main();
}
