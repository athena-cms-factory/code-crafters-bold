/**
 * ConfigManager.js
 * @description Single source of truth for Athena configuration.
 * Handles environment variables, default ports, and project paths.
 */

import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import 'dotenv/config';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class AthenaConfigManager {
    constructor(root) {
        this.root = root || path.resolve(__dirname, '../../../..');
        this.config = this._loadConfig();
    }

    _loadConfig() {
        const env = process.env;
        
        // Defaults are now centralized here!
        return {
            ports: {
                dashboard: parseInt(env.DASHBOARD_PORT) || 5001,
                dock: parseInt(env.DOCK_PORT) || 5002,
                layout: parseInt(env.LAYOUT_EDITOR_PORT) || 5003,
                media: parseInt(env.MEDIA_MAPPER_PORT) || 5004,
                preview: parseInt(env.PREVIEW_PORT) || 5000
            },
            paths: {
                root: this.root,
                factory: path.join(this.root, 'factory'),
                sites: path.join(this.root, 'sites'),
                input: path.join(this.root, 'input'),
                logs: path.join(this.root, 'factory/output/logs'),
                config: path.join(this.root, 'factory/config'),
                templates: path.join(this.root, 'factory/2-templates'),
                sitetypes: path.join(this.root, 'factory/3-sitetypes'),
                engine: path.join(this.root, 'factory/5-engine'),
                skills: path.join(this.root, 'factory/SKILLS')
            },
            github: {
                user: env.GITHUB_USER || '',
                org: env.GITHUB_ORG || '',
                sshHost: env.GITHUB_SSH_HOST || 'github.com'
            }
        };
    }

    get(key) {
        const parts = key.split('.');
        let val = this.config;
        for (const part of parts) {
            val = val[part];
            if (val === undefined) return null;
        }
        return val;
    }

    getAll() {
        return this.config;
    }

    /**
     * Helper for shell scripts to query config
     */
    static query(key, root) {
        const cm = new AthenaConfigManager(root);
        console.log(cm.get(key));
    }
}
