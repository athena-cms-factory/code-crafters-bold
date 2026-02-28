/**
 * ProcessManager.js
 * @description Centralized process management for Athena.
 * Handles spawning, tracking, and stopping site-specific processes.
 */

import { spawn, execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

export class AthenaProcessManager {
    constructor(root) {
        // Zorg dat we altijd naar de juiste factory/config map wijzen, 
        // ook als root de factory map zelf is.
        this.root = root.endsWith('factory') ? path.dirname(root) : root;
        this.registryPath = path.join(this.root, 'factory/config/active-processes.json');
        this.logDir = path.join(this.root, 'factory/output/logs');
        this._ensureDirs();
    }

    _ensureDirs() {
        if (!fs.existsSync(path.dirname(this.registryPath))) {
            fs.mkdirSync(path.dirname(this.registryPath), { recursive: true });
        }
        if (!fs.existsSync(this.logDir)) {
            fs.mkdirSync(this.logDir, { recursive: true });
        }
    }

    /**
     * Get the current process registry
     */
    getRegistry() {
        if (!fs.existsSync(this.registryPath)) return {};
        try {
            return JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
        } catch (e) {
            return {};
        }
    }

    /**
     * Save the process registry
     */
    saveRegistry(registry) {
        fs.writeFileSync(this.registryPath, JSON.stringify(registry, null, 2));
    }

    /**
     * Spawn a detached process and track it
     */
    startProcess(id, type, port, command, args, options = {}) {
        const logFile = path.join(this.logDir, `${id}-${type}.log`);
        const out = fs.openSync(logFile, 'a');
        const err = fs.openSync(logFile, 'a');

        const child = spawn(command, args, {
            ...options,
            detached: true,
            stdio: ['ignore', out, err]
        });

        child.unref();

        const registry = this.getRegistry();
        registry[port] = {
            pid: child.pid,
            id,
            type,
            startTime: new Date().toISOString(),
            logFile
        };
        this.saveRegistry(registry);

        console.log(`🚀 Started ${type} for '${id}' on port ${port} (PID: ${child.pid})`);
        return child.pid;
    }

    /**
     * Stop a process by port
     */
    async stopProcessByPort(port) {
        const registry = this.getRegistry();
        const info = registry[port];

        if (info && info.pid) {
            try {
                process.kill(-info.pid); // Kill process group if detached
                console.log(`🛑 Stopped process group ${info.pid} on port ${port}`);
            } catch (e) {
                // Fallback to simple kill if group kill fails
                try {
                    process.kill(info.pid);
                    console.log(`🛑 Stopped process ${info.pid} on port ${port}`);
                } catch (err) {
                    console.log(`⚠️ Process ${info.pid} already dead?`);
                }
            }
            delete registry[port];
            this.saveRegistry(registry);
            return true;
        }

        // Fallback: use ss to find PID if not in registry (fuser is often missing)
        try {
            console.log(`🔍 Port ${port} not in registry. Using ss fallback...`);
            const pidMatch = execSync(`ss -tunlp | grep :${port}`, { encoding: 'utf8' })
                .match(/users:\(\(".*",pid=(\d+),/);
            
            if (pidMatch && pidMatch[1]) {
                const pid = parseInt(pidMatch[1]);
                process.kill(pid);
                console.log(`🛑 Stopped external process ${pid} on port ${port}`);
                return true;
            }
            return false;
        } catch (e) {
            return false;
        }
    }

    /**
     * List all active processes (verifying they are still alive)
     */
    listActive() {
        const registry = this.getRegistry();
        const active = {};
        let changed = false;

        for (const port in registry) {
            const pid = registry[port].pid;
            try {
                process.kill(pid, 0); // Check if alive
                active[port] = registry[port];
            } catch (e) {
                changed = true;
                console.log(`🧹 Cleaning up stale registry entry for port ${port}`);
            }
        }

        if (changed) this.saveRegistry(active);
        return active;
    }
}
