/**
 * @file simulate-customers.js
 * @description Simuleert klanten die opdrachten sturen naar de Athena Factory.
 * Dit script voedt de lokale inbox zodat we de autonome loop kunnen testen.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.resolve(__dirname, '../..');
const inboxPath = path.join(root, 'input/gateway_inbox.json');

const personas = [
    {
        name: "Bakkerij De Zonnebloem",
        email: "info@bakkerijzonnebloem.be",
        project: "demo-bakkerij",
        requests: [
            "Kun je de titel van de site veranderen naar 'Ambachtelijk Brood & Gebak'?",
            "Ik wil graag dat de hoofdkleur van de site meer naar warm oranje gaat.",
            "Voeg een blogpost toe over ons nieuwe zuurdesembrood."
        ]
    },
    {
        name: "Advocatenkantoor Peeters",
        email: "contact@peeters-law.be",
        project: "demo-consultant",
        requests: [
            "Zet de tagline op: 'Uw partner in juridisch succes'.",
            "Verander het telefoonnummer in de footer naar 09 123 45 67.",
            "Maak een blog over de nieuwe privacywetgeving van 2026."
        ]
    }
];

function sendRandomRequest() {
    const persona = personas[Math.floor(Math.random() * personas.length)];
    const message = persona.requests[Math.floor(Math.random() * persona.requests.length)];

    const request = {
        customerEmail: persona.email,
        projectName: persona.project,
        message: message,
        timestamp: new Date().toISOString()
    };

    fs.writeFileSync(inboxPath, JSON.stringify(request, null, 2));
    
    console.log(`
🎭 [SIMULATIE] Klant '${persona.name}' stuurt een bericht:`);
    console.log(`📧 Van: ${persona.email}`);
    console.log(`📝 Bericht: "${message}"`);
    console.log(`--------------------------------------------------`);
}

// Stuur direct één verzoek
sendRandomRequest();
process.exit(0);
