#!/usr/bin/env node
/**
 * @file quick-create.js
 * @description Non-interactive CLI to create a site in one go.
 * Usage: node quick-create.js --name "My Site" --type "basic-dock-type" --input "./data.txt"
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { parseArgs } from 'node:util';
import { createProject, validateProjectName } from '../5-engine/core/factory.js';
import { loadEnv } from '../5-engine/env-loader.js';
import { generateVariants, getAvailableThemes } from '../5-engine/core/variant-generator.js';

import { Validator } from '../5-engine/lib/validator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '..');

async function main() {
    await loadEnv(path.join(root, '.env'));

    // ... (rest of parseArgs) ...

    const options = {
        name: { type: 'string', short: 'n' },
        type: { type: 'string', short: 't' },
        input: { type: 'string', short: 'i' },
        model: { type: 'string', short: 'm', default: 'SPA' },
        deploy: { type: 'boolean', short: 'd', default: false },
        variants: { type: 'string', short: 'v' },
        help: { type: 'boolean', short: 'h' },
    };

    const { values } = parseArgs({ options, allowPositionals: true });

    if (values.help || !values.name || !values.type || !values.input) {
        // ... (help text) ...
        console.log(`
🚀 Athena Quick-Create CLI
==========================
Usage: node quick-create.js --name <name> --type <sitetype> --input <file> [options]
...
        `);
        process.exit(0);
    }

    console.log("⚡ Starting Quick-Create...");

    // 1. Validator Check
    const nameVal = Validator.validateProjectName(values.name, path.join(root, '../sites'));
    if (!nameVal.valid) {
        console.error(`❌ Invalid Project Name: ${nameVal.error}`);
        process.exit(1);
    }

    const inputVal = Validator.validateInputFile(values.input);
    if (!inputVal.valid) {
        console.error(`❌ Invalid Input File: ${inputVal.error}`);
        process.exit(1);
    }

    const safeName = validateProjectName(values.name);
    const config = {
        projectName: safeName,
        siteType: values.type,
        siteModel: values.model,
        inputFile: 'quick-input.txt',
        autoSheet: true // Default to true for CLI
    };

    console.log(`   Project: ${config.projectName}`);
    console.log(`   Type:    ${config.siteType}`);
    console.log(`   Model:   ${config.siteModel}`);
    console.log(`   Input:   ${values.input}`);

    const targetSiteDir = path.join(root, '../sites', safeName);
    if (fs.existsSync(targetSiteDir)) {
        console.error(`❌ Error: Directory sites/${safeName} already exists.`);
        process.exit(1);
    }

    // 2. Validate Type & Input
    // 2. Validate Type & Input
    const dockedPath = path.join(root, '3-sitetypes/docked', config.siteType);
    const autonomousPath = path.join(root, '3-sitetypes/autonomous', config.siteType);
    let siteTypeDir = '';

    if (fs.existsSync(dockedPath)) {
        siteTypeDir = dockedPath;
    } else if (fs.existsSync(autonomousPath)) {
        siteTypeDir = autonomousPath;
    } else {
        console.error(`❌ Error: Site type "${config.siteType}" not found in 3-sitetypes (docked or autonomous).`);
        process.exit(1);
    }

    if (!fs.existsSync(values.input)) {
        console.error(`❌ Error: Input file "${values.input}" not found.`);
        process.exit(1);
    }

    // 3. Setup Input Directory
    const inputDir = path.join(root, '../input', safeName, 'input');
    fs.mkdirSync(inputDir, { recursive: true });

    const content = fs.readFileSync(values.input, 'utf8');
    const combinedContent = `--- QUICK-CREATE INPUT ---\n${content}\n`;
    fs.writeFileSync(path.join(inputDir, config.inputFile), combinedContent);
    console.log(`✅ Input prepared in ${inputDir}`);

    // 4. Smart Defaults (Layout/Style)
    config.blueprintFile = path.join(config.siteType, 'blueprint', `${config.siteType}.json`);
    // Fix: blueprintFile in generator expects relative path or we need to pass full? 
    // In site-wizard: config.blueprintFile = path.join(selectedSiteType, 'blueprint', `${selectedSiteType}.json`);
    // ProjectGenerator uses: path.join(this.siteTypePath, 'blueprint', path.basename(this.config.blueprintFile))
    // So usually filename is enough? Or relative? 
    // Let's stick to what wizard does.

    const bpPath = path.join(siteTypeDir, 'blueprint', `${config.siteType}.json`);
    if (fs.existsSync(bpPath)) {
        try {
            const bp = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
            config.layoutName = bp.recommended_layout || 'standard';
            config.styleName = bp.recommended_style || 'modern.css';
            console.log(`💡 Defaults: Layout=${config.layoutName}, Style=${config.styleName}`);
        } catch (e) {
            console.warn("⚠️ Could not read blueprint defaults, using standard/modern.");
            config.layoutName = 'standard';
            config.styleName = 'modern.css';
        }
    } else {
        config.layoutName = 'standard';
        config.styleName = 'modern.css';
    }

    // Fix style extension
    if (!config.styleName.endsWith('.css')) config.styleName += '.css';

    // 5. Run Parser
    console.log('\n🤖 Running Parser...');
    const parserScript = path.join(siteTypeDir, 'parser', `parser-${config.siteType}.js`);
    if (fs.existsSync(parserScript)) {
        try {
            execSync(`node "${parserScript}" "${config.projectName}" "${config.inputFile}"`, { stdio: 'inherit' });
        } catch (e) {
            console.error("❌ Parser failed.");
            process.exit(1);
        }
    } else {
        console.warn("⚠️ No parser found, skipping.");
    }

    // 6. Run Generator
    console.log('\n🏗️  Running Generator...');
    await createProject(config);

    // 7. Auto Sheet Provisioning
    let saPath = path.join(root, 'sheet-service-account.json');
    if (!fs.existsSync(saPath)) saPath = path.join(root, 'service-account.json');

    if (fs.existsSync(saPath)) {
        console.log('\n📊 Provisioning Google Sheet...');
        try {
            const { provisionSheet } = await import('../5-engine/auto-sheet-provisioner.js');
            // We pass null as clientEmail for now as CLI arg for it is not yet implemented, 
            // or we could add --email. For now, just provision.
            await provisionSheet(config.projectName, null);
        } catch (e) {
            console.error(`❌ Sheet provisioning failed: ${e.message}`);
        }
    } else {
        console.log("⚠️ No service account, skipping Sheet.");
    }

    // 8. Data Inject
    console.log('\n💉 Injecting Data...');
    const injector = path.join(__dirname, '../5-engine/sync-tsv-to-json.js');
    try {
        execSync(`node "${injector}" "${config.projectName}"`, { stdio: 'inherit' });
    } catch (e) {
        console.warn("⚠️ Data injection issue.");
    }

    // 9. Generate Variants (if --variants flag is set)
    if (values.variants !== undefined) {
        console.log('\n🎨 Generating style variants...');
        const variantOptions = {};
        if (values.variants && values.variants.length > 0) {
            variantOptions.styles = values.variants.split(',').map(s => s.trim());
        }
        generateVariants(config.projectName, variantOptions);
    }

    // 10. Summary
    console.log(`\n✨ DONE! Site created at ../sites/${config.projectName}`);
    if (values.deploy) {
        console.log("🚀 Deploying... (not yet implemented in CLI)");
        // TODO: call deploy script or git push
    }
}

main().catch(err => console.error(err));
