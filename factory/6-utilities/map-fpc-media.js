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

function localize(val) {
    if (typeof val === 'string' && val.startsWith('http')) return path.basename(val);
    return val;
}

function processObject(obj) {
    let updated = false;
    const targetKeys = ['image', 'afbeelding', 'src', 'hero_image'];
    for (let key in obj) {
        if (targetKeys.includes(key)) {
            const localized = localize(obj[key]);
            if (localized !== obj[key]) {
                obj[key] = localized;
                updated = true;
            }
        }
        if (obj[key] && typeof obj[key] === 'object') {
            if (processObject(obj[key])) updated = true;
        }
    }
    return updated;
}

async function main() {
    dataPaths.forEach(dataPath => {
        if (!fs.existsSync(dataPath)) return;
        const files = fs.readdirSync(dataPath).filter(f => f.endsWith('.json'));
        console.log('🚀 Cleaning and Injecting ' + dataPath + ' (' + files.length + ' files)...');
        
        files.forEach(file => {
            const filePath = path.join(dataPath, file);
            const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
            let fileUpdated = false;
            
            if (data.meta?.images) {
                const orig = JSON.stringify(data.meta.images);
                data.meta.images = data.meta.images.map(img => localize(img));
                if (JSON.stringify(data.meta.images) !== orig) fileUpdated = true;
            }
            
            if (data.content && processObject(data.content)) fileUpdated = true;

            if (data.content && (!data.content.afbeelding || data.content.afbeelding === "")) {
                const candidates = (data.meta?.images || []).filter(img => img !== 'logo_share.jpg');
                const bestImage = candidates.length > 0 ? candidates[0] : (data.meta?.images?.[0] || "");
                
                if (bestImage && bestImage !== data.content.afbeelding) {
                    data.content.afbeelding = bestImage;
                    fileUpdated = true;
                }
            }

            if (fileUpdated) {
                fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
            }
        });
    });
    console.log('🎉 System Fix & Injection Complete.');
}
main();
