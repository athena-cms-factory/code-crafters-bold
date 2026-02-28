const fs = require('fs');
const path = require('path');

const analysisPath = path.join(__dirname, '../../input/ingestion-analysis.json');
const data = JSON.parse(fs.readFileSync(analysisPath, 'utf8'));

// Manually parse the hacky string from ingestion-analysis.json
let repoStr = data.lists.repositories;
// Strip comments and eval it as a JS array
repoStr = repoStr.replace(/\/\/.*$/gm, '');
const repos = eval(repoStr);

const tsvDir = path.join(__dirname, '../../input/portfolio-kbm/tsv-data');
const listKeys = ["name", "description", "url", "updatedAt", "account"];
const header = listKeys.join('	');
const rows = repos.map(r => listKeys.map(k => r[k]).join('	')).join('
');

fs.writeFileSync(path.join(tsvDir, 'repositories.tsv'), header + '
' + rows);
console.log("✅ repositories.tsv successfully generated.");
