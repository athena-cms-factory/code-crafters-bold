import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check if we are running in /tmp/fpc-fix
const isTmpFix = process.cwd().includes('fpc-fix');
const baseDir = isTmpFix ? process.cwd() : path.resolve(__dirname, '../../sites/fpc-gent-site');

const dataPaths = [
    path.join(baseDir, 'src/data/pages'),
    path.join(baseDir, 'public/data/pages'),
    path.join(baseDir, 'dist/data/pages')
];

function normalizeFields(obj) {
    let updated = false;
    const sourceKeys = ['image', 'foto', 'src'];
    
    for (let key of sourceKeys) {
        if (obj[key] !== undefined && obj[key] !== null) {
            if (obj['afbeelding'] === undefined || obj['afbeelding'] === null || obj['afbeelding'] === "") {
                obj['afbeelding'] = obj[key];
                updated = true;
            }
        }
    }

    for (let key in obj) {
        if (obj[key] && typeof obj[key] === 'object') {
            if (normalizeFields(obj[key])) updated = true;
        }
    }
    
    return updated;
}

async function main() {
    dataPaths.forEach(dataPath => {
        if (!fs.existsSync(dataPath)) {
            console.log('⚠️ Skipping ' + dataPath + ' (not found)');
            return;
        }
        const files = fs.readdirSync(dataPath).filter(f => f.endsWith('.json'));
        console.log('🚀 Normalizing fields in ' + dataPath + ' (' + files.length + ' files)...');
        
        files.forEach(file => {
            const filePath = path.join(dataPath, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            
            if (normalizeFields(data)) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            }
        });
    });
    console.log('🎉 Normalization Complete.');
}
main();
