/**
 * ServerController.js
 * @description Manages background processes and development servers.
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export class ServerController {
    constructor(configManager, processManager, executionService) {
        this.configManager = configManager;
        this.pm = processManager;
        this.execService = executionService;
        this.root = configManager.get('paths.root');
        this.factoryDir = configManager.get('paths.factory');
    }

    /**
     * Check if a server is online on a specific port
     */
    checkStatus(port) {
        try {
            const active = this.pm.listActive();
            if (active[port]) return { online: true };
            
            // Fallback check via system ss (fuser is often missing on Chromebooks)
            const res = this.execService.runSync(`ss -tuln | grep :${port}`, { label: 'Port Check', silent: true });
            return { online: res.success };
        } catch (e) {
            return { online: false };
        }
    }

    /**
     * Stop a server by its type (mapping to configured ports)
     */
    async stopByType(type) {
        let port;
        const ports = this.configManager.get('ports');
        if (type === 'dock') port = ports.dock;
        if (type === 'layout') port = ports.layout;
        if (type === 'media') port = ports.media;
        if (type === 'preview') port = ports.preview;
        if (type === 'dashboard') port = ports.dashboard;

        if (port) {
            const stopped = await this.pm.stopProcessByPort(port);
            return { success: true, message: stopped ? `Server ${type} op poort ${port} gestopt.` : "Server was waarschijnlijk al gestopt." };
        }
        throw new Error("Onbekend server type");
    }

    /**
     * Get all active site and system servers
     */
    getActive(hostname = 'localhost') {
        const active = this.pm.listActive();
        const activeMap = new Map();
        const systemPorts = Object.values(this.configManager.get('ports') || {});

        const addServer = (port, info) => {
            if (!activeMap.has(port)) {
                if (port === (this.configManager.get('ports.dashboard') || 5001)) return;
                const isSystem = systemPorts.includes(port);
                activeMap.set(port, { ...info, isSystem });
            }
        };

        // 1. Add managed processes
        for (const port in active) {
            const info = active[port];
            addServer(parseInt(port), {
                siteName: info.id,
                port: parseInt(port),
                pid: info.pid,
                type: info.type,
                url: info.type === 'preview' ? `http://${hostname}:${port}/${info.id}/` : `http://${hostname}:${port}/`
            });
        }

        // 2. Discover unmanaged processes (started via CLI)
        const sitesDir = path.join(this.root, 'sites');
        if (fs.existsSync(sitesDir)) {
            const sites = fs.readdirSync(sitesDir).filter(f => fs.statSync(path.join(sitesDir, f)).isDirectory() && !f.startsWith('.'));
            
            for (const site of sites) {
                const siteDir = path.join(sitesDir, site);
                const port = this.getSitePort(site, siteDir);

                if (activeMap.has(port)) continue;

                const res = this.execService.runSync(`ss -tuln | grep :${port}`, { label: 'Port Discovery', silent: true });
                if (res.success) {
                    addServer(port, {
                        siteName: site,
                        port: port,
                        pid: 'external',
                        type: 'preview',
                        url: `http://${hostname}:${port}/${site}/`
                    });
                }
            }
        }

        return Array.from(activeMap.values());
    }

    /**
     * Kill a specific process by port
     */
    async kill(port) {
        await this.pm.stopProcessByPort(parseInt(port));
        return { success: true, message: `Server on port ${port} stopped` };
    }

    /**
     * Start the Layout Editor
     */
    async startLayoutEditor() {
        const port = this.configManager.get('ports.layout') || 5003;
        await this.pm.stopProcessByPort(port);
        this.pm.startProcess('layout-editor', 'editor', port, process.execPath, ['5-engine/layout-visualizer.js'], { cwd: this.factoryDir });
        return { success: true, message: `Layout Editor starting on port ${port}...` };
    }

    /**
     * Start the Media Visualizer
     */
    async startMediaVisualizer(siteName = null) {
        const port = this.configManager.get('ports.media') || 5004;
        await this.pm.stopProcessByPort(port);
        const args = ['5-engine/media-mapper.js'];
        if (siteName) args.push(siteName);
        this.pm.startProcess('media-mapper', 'editor', port, process.execPath, args, { cwd: this.factoryDir });
        return { success: true, message: `Media Mapper starting on port ${port}...` };
    }

    /**
     * Start the Athena Dock
     */
    async startDock() {
        const dockDir = path.join(this.root, 'dock');
        const port = this.configManager.get('ports.dock') || 5002;

        await this.pm.stopProcessByPort(port);

        if (!fs.existsSync(path.join(dockDir, 'node_modules'))) {
            execSync('pnpm install', { cwd: dockDir, stdio: 'inherit' });
        }

        this.pm.startProcess('athena-dock', 'dock', port, 'pnpm', ['dev', '--port', port.toString(), '--host'], { cwd: dockDir });
        return { success: true, message: `Athena Dock starting on port ${port}...` };
    }

    /**
     * Helper to get configured port for a site
     */
    getSitePort(siteId, siteDir) {
        const registryPath = path.join(this.factoryDir, 'config/site-ports.json');
        if (fs.existsSync(registryPath)) {
            try {
                const ports = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
                if (ports[siteId]) return ports[siteId];
            } catch (e) { }
        }

        const configPath = path.join(siteDir, 'vite.config.js');
        if (fs.existsSync(configPath)) {
            const content = fs.readFileSync(configPath, 'utf8');
            const match = content.match(/port:\s*(\d+)/);
            if (match) return parseInt(match[1]);
        }

        return 5000;
    }
}
