/**
 * Gateway.js
 * @description The entry point for external communication (Mail/Webhook).
 * Routes natural language requests from customers to the Athena Agent logic.
 * v2: Added real IMAP support.
 */

import fs from 'fs';
import path from 'path';
import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { SiteController } from '../controllers/SiteController.js';
import { AthenaConfigManager } from './ConfigManager.js';

export class AthenaGateway {
    constructor(root) {
        this.root = root;
        this.config = new AthenaConfigManager(root);
        this.siteCtrl = new SiteController(this.config);
        this.inboxPath = path.join(root, 'input/gateway_inbox.json');
        
        // Mail Config
        this.mailConfig = {
            host: process.env.MAIL_HOST,
            port: parseInt(process.env.MAIL_PORT) || 993,
            secure: true,
            auth: {
                user: process.env.MAIL_USER,
                pass: process.env.MAIL_PASS
            }
        };
    }

    /**
     * Process an incoming request
     */
    async processRequest(request) {
        const { customerEmail, projectName, message } = request;
        
        console.log(`📩 Gateway ontvangen bericht van ${customerEmail} voor project ${projectName}`);
        console.log(`💬 Bericht: "${message}"`);

        try {
            const result = await this.siteCtrl.updateFromInstruction(projectName, message);
            return {
                success: true,
                reply: `Beste klant, ik heb je verzoek voor '${projectName}' verwerkt!\n\n` + 
                       `De volgende wijzigingen zijn doorgevoerd:\n` +
                       `${result.patches.map(p => `- ${p.key} in ${p.file} is nu "${p.value}"`).join('\n')}\n\n` +
                       `De wijzigingen zijn ook direct bijgewerkt in je Google Sheet.`,
                details: result
            };
        } catch (e) {
            return {
                success: false,
                reply: `Excuses, ik kon je verzoek niet automatisch verwerken. Foutmelding: ${e.message}`,
                error: e.message
            };
        }
    }

    /**
     * Process all pending messages in the file-based inbox once (No Daemon)
     */
    async processFileOnce() {
        console.log("📂 Gateway: Eenmalige check van input/gateway_inbox.json...");
        if (!fs.existsSync(this.inboxPath)) return;
        
        try {
            const content = fs.readFileSync(this.inboxPath, 'utf8');
            if (!content.trim()) {
                console.log("ℹ️  Geen berichten gevonden in lokale inbox.");
                return;
            }
            const request = JSON.parse(content);
            const response = await this.processRequest(request);
            console.log("✅ Bericht verwerkt. Resultaat:", response.reply.substring(0, 100) + "...");
            fs.writeFileSync(this.inboxPath, ""); // Clear
        } catch (e) {
            console.error("❌ Fout bij verwerken lokaal bericht:", e.message);
        }
    }

    /**
     * Check the live mailbox once and process pending mail (No Daemon)
     */
    async processMailOnce() {
        if (!this.mailConfig.auth.user || !this.mailConfig.auth.pass) {
            throw new Error("Geen MAIL credentials ingesteld.");
        }

        const client = new ImapFlow(this.mailConfig);
        console.log(`📡 Gateway: Eenmalige e-mail check op ${this.mailConfig.auth.user}...`);

        try {
            await client.connect();
            let lock = await client.getMailboxLock('INBOX');
            try {
                const messages = await client.fetch('1:*', { source: true, unread: true });
                let count = 0;
                for await (const msg of messages) {
                    const parsed = await simpleParser(msg.source);
                    const subject = parsed.subject || "";
                    const projectMatch = subject.match(/\[(.*?)\]/);
                    const projectName = projectMatch ? projectMatch[1] : null;

                    if (projectName) {
                        const request = {
                            customerEmail: parsed.from.value[0].address,
                            projectName: projectName,
                            message: parsed.text
                        };
                        await this.processRequest(request);
                        count++;
                    }
                }
                console.log(`✅ Klaar. ${count} e-mails verwerkt.`);
            } finally {
                lock.release();
                await client.logout();
            }
        } catch (e) {
            console.error("❌ IMAP Error:", e.message);
        }
    }

    /**
     * Simulation: Poll a JSON file (DAEMON MODE)
     */
    watchFileInbox() {
        console.log("👀 Gateway: Wachten op lokale berichten in input/gateway_inbox.json...");
        fs.watchFile(this.inboxPath, async (curr, prev) => {
            if (curr.mtime > prev.mtime) {
                try {
                    const content = fs.readFileSync(this.inboxPath, 'utf8');
                    if (!content.trim()) return;
                    const request = JSON.parse(content);
                    const response = await this.processRequest(request);
                    console.log("📤 Response generated for file-based request.");
                    fs.writeFileSync(this.inboxPath, ""); // Clear
                } catch (e) { console.error("❌ File Inbox Error:", e.message); }
            }
        });
    }

    /**
     * REAL WORLD: Listen to actual mailbox via IMAP
     */
    async startMailListener() {
        if (!this.mailConfig.auth.user || !this.mailConfig.auth.pass) {
            console.warn("⚠️  Geen MAIL_USER of MAIL_PASS ingesteld in .env. Mail-listener wordt overgeslagen.");
            return;
        }

        const client = new ImapFlow(this.mailConfig);
        client.on('error', err => {
            console.error("📡 IMAP Runtime Error:", err.message);
        });
        
        console.log(`📡 Gateway: Verbinding maken met mailbox ${this.mailConfig.auth.user}...`);

        try {
            await client.connect();
            let lock = await client.getMailboxLock('INBOX');
            
            try {
                console.log("✅ Gateway: Verbonden met mailbox. Wachten op nieuwe e-mails...");
                
                // Luister naar nieuwe berichten
                client.on('exists', async (data) => {
                    const messages = await client.fetch(client.mailbox.exists, { source: true });
                    for await (const msg of messages) {
                        const parsed = await simpleParser(msg.source);
                        const subject = parsed.subject || "";
                        
                        // Slimme herkenning van projectnaam in onderwerp [project-id]
                        const projectMatch = subject.match(/\[(.*?)\]/);
                        const projectName = projectMatch ? projectMatch[1] : null;

                        if (projectName) {
                            const request = {
                                customerEmail: parsed.from.value[0].address,
                                projectName: projectName,
                                message: parsed.text
                            };
                            const response = await this.processRequest(request);
                            console.log(`📤 E-mail afgehandeld voor ${projectName}. Antwoord klaar voor verzending.`);
                            // Hier zouden we node-mailer kunnen toevoegen om ECHT te replyen
                        }
                    }
                });

                // Idle om verbinding open te houden
                await client.idle();
            } finally {
                lock.release();
            }
        } catch (e) {
            console.error("❌ IMAP Connection Error:", e.message);
        }
    }
}
