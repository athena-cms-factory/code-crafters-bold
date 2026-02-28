/**
 * GithubController.js
 * @description Manages GitHub operations via gh CLI and API.
 */

import { execSync } from 'child_process';
import path from 'path';
import { deleteRemoteRepo } from '../wizards/cleanup-wizard.js';

export class GithubController {
    constructor(configManager, executionService) {
        this.configManager = configManager;
        this.execService = executionService;
    }

    /**
     * List all repositories for the configured owner(s)
     */
    async listRepositories() {
        const GITHUB_USER = (process.env.GITHUB_USER || '').trim();
        const GITHUB_ORG = (process.env.GITHUB_ORG || '').trim();
        const GITHUB_PAT = (process.env.GITHUB_PAT || '').trim();
        const owners = [GITHUB_ORG, GITHUB_USER].filter(Boolean);
        const allRepos = [];

        if (owners.length === 0) {
            throw new Error("Geen GITHUB_USER of GITHUB_ORG geconfigureerd in .env");
        }

        for (const owner of owners) {
            try {
                // Gebruik de gh CLI om repos op te halen
                const cmd = `gh repo list ${owner} --limit 300 --json name,owner,isPrivate,url,updatedAt`;
                const res = this.execService.runSync(cmd, { 
                    label: `GitHub List (${owner})`,
                    env: { GH_TOKEN: GITHUB_PAT }
                });

                if (res.success) {
                    const repos = JSON.parse(res.output);
                    repos.forEach(r => {
                        allRepos.push({
                            name: r.name,
                            fullName: `${r.owner.login}/${r.name}`,
                            owner: r.owner.login,
                            isPrivate: r.isPrivate,
                            url: r.url,
                            updatedAt: r.updatedAt
                        });
                    });
                }
            } catch (e) {
                console.error(`[GITHUB] Fout bij ophalen repos voor ${owner}:`, e.message);
            }
        }

        // Sorteer op laatst bijgewerkt
        return allRepos.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
    }

    /**
     * Delete a remote repository
     */
    async deleteRepository(fullName) {
        const { GITHUB_PAT } = process.env;
        try {
            const cmd = `gh repo delete ${fullName} --yes`;
            const res = this.execService.runSync(cmd, { 
                label: `GitHub Delete (${fullName})`,
                env: { GH_TOKEN: GITHUB_PAT }
            });

            if (res.success) {
                return { success: true, message: `Repository ${fullName} verwijderd.` };
            } else {
                throw new Error(res.error);
            }
        } catch (e) {
            throw new Error(`Kon repository ${fullName} niet verwijderen: ${e.message}`);
        }
    }
}
