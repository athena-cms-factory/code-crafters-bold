/**
 * 🤖 site-creator.js (HEADLESS)
 * @description Non-interactive site creation from idea/prompt.
 */

import { AthenaInterpreter } from '../core/interpreter.js';
import { loadEnv } from '../env-loader.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    const idea = process.argv[2];
    if (!idea) {
        console.error("❌ Error: No idea prompt provided.");
        process.exit(1);
    }

    // Load environment variables (API keys)
    const factoryRoot = path.resolve(__dirname, '../..');
    await loadEnv(path.join(factoryRoot, '.env'));

    console.log(`[AGENT] Processing idea: ${idea}`);

    const interpreter = new AthenaInterpreter(null);
    try {
        // We define some default sitetypes and styles for the interpreter to choose from
        const availableSiteTypes = ["portfolio", "agency", "business", "landing-page", "blog"];
        const availableStyles = ["tech", "professional", "minimal", "modern", "corporate"];

        console.log("🧠 Interpreting idea with AI...");
        const blueprint = await interpreter.interpretCreate(idea, availableSiteTypes, availableStyles);
        
        if (!blueprint || !blueprint.projectName) {
            throw new Error("AI could not generate a valid blueprint.");
        }

        console.log(`✅ Blueprint generated: ${blueprint.projectName}`);
        console.log(`📊 SiteType: ${blueprint.siteType}, Style: ${blueprint.styleName}`);

        // The input folder is located in athena-x/input (one level above factory/)
        const athenaXRoot = path.resolve(factoryRoot, '..');
        const inputDir = path.join(athenaXRoot, 'input');
        const projectPath = path.join(inputDir, blueprint.projectName);

        if (!fs.existsSync(projectPath)) {
            console.log(`📁 Creating project directory: ${projectPath}`);
            fs.mkdirSync(projectPath, { recursive: true });
        }

        const settingsPath = path.join(projectPath, 'site_settings.json');
        fs.writeFileSync(settingsPath, JSON.stringify(blueprint, null, 2));
        
        console.log(`✨ Project created successfully!`);
        console.log(`📍 Config: ${settingsPath}`);

    } catch (e) {
        console.error(`❌ Agent failure: ${e.message}`);
        process.exit(1);
    }
}

run();
