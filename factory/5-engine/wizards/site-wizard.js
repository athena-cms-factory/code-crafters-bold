/**
 * @file wizard.js
 * @description De centrale, stapsgewijze wizard voor het aanmaken van Athena-websites.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { createProject, validateProjectName } from '../core/factory.js';
import { loadEnv } from '../env-loader.js';
import { rl, ask } from '../cli-interface.js';
import { provisionSheet } from '../auto-sheet-provisioner.js';
import { generateVariants, getAvailableThemes } from '../core/variant-generator.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ... (fetchUrlContent blijft gelijk) ...

// --- HOOFDFUNCTIE: WIZARD ---
async function runWizard() {
    await loadEnv(path.join(__dirname, '../.env'));

    const config = {
        siteModel: 'SPA', // Default
        autoSheet: false
    };
    const root = path.resolve(__dirname, '..'); // Bovenliggende map (athena/)

    // Stappen-volgorde
    const STEPS = {
        PROJECT_SELECT: 1,
        CONTENT_COLLECT: 2,
        SITE_MODEL_SELECT: 3, // NIEUW
        SITE_TYPE_SELECT: 4,
        PARSER_RUN: 5,
        IMAGE_PROMPTS: 6,
        LAYOUT_SELECT: 7,
        STYLE_SELECT: 8,
        CONFIRM_GEN: 9,
        VARIANT_GEN: 10,
        GOOGLE_SHEET: 11,
        DATA_INJECT: 12,
        FINISHED: 13
    };

    // --- HEADLESS / AGENT LOGIC ---
    const isHeadless = process.argv.includes('--headless');
    const ideaIndex = process.argv.indexOf('--idea');
    const ideaPrompt = ideaIndex > -1 ? process.argv[ideaIndex + 1] : null;

    if (ideaPrompt && isHeadless) {
        console.log(`🤖 AGENT MODE: Generating site from idea: "${ideaPrompt}"`);
        const interpreter = new AthenaInterpreter(null);
        try {
            const blueprint = await interpreter.interpretCreate(ideaPrompt, ["portfolio", "agency", "business"], ["tech", "professional", "minimal"]);
            console.log(`✅ Blueprint generated: ${blueprint.projectName}`);
            
            // Project aanmaken via factory.js logic
            const projectPath = path.join(root, 'input', blueprint.projectName);
            if (!fs.existsSync(projectPath)) {
                fs.mkdirSync(projectPath, { recursive: true });
                fs.writeFileSync(path.join(projectPath, 'site_settings.json'), JSON.stringify(blueprint, null, 2));
            }
            console.log(`✨ Project created at: ${projectPath}`);
            process.exit(0);
        } catch (e) {
            console.error(`❌ Agent failure: ${e.message}`);
            process.exit(1);
        }
    }

    let currentStep = STEPS.PROJECT_SELECT;

    while (currentStep < STEPS.FINISHED) {
        // console.clear(); // Optioneel: herstel dit als je een schone UI wilt bij elke stap
        console.log(`\n--- Stap ${currentStep}: ${Object.keys(STEPS).find(key => STEPS[key] === currentStep)} ---`);

        try {
            switch (currentStep) {
                case STEPS.PROJECT_SELECT: {
                    console.log("=======================================");
                    console.log("🧙‍♂️ Welkom bij de Athena Project Wizard");
                    console.log("=======================================");

                    const projectsDataDir = path.join(root, '../input');
                    if (!fs.existsSync(projectsDataDir)) {
                        fs.mkdirSync(projectsDataDir, { recursive: true });
                    }

                    const folders = fs.readdirSync(projectsDataDir).filter(f => {
                        const fullPath = path.join(projectsDataDir, f);
                        return fs.statSync(fullPath).isDirectory() && f !== '.git';
                    });

                    console.log('\n📁 Selecteer een project uit "../input":');
                    console.log('   [+] Nieuw Project (handmatig invoeren)');
                    folders.forEach((f, i) => console.log(`   [${i + 1}] ${f}`));
                    console.log('   [Q] Terug naar Dashboard');

                    const projectChoice = await ask('\n🚀 Maak een keuze: ');

                    if (projectChoice.trim().toUpperCase() === 'Q' || projectChoice.trim() === '<') {
                        console.log("👋 Terug naar Dashboard...");
                        process.exit(0);
                    }

                    if (projectChoice.trim() === '+') {
                        while (true) {
                            const rawName = await ask('\n🚀 Geef een nieuwe projectnaam (bv. "Bakkerij De Graankorrel") (of "<" voor terug): ');
                            if (rawName.trim() === '<') break; // Ga terug naar menu
                            const safeName = validateProjectName(rawName);
                            if (safeName.length < 3) {
                                console.log("❌ Naam te kort.");
                                continue;
                            }
                            const targetSiteDir = path.join(root, '../sites', safeName);
                            if (fs.existsSync(targetSiteDir)) {
                                console.log(`❌ Map "${safeName}" bestaat al in de sites-map.`);
                                continue;
                            }
                            config.projectName = safeName;
                            currentStep = STEPS.CONTENT_COLLECT;
                            break;
                        }
                    } else {
                        const folderIndex = parseInt(projectChoice, 10);
                        if (!isNaN(folderIndex) && folderIndex >= 1 && folderIndex <= folders.length) {
                            config.projectName = folders[folderIndex - 1];
                            console.log(`✅ Gekozen project: ${config.projectName}`);
                            currentStep = STEPS.CONTENT_COLLECT;
                        } else {
                            console.log("❌ Ongeldige keuze.");
                        }
                    }
                    break;
                }

                case STEPS.CONTENT_COLLECT: {
                    const inputDir = path.join(root, '../input', config.projectName, 'input');
                    if (!fs.existsSync(inputDir)) {
                        fs.mkdirSync(inputDir, { recursive: true });
                        console.log(`📂 Map aangemaakt: ../input/${config.projectName}/input/`);
                    }

                    const inputFilePath = path.join(inputDir, 'wizard-combined-input.txt');
                    config.inputFile = 'wizard-combined-input.txt';
                    let combinedContent = "";

                    console.log('\n📝 Content Verzamelen (voor de AI Parser)');

                    if (fs.existsSync(inputDir)) {
                        const existingFiles = fs.readdirSync(inputDir).filter(f => !f.startsWith('.'));
                        if (existingFiles.length > 0) {
                            console.log(`   Gevonden bestanden in "${config.projectName}/input/":`);
                            existingFiles.forEach((f, i) => console.log(`   - ${f}`));
                            const useExisting = await ask('\n💡 Wilt u alle bestaande bestanden in deze map gebruiken als input? (j/n, of "<" voor terug): ');
                            if (useExisting.trim() === '<') { currentStep = STEPS.PROJECT_SELECT; break; }

                            if (useExisting.toLowerCase() === 'j') {
                                existingFiles.forEach(f => {
                                    if (f !== config.inputFile) {
                                        const content = fs.readFileSync(path.join(inputDir, f), 'utf8');
                                        combinedContent += `--- BESTAND: ${f} ---\n${content}\n\n`;
                                    }
                                });
                                console.log("   ✅ Bestaande bestanden toegevoegd.");
                            }
                        }
                    }

                    if (combinedContent === "") {
                        console.log('   Voeg content toe. Type "=" als u klaar bent (of "<" voor terug).');
                        while (true) {
                            const choice = await ask('   [1] Plak tekst, [2] Bestand selecteren, [3] URL, [=] Klaar, [<] Terug: ');
                            if (choice === '<') { currentStep = STEPS.PROJECT_SELECT; break; }
                            if (choice === '=') {
                                if (combinedContent.trim() === "") combinedContent = `Projectnaam: ${config.projectName}`;
                                break;
                            }
                            if (choice === '1') {
                                console.log('   Plak tekst, typ "ENDE" op een nieuwe regel om te stoppen.');
                                let lines = [];
                                while (true) {
                                    const line = await ask('> ');
                                    if (line.trim().toUpperCase() === 'ENDE') break;
                                    lines.push(line);
                                }
                                combinedContent += `--- GEPLAKTE TEKST ---\n${lines.join('\n')}\n\n`;
                            } else if (choice === '2') {
                                const files = fs.readdirSync(inputDir).filter(f => !f.startsWith('.'));
                                if (files.length === 0) {
                                    console.log("❌ Geen bestanden.");
                                } else {
                                    files.forEach((f, i) => console.log(`   [${i + 1}] ${f}`));
                                    const fChoice = await ask('   Keuze: ');
                                    const fIdx = parseInt(fChoice, 10);
                                    if (!isNaN(fIdx) && fIdx >= 1 && fIdx <= files.length) {
                                        combinedContent += `--- BESTAND: ${files[fIdx - 1]} ---\n${fs.readFileSync(path.join(inputDir, files[fIdx - 1]), 'utf8')}\n\n`;
                                    }
                                }
                            } else if (choice === '3') {
                                const url = await ask('   URL: ');
                                if (url.trim()) {
                                    const content = await fetchUrlContent(url.trim());
                                    if (content) {
                                        combinedContent += `--- URL: ${url} ---\n${content}\n\n`;
                                    } else {
                                        combinedContent += `--- URL (niet opgehaald): ${url} ---\n\n`;
                                    }
                                }
                            }
                        }
                    }
                    if (currentStep === STEPS.CONTENT_COLLECT) {
                        fs.mkdirSync(path.dirname(inputFilePath), { recursive: true });
                        fs.writeFileSync(inputFilePath, combinedContent);
                        currentStep = STEPS.SITE_MODEL_SELECT;
                    }
                    break;
                }

                case STEPS.SITE_MODEL_SELECT: {
                    console.log('\n🏗️  Kies een architectuur model (of "<" voor terug):');
                    const models = ['SPA (Single-Page / Landing Page)', 'MPA (Multi-Page / Corporate)'];
                    models.forEach((m, i) => console.log(`  [${i + 1}] ${m}`));

                    const choice = await askWithValidation('🚀 Kies een nummer: ', models);
                    if (choice === '<') { currentStep = STEPS.CONTENT_COLLECT; break; }

                    config.siteModel = choice.startsWith('SPA') ? 'SPA' : 'MPA';
                    console.log(`✅ Gekozen model: ${config.siteModel}`);
                    currentStep = STEPS.SITE_TYPE_SELECT;
                    break;
                }

                case STEPS.SITE_TYPE_SELECT: {
                    const siteTypesDir = path.join(root, '3-sitetypes');
                    const siteTypes = fs.readdirSync(siteTypesDir).filter(f => fs.statSync(path.join(siteTypesDir, f)).isDirectory() && f !== '.gitkeep' && !f.startsWith('.'));

                    console.log('\n📜 Kies een type website (of "<" voor terug):');

                    // Toon in 2 kolommen
                    const colWidth = 30;
                    for (let i = 0; i < siteTypes.length; i += 2) {
                        const first = `  [${i + 1}] ${siteTypes[i]}`;
                        const second = siteTypes[i + 1] ? `  [${i + 2}] ${siteTypes[i + 1]}` : '';
                        console.log(first.padEnd(colWidth) + second);
                    }

                    const selectedSiteType = await askWithValidation('\n🚀 Kies een nummer: ', siteTypes);
                    if (selectedSiteType === '<') { currentStep = STEPS.CONTENT_COLLECT; break; }

                    config.siteType = selectedSiteType;
                    config.blueprintFile = path.join(selectedSiteType, 'blueprint', `${selectedSiteType}.json`);

                    // 1.1 Smart Defaults: Load blueprint to check for recommendations
                    try {
                        // Correct path construction: root/3-sitetypes/<type>/blueprint/<type>.json
                        const bpPath = path.join(root, '3-sitetypes', config.siteType, 'blueprint', `${config.siteType}.json`);
                        if (fs.existsSync(bpPath)) {
                            const bp = JSON.parse(fs.readFileSync(bpPath, 'utf8'));
                            config.recommended_layout = bp.recommended_layout;
                            config.recommended_style = bp.recommended_style;
                            if (config.recommended_layout) console.log(`💡 Blueprint raadt layout aan: ${config.recommended_layout}`);
                            if (config.recommended_style) console.log(`💡 Blueprint raadt stijl aan: ${config.recommended_style}`);
                        }
                    } catch (e) {
                        // Ignore error, just proceed without defaults
                    }

                    currentStep = STEPS.PARSER_RUN;
                    break;
                }

                case STEPS.PARSER_RUN: {
                    console.log('\n🤖 AI Parser wordt gestart...');
                    const parserScriptName = `parser-${config.siteType}.js`;
                    const parserScriptPath = path.join(root, '3-sitetypes', config.siteType, 'parser', parserScriptName);

                    if (fs.existsSync(parserScriptPath)) {
                        try {
                            execSync(`node "${parserScriptPath}" "${config.projectName}" "${config.inputFile}"`, { stdio: 'inherit' });

                            // Check of er daadwerkelijk TSV bestanden zijn gegenereerd
                            const tsvDir = path.join(root, '../input', config.projectName, 'tsv-data');
                            if (!fs.existsSync(tsvDir) || fs.readdirSync(tsvDir).length === 0) {
                                throw new Error("Parser voltooid maar geen TSV-bestanden gevonden in tsv-data.");
                            }

                            console.log('✅ Parser succesvol uitgevoerd en data staat klaar.');

                            // 1.3 Auto Data Inject na Parser
                            console.log('\n💉 Data injecteren...');
                            const injector = path.join(__dirname, 'sync-tsv-to-json.js');
                            execSync(`node "${injector}" "${config.projectName}"`, { stdio: 'inherit' });
                            console.log('✅ Data injectie voltooid!');

                        } catch (error) {
                            console.error(`❌ Fout tijdens parser/injectie: ${error.message}`);
                            const retry = await ask('Nogmaals proberen? (j/n, of "<" voor terug naar type): ');
                            if (retry === '<') { currentStep = STEPS.SITE_TYPE_SELECT; break; }
                            if (retry.toLowerCase() !== 'j') { currentStep = STEPS.SITE_TYPE_SELECT; break; }
                            break; // Opnieuw in deze case
                        }
                    } else {
                        console.log(`⚠️ Geen parser script gevonden voor ${config.siteType}. Sla over.`);
                    }
                    currentStep = STEPS.IMAGE_PROMPTS;
                    break;
                }

                case STEPS.IMAGE_PROMPTS: {
                    const resultsDir = path.join(root, '../input', config.projectName, 'tsv-data');
                    if (fs.existsSync(resultsDir)) {
                        // Default to YES for image prompts to speed up flow, or make it configurable. 
                        // Keeping manual for now as per plan focus on other areas, or maybe auto?
                        // Plan says "Smart Defaults", maybe valid here too.
                        // Let's keep it manual but default to 'j' if they just press enter? 
                        // ask() doesn't support default yet.
                        const choice = await ask('\n🎨 Wilt u dat de AI image prompts genereert? (j/n, of "<" voor terug): ');
                        if (choice === '<') { currentStep = STEPS.SITE_TYPE_SELECT; break; }
                        if (choice.toLowerCase() === 'j') {
                            console.log('🤖 AI Art Director wordt gestart...');
                            const imageScriptPath = path.join(root, '5-engine', 'generate-image-prompts.js');
                            try {
                                execSync(`node "${imageScriptPath}" "${config.projectName}"`, { stdio: 'inherit' });
                            } catch (e) {
                                console.error(`❌ Fout image prompts: ${e.message}`);
                            }
                        }
                    }
                    currentStep = STEPS.LAYOUT_SELECT;
                    break;
                }

                case STEPS.LAYOUT_SELECT: {
                    // Smart Default: Auto-select recommended layout
                    if (config.recommended_layout) {
                        const layoutsDir = path.join(root, '3-sitetypes', config.siteType, 'web');
                        // Verify it exists
                        if (fs.existsSync(path.join(layoutsDir, config.recommended_layout))) {
                            config.layoutName = config.recommended_layout;
                            console.log(`⏩ Auto-select layout: ${config.layoutName}`);
                            currentStep = STEPS.STYLE_SELECT;
                            break;
                        }
                    }

                    const layoutsDir = path.join(root, '3-sitetypes', config.siteType, 'web');
                    const layouts = fs.readdirSync(layoutsDir).filter(f => fs.statSync(path.join(layoutsDir, f)).isDirectory());

                    console.log('\n🏗️  Kies een layout (of "<" voor terug):');
                    layouts.forEach((l, i) => console.log(`  [${i + 1}] ${l}`));
                    const layout = await askWithValidation('Kies een nummer: ', layouts);
                    if (layout === '<') { currentStep = STEPS.IMAGE_PROMPTS; break; }
                    config.layoutName = layout;
                    currentStep = STEPS.STYLE_SELECT;
                    break;
                }

                case STEPS.STYLE_SELECT: {
                    const stylesDir = path.join(root, '2-templates/css');
                    const styles = fs.readdirSync(stylesDir).filter(f => f.endsWith('.css'));

                    // Smart Default: Recommended Style -> Modern -> user choice
                    if (config.recommended_style) {
                        const styleFile = config.recommended_style.endsWith('.css') ? config.recommended_style : `${config.recommended_style}.css`;
                        if (styles.includes(styleFile)) {
                            config.styleName = styleFile;
                            console.log(`⏩ Auto-select stijl: ${config.styleName}`);
                            currentStep = STEPS.CONFIRM_GEN;
                            break;
                        }
                    }

                    // Fallback to 'modern.css' if no recommendation
                    if (styles.includes('modern.css')) {
                        config.styleName = 'modern.css';
                        console.log(`⏩ Default stijl: modern.css (Geen specifieke aanbeveling in blueprint)`);
                        currentStep = STEPS.CONFIRM_GEN;
                        break;
                    }

                    console.log('\n💅 Kies een visuele stijl (of "<" voor terug):');
                    styles.forEach((s, i) => console.log(`  [${i + 1}] ${s.replace('.css', '')}`));
                    const style = await askWithValidation('Kies een nummer: ', styles);
                    if (style === '<') { currentStep = STEPS.LAYOUT_SELECT; break; }
                    config.styleName = style;
                    currentStep = STEPS.CONFIRM_GEN;
                    break;
                }

                case STEPS.CONFIRM_GEN: {
                    console.log('\n📋 Samenvatting:');
                    console.log(`- Project: ${config.projectName}`);
                    console.log(`- Model: ${config.siteModel}`);
                    console.log(`- Type: ${config.siteType}`);
                    console.log(`- Layout: ${config.layoutName}`);
                    console.log(`- Stijl: ${config.styleName}`);

                    const start = await ask('\nStart de generatie? (j/n, of "<" voor terug): ');
                    if (start === '<') { currentStep = STEPS.STYLE_SELECT; break; }
                    if (start.toLowerCase() === 'j') {
                        // 1.2 Auto Sheet Provisioning by Default
                        // Check if service account exists
                        let saPath = path.join(root, 'sheet-service-account.json');
                        if (!fs.existsSync(saPath)) saPath = path.join(root, 'service-account.json');

                        if (fs.existsSync(saPath)) {
                            config.autoSheet = true;
                            // Try to get client email from SA if not provided (usually client_email in SA is the bot, 
                            // we need the user's email to share WITH. 
                            // Wait, provisionSheet needs a target email to share with? 
                            // In auto-sheet-provisioner.js, it says: "emailAddress: saEmail" (sharing with robot).
                            // But it also wants to give the USER access probably?
                            // The original wizard prompted: "E-mailadres van de klant (voor schrijfrechten)"
                            // Let's see if we can skip this or ask it once.
                            // For 'Quick Wins', maybe we just log the URL and let the user request access or make the sheet public/link-sharing?
                            // The provisioner script sets: "Iedereen met de link" (wait, does it?)
                            // auto-sheet-provisioner.js code: `requestBody: { role: 'writer', type: 'user', emailAddress: saEmail }` -> shares with BOT.
                            // It does NOT seem to set "Anyone with link" explicitly in the code I saw (only adds permission for SA).
                            // So the user (Karel) needs access.
                            // Best approach: Ask for email once, or assume the user wants to configure it later?
                            // The plan says: "Alleen handmatige fallback als auto-provisioning faalt".
                            // Let's ask for the email to be safe, but default to auto-provisioning.

                            console.log("\n📊 Auto-provisioning Google Sheet...");
                            // Check if we have a cached email or env var?
                            // For now, prompt but assume YES to provisioning.
                            if (!config.clientEmail) {
                                config.clientEmail = await ask('📧 E-mailadres voor toegang tot de Sheet (optioneel, enter=skip): ');
                            }
                        } else {
                            config.autoSheet = false;
                            console.log("\n⚠️ Geen service-account.json gevonden. Overschakelen op handmatige Sheet modus.");
                        }

                        await createProject(config);

                        const siteDir = path.join(root, '../sites', config.projectName);
                        const imagesDir = path.join(siteDir, 'public', 'images');
                        if (!fs.existsSync(imagesDir)) fs.mkdirSync(imagesDir, { recursive: true });

                        // Go to variant generation step first
                        currentStep = STEPS.VARIANT_GEN;
                    } else {
                        console.log('Geannuleerd.');
                        return;
                    }
                    break;
                }

                case STEPS.VARIANT_GEN: {
                    const themes = getAvailableThemes();
                    console.log(`\n🎨 Stijl-varianten genereren`);
                    console.log(`   Beschikbare stijlen: ${themes.join(', ')}`);
                    const variantChoice = await ask('\n💅 Wilt u extra stijl-varianten genereren van deze site? (j/n, of "<" voor terug): ');

                    if (variantChoice === '<') { currentStep = STEPS.CONFIRM_GEN; break; }

                    if (variantChoice.toLowerCase() === 'j') {
                        const specificChoice = await ask(`   Alle varianten of specifiek? [1] Alle, [2] Specifiek kiezen: `);

                        let variantOptions = {};
                        if (specificChoice === '2') {
                            console.log('   Beschikbare stijlen:');
                            themes.forEach((t, i) => console.log(`     [${i + 1}] ${t}`));
                            const selected = await ask('   Kies nummers (komma-gescheiden, bv. "1,3,5"): ');
                            const indices = selected.split(',').map(s => parseInt(s.trim(), 10)).filter(n => !isNaN(n) && n >= 1 && n <= themes.length);
                            variantOptions.styles = indices.map(i => themes[i - 1]);
                        }

                        generateVariants(config.projectName, variantOptions);
                    } else {
                        console.log('   ⏩ Varianten overgeslagen.');
                    }

                    // Continue to sheet provisioning
                    if (config.autoSheet) {
                        try {
                            const { provisionSheet } = await import('./auto-sheet-provisioner.js');
                            await provisionSheet(config.projectName, config.clientEmail);
                        } catch (e) {
                            console.error(`❌ Auto-provisioning mislukt: ${e.message}`);
                            console.log("Overschakelen naar handmatige modus...");
                            currentStep = STEPS.GOOGLE_SHEET;
                            break;
                        }
                        currentStep = STEPS.FINISHED;
                    } else {
                        currentStep = STEPS.GOOGLE_SHEET;
                    }
                    break;
                }

                case STEPS.GOOGLE_SHEET: {
                    // Deze case wordt alleen uitgevoerd als autoSheet FALSE was
                    console.log("\n" + "=".repeat(60));
                    console.log("📊 Handmatige Google Sheet Koppeling");
                    console.log("=".repeat(60));
                    // ... (bestaande instructies) ...
                    console.log("\x1b[31m⚠️  LET OP: Een gekoppelde Google Sheet is ONONTBEERLIJK voor een werkende deployment!\x1b[0m");
                    console.log("Zonder deze koppeling zal de automatische deployment op GitHub falen.");
                    console.log("\nDe AI heeft een datastructuur gegenereerd. Voor een werkend CMS");
                    console.log("moet u nu een Google Sheet koppelen.");
                    console.log("\nINSTRUCTIES:");
                    console.log("1. Maak een nieuwe Google Sheet aan.");
                    console.log("2. Maak tabbladen aan volgens de blueprint.");
                    console.log("3. Publiceer via 'Bestand' > 'Delen' > 'Publiceren op internet' (TSV).");
                    console.log("4. Zet 'Algemene toegang' op 'Iedereen met de link'.");
                    console.log("5. Deel de Sheet met het 'client_email' uit uw service-account (zie hieronder).");
                    console.log("6. Kopieer de URL uit de ADRESBALK (Edit URL).");
                    console.log("7. Kopieer de URL uit 'Publiceren op internet' (Export URL).");
                    console.log("\n💡 TIP: Je kunt deze stap nu overslaan en later uitvoeren via");
                    console.log("        optie [6] 'Sheet Linker' in het master dashboard.");

                    const sheetUrl = await ask('\n🔗 Edit URL (of druk op Enter om over te slaan): ');
                    if (sheetUrl === '<') { currentStep = STEPS.CONFIRM_GEN; break; }

                    if (sheetUrl.trim()) {
                        const pubUrl = await ask('🔗 Publicatie URL (Optioneel, voor betere werking): ');
                        const urlScript = path.join(root, '5-engine', 'generate-url-sheet.js');

                        try {
                            // Geef zowel sheetUrl als pubUrl door aan het script
                            // We gebruiken quotes om spaties of vreemde tekens in URL's veilig te stellen
                            const safeSheetUrl = sheetUrl.trim();
                            const safePubUrl = pubUrl.trim();

                            execSync(`node "${urlScript}" "${config.projectName}" "${safeSheetUrl}" "${safePubUrl}"`, { stdio: 'inherit' });
                            console.log('✅ Google Sheet succesvol gekoppeld.');

                            // Check voor service account om email te tonen
                            let saPath = path.join(root, 'sheet-service-account.json');
                            if (!fs.existsSync(saPath)) saPath = path.join(root, 'service-account.json');

                            if (fs.existsSync(saPath)) {
                                try {
                                    const saData = JSON.parse(fs.readFileSync(saPath, 'utf8'));
                                    if (saData.client_email) {
                                        console.log(`\n🔑 \x1b[33mBELANGRIJK: Deel uw Google Sheet met dit e-mailadres als 'Bewerker':\x1b[0m`);
                                        console.log(`\x1b[36m${saData.client_email}\x1b[0m\n`);
                                    }
                                } catch (e) { /* Negeer leesfout */ }

                                const fileName = path.basename(saPath);
                                const auto = await ask(`🚀 "${fileName}" gevonden! Data automatisch uploaden? (j/n): `);
                                if (auto.toLowerCase() === 'j') {
                                    const uploader = path.join(root, '5-engine', 'sync-tsv-to-sheet.js');
                                    const ghUser = process.env.GITHUB_USER || "";
                                    try {
                                        execSync(`node "${uploader}" "${config.projectName}" "${sheetUrl}" "${saPath}" "${ghUser}" "${config.projectName}"`, { stdio: 'inherit' });
                                    } catch (e) {
                                        showManualCopyInstructions(config.projectName);
                                    }
                                } else {
                                    showManualCopyInstructions(config.projectName);
                                }
                            } else {
                                console.log("\n   (Geen service-account gevonden. Sla 'sheet-service-account.json' op voor auto-upload.)");
                                showManualCopyInstructions(config.projectName);
                            }
                        } catch (e) {
                            console.error(`❌ Fout koppeling: ${e.message}`);
                        }
                    } else {
                        console.log("⚠️ Google Sheet koppeling overgeslagen.");
                    }
                    currentStep = STEPS.DATA_INJECT;
                    break;
                }

                case STEPS.DATA_INJECT: {
                    console.log('\n💉 Data injecteren...');
                    const injector = path.join(__dirname, 'sync-tsv-to-json.js');
                    try {
                        execSync(`node "${injector}" "${config.projectName}"`, { stdio: 'inherit' });
                        console.log('✅ Klaar!');
                        currentStep = STEPS.FINISHED;
                    } catch (e) {
                        console.error(`❌ Fout injectie: ${e.message}`);
                        currentStep = STEPS.FINISHED;
                    }
                    break;
                }
            }
        } catch (error) {
            console.error(`\x1b[31m❌ Onverwachte fout: ${error.message}\x1b[0m`);
            break;
        }
    }

    console.log('\n🚀 Wizard voltooid!');
    if (config.projectName) {
        console.log(`   Ga naar ../sites/${config.projectName} en start met: pnpm dev`);
    }
    rl.close();
}

// Update askWithValidation to handle '<' and empty inputs
async function askWithValidation(query, options) {
    if (!options || options.length === 0) {
        console.error("❌ Fout: Geen opties beschikbaar.");
        return '<';
    }

    while (true) {
        const rawAnswer = await ask(query);
        const answer = rawAnswer.trim();

        if (answer === '<') return '<';

        if (answer === '') {
            console.log(`\n⚠️  Geen keuze gemaakt. Voer een nummer in tussen 1 en ${options.length} (of '<' om terug te gaan).`);
            continue;
        }

        const index = parseInt(answer, 10);
        if (!isNaN(index) && index >= 1 && index <= options.length) {
            return options[index - 1];
        }

        console.log(`\n❌ Ongeldige keuze: "${answer}". Voer een nummer in tussen 1 en ${options.length} (of '<').`);
    }
}

function showManualCopyInstructions(projectName) {
    console.log("\n\x1b[33m💡 BELANGRIJK: Kopieer de geparseerde data naar de Sheet!");
    console.log("De AI heeft al data voor u voorbereid. Gebruik dit commando om de data te zien:");
    console.log(`\x1b[36mnode 5-engine/copy-data-helper.js ${projectName}\x1b[0m`);
    console.log("\x1b[33mKopieer de inhoud per tabel naar het bijbehorende tabblad in de Google Sheet.\x1b[0m");
}

runWizard();
