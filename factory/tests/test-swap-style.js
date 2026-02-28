import { createProject } from '../5-engine/core/factory.js';
import fs from 'fs';
import path from 'path';

// Manual check logic since we can't run the full server environment easily here
console.log("🛠 Testing Swap Style Logic...");

const mainPath = 'sites/test-upgrade-site/src/main.jsx';
if (!fs.existsSync(mainPath)) {
    console.error("❌ Test site not found!");
    process.exit(1);
}

// Simulate what the plugin does
let content = fs.readFileSync(mainPath, 'utf8');
const newValue = 'classic.css';
const cssImportRegex = /(import\s+['"]\.\/css\/)[a-zA-Z0-9\-_]+\.css(['"])/;

if (cssImportRegex.test(content)) {
    const newContent = content.replace(cssImportRegex, `$1${newValue}$2`);
    console.log("✅ Regex Match Found!");
    console.log("Old Line:", content.match(cssImportRegex)[0]);
    console.log("New Line:", newContent.match(cssImportRegex)[0]);

    // Verify it produces desired output
    if (newContent.includes("import './css/classic.css'")) {
        console.log("🎉 SUCCESS: Logic is valid.");
    } else {
        console.error("❌ FAILURE: Replacement incorrect.");
    }
} else {
    console.error("❌ Regex did not match content.");
    console.log("Content start:", content.substring(0, 200));
}
