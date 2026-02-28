import { google } from 'googleapis';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

// Laad credentials uit .env
dotenv.config({ path: path.join(ROOT, '.env') });

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
    console.error("❌ GOOGLE_CLIENT_ID of GOOGLE_CLIENT_SECRET ontbreekt in .env");
    process.exit(1);
}

const oauth2Client = new google.auth.OAuth2(
    CLIENT_ID,
    CLIENT_SECRET,
    'urn:ietf:wg:oauth:2.0:oob'
);

const SCOPES = [
    'https://www.googleapis.com/auth/spreadsheets',
    'https://www.googleapis.com/auth/drive'
];

const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent'
});

console.log('\n🚀 STAP 1: Open deze URL in je browser en geef toestemming:');
console.log('------------------------------------------------------------');
console.log(authUrl);
console.log('------------------------------------------------------------\n');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});

rl.question('🚀 STAP 2: Plak de "Authorization Code" hier: ', async (code) => {
    rl.close();
    try {
        const { tokens } = await oauth2Client.getToken(code);
        console.log('\n✅ SUCCES! Nieuwe GOOGLE_REFRESH_TOKEN:\n');
        console.log(tokens.refresh_token);
    } catch (err) {
        console.error('❌ Fout:', err.message);
    }
});
