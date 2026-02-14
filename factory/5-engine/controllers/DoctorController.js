/**
 * DoctorController.js
 * @description The immune system of Athena Factory.
 * Audits sites for integrity issues and auto-heals them.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export class DoctorController {
    constructor(configManager) {
        this.configManager = configManager;
        this.sitesDir = configManager.get('paths.sites');
    }

    /**
     * Audit a specific site or all sites
     * @param {string} siteName (Optional)
     */
    audit(siteName = null) {
        if (siteName) return this._auditSite(siteName);

        const sites = fs.readdirSync(this.sitesDir).filter(f => 
            fs.statSync(path.join(this.sitesDir, f)).isDirectory() && !f.startsWith('.') && f !== 'athena-cms'
        );

        const results = sites.map(s => this._auditSite(s));
        return results;
    }

    _auditSite(siteName) {
        const siteDir = path.join(this.sitesDir, siteName);
        const report = { site: siteName, status: 'healthy', issues: [], fixes: [] };

        // 1. Check node_modules
        if (!fs.existsSync(path.join(siteDir, 'node_modules'))) {
            report.status = 'broken';
            report.issues.push('Missing node_modules');
        }

        // 2. Check JSON Integrity
        const dataDir = path.join(siteDir, 'src/data');
        if (fs.existsSync(dataDir)) {
            const files = fs.readdirSync(dataDir).filter(f => f.endsWith('.json'));
            for (const file of files) {
                try {
                    const content = fs.readFileSync(path.join(dataDir, file), 'utf8');
                    JSON.parse(content);
                    if (content.trim().length < 5) {
                        report.status = 'warning';
                        report.issues.push(`Empty JSON file: ${file}`);
                    }
                } catch (e) {
                    report.status = 'broken';
                    report.issues.push(`Corrupt JSON file: ${file}`);
                }
            }
        } else {
            report.status = 'broken';
            report.issues.push('Missing src/data directory');
        }

        return report;
    }

    /**
     * Attempt to heal a broken site
     */
    async heal(siteName) {
        const audit = this._auditSite(siteName);
        if (audit.status === 'healthy') return { success: true, message: "Site is already healthy." };

        console.log(`🚑 Doctor: Starting healing process for ${siteName}...`);
        const fixes = [];

        // Fix 1: Missing node_modules
        if (audit.issues.includes('Missing node_modules')) {
            try {
                console.log(`   📦 Installing dependencies...`);
                execSync('pnpm install --no-frozen-lockfile', { cwd: path.join(this.sitesDir, siteName), stdio: 'ignore' });
                fixes.push('Reinstalled dependencies');
            } catch (e) {
                console.error(`   ❌ Install failed: ${e.message}`);
            }
        }

        // Fix 2: Corrupt/Empty JSON (Restore from Backup if available)
        // TODO: Implement backup restore logic via DataManager

        return { success: true, message: `Healed ${fixes.length} issues.`, fixes };
    }
}
