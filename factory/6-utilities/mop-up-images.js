import fs from 'fs';
import path from 'path';
import https from 'https';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITE_NAME = 'fpc-gent-site';
const sitePath = path.resolve(__dirname, '../../sites', SITE_NAME);
const dataPath = path.join(sitePath, 'public/data/pages');
const imagesPath = path.join(sitePath, 'public/images');

const agent = new https.Agent({ rejectUnauthorized: false });

async function download(url, target) {
    return new Promise((resolve) => {
        https.get(url, { agent }, (res) => {
            if (res.statusCode === 200) {
                const stream = fs.createWriteStream(target);
                res.pipe(stream);
                stream.on('finish', () => { stream.close(); resolve(true); });
            } else resolve(false);
        }).on('error', () => resolve(false));
    });
}

async function main() {
    const files = fs.readdirSync(dataPath).filter(f => f.endsWith('.json'));
    const missing = new Set();
    
    files.forEach(file => {
        const data = JSON.parse(fs.readFileSync(path.join(dataPath, file), 'utf8'));
        const images = data.meta?.images || [];
        images.forEach(img => {
            if (!fs.existsSync(path.join(imagesPath, img))) missing.add(img);
        });
    });

    console.log('🔍 Found ' + missing.size + ' missing images. Starting download...');
    
    for (let img of missing) {
        const url = 'https://www.fpcnv.be/wp-content/uploads/' + img; // Vereenvoudigde gok voor URL structuur
        const success = await download(url, path.join(imagesPath, img));
        if (success) console.log('✅ Recovered: ' + img);
    }
    console.log('🎉 Mop-up complete.');
}
main();
