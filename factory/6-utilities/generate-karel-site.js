import { createProject } from '../5-engine/core/factory.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function run() {
    try {
        await createProject({
            projectName: 'karel-webdesign',
            blueprintFile: 'karel-webdesign.json',
            siteType: 'karel-webdesign',
            layoutName: 'original',
            styleName: 'modern',
            siteModel: 'SPA'
        });
        console.log('✅ Karel Webdesign site succesvol gegenereerd!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Fout bij genereren:', error);
        process.exit(1);
    }
}

run();
