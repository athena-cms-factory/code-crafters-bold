const fs = require('fs');
const path = require('path');

/**
 * Athena Skeleton Extractor (v2.2 - Deep Search)
 * Extracts content and generates Athena-compatible TSV files for ingestion.
 */

const targetDir = process.argv[2] || '4-Dossiers/portfolio-kbm';
const rootDir = path.resolve(__dirname, '../../../../../');
const absoluteTargetDir = path.resolve(rootDir, targetDir);

console.log("==================================================");
console.log("💀 Athena Skeleton Extractor (v2.2)");
console.log(`📂 Scanning: ${targetDir}`);
console.log("==================================================\n");

if (!fs.existsSync(absoluteTargetDir)) {
    console.error(`❌ Error: Directory not found: ${absoluteTargetDir}`);
    process.exit(1);
}

const extractedData = {
    basisgegevens: {
        hero_title: "Developer Dossier: Karel",
        hero_subtitle: "Software-projecten en repositories ontwikkeld tijdens het re-integratietraject."
    },
    projects: []
};

// Simple Regex-based extractors
function extractContent(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    
    // Improved Hero Regex
    const heroTitleMatch = content.match(/className=["']hero-title["']>(.*?)<\/h1>/);
    if (heroTitleMatch) extractedData.basisgegevens.hero_title = heroTitleMatch[1].trim();

    const heroSubtitleMatch = content.match(/className=["']hero-subtitle["']>\s*(.*?)\s*<\/p>/s);
    if (heroSubtitleMatch) extractedData.basisgegevens.hero_subtitle = heroSubtitleMatch[1].trim();

    // Deep Search for objects
    if (content.includes('name:') && content.includes('description:')) {
        console.log(`✅ Analyzing file for objects: ${path.basename(filePath)}`);
        
        const names = [...content.matchAll(/name:\s*["'](.*?)["']/g)].map(m => m[1]);
        const descriptions = [...content.matchAll(/description:\s*["'](.*?)["']/g)].map(m => m[1]);
        const urls = [...content.matchAll(/url:\s*["'](.*?)["']/g)].map(m => m[1]);

        // We pakken de kortste lijst om mismatches te voorkomen
        const count = Math.min(names.length, descriptions.length, urls.length);
        if (count > 0 && names.length > 2) { // Meer dan 2 om boilerplate te negeren
             for (let i = 0; i < count; i++) {
                 // Filter uiteraard de 'portfolio-kbm' meta info als die te algemeen is
                 extractedData.projects.push({
                     title: names[i],
                     text: descriptions[i],
                     link: urls[i]
                 });
             }
             console.log(`   📊 Extracted ${count} items.`);
        }
    }
}

function walk(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') walk(fullPath);
        } else if (file.endsWith('.tsx') || file.endsWith('.html') || file.endsWith('.js')) {
            extractContent(fullPath);
        }
    }
}

const srcPath = path.join(absoluteTargetDir, 'src');
walk(fs.existsSync(srcPath) ? srcPath : absoluteTargetDir);

// TSV Generation
const projectName = path.basename(targetDir);
const tsvDir = path.join(rootDir, '2-Fabriek/athena/athena-x/input', projectName, 'tsv-data');
fs.mkdirSync(tsvDir, { recursive: true });

// 1. basisgegevens.tsv
const bgKeys = Object.keys(extractedData.basisgegevens);
const bgRow = bgKeys.map(k => extractedData.basisgegevens[k]);
fs.writeFileSync(path.join(tsvDir, 'basisgegevens.tsv'), bgKeys.join('\t') + '\n' + bgRow.join('\t'));

// 2. projects.tsv
if (extractedData.projects.length > 0) {
    const listKeys = Object.keys(extractedData.projects[0]);
    const listRows = extractedData.projects.map(item => listKeys.map(k => item[k]).join('\t'));
    fs.writeFileSync(path.join(tsvDir, 'projects.tsv'), listKeys.join('\t') + '\n' + listRows.join('\n'));
}

console.log("\n==================================================");
console.log("✨ SUCCES: Athena TSV Bridge Created!");
console.log(`📂 TSV files saved to: 2-Fabriek/athena/athena-x/input/${projectName}/tsv-data/`);
console.log("==================================================");
