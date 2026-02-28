import { createProject } from '../5-engine/core/factory.js';

const config = {
    projectName: 'test-upgrade-site',
    clientEmail: 'test@example.com',
    siteType: 'basic-dock-type',
    siteModel: 'SPA',
    layoutName: 'standard', // Using standard layout from the site type
    blueprintFile: 'basic-dock-type.json',
    styleName: 'modern.css',
    autoSheet: false
};

console.log("🚀 Starting Test Upgrade Site Generation...");
try {
    await createProject(config);
    console.log("✅ Generation complete.");
    process.exit(0);
} catch (e) {
    console.error("❌ Generation failed:", e);
    process.exit(1);
}
