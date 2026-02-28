/**
 * InstallManager.js
 * @description Manages background installation processes with output capturing.
 */

import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

export class InstallManager {
    constructor(root) {
        this.root = root;
        this.factoryDir = path.join(root, 'factory');
        this.logDir = path.join(this.factoryDir, 'output/logs/installs');
        this.activeInstalls = new Map(); // name -> { startTime, pid, logFile, status: 'running'|'success'|'failed' }
        
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Start installation for a site
     */
    async install(name, siteDir) {
        if (this.activeInstalls.has(name) && this.activeInstalls.get(name).status === 'running') {
            return { success: true, message: "Installatie is al bezig" };
        }

        const logFile = path.join(this.logDir, `${name}.log`);
        const out = fs.openSync(logFile, 'w');
        
        console.log(`[INSTALL] Starting pnpm install for ${name}...`);
        
        const child = spawn('pnpm', ['install'], {
            cwd: siteDir,
            detached: true,
            stdio: ['ignore', out, out],
            env: { ...process.env }
        });

        const installInfo = {
            pid: child.pid,
            startTime: new Date().toISOString(),
            logFile,
            status: 'running',
            error: null
        };

        this.activeInstalls.set(name, installInfo);

        child.on('close', (code) => {
            const info = this.activeInstalls.get(name);
            if (info) {
                info.status = code === 0 ? 'success' : 'failed';
                info.endTime = new Date().toISOString();
                if (code !== 0) info.error = `Exit code ${code}`;
                console.log(`[INSTALL] pnpm install for ${name} finished with code ${code}`);
            }
            fs.closeSync(out);
        });

        child.unref();
        return { success: true, logFile };
    }

    /**
     * Get status and tail of log
     */
    getStatus(name) {
        const info = this.activeInstalls.get(name);
        if (!info) {
            // Check if log file exists even if not in memory (after dashboard restart)
            const logFile = path.join(this.logDir, `${name}.log`);
            if (fs.existsSync(logFile)) {
                return { status: 'idle', logFile };
            }
            return { status: 'none' };
        }

        let logTail = "";
        try {
            if (fs.existsSync(info.logFile)) {
                const content = fs.readFileSync(info.logFile, 'utf8');
                const lines = content.split('\n');
                logTail = lines.slice(-20).join('\n');
            }
        } catch (e) { }

        return { ...info, logTail };
    }

    /**
     * Clear install history for a site
     */
    clear(name) {
        this.activeInstalls.delete(name);
    }
}
