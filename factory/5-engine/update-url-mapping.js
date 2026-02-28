import { google } from 'googleapis';
import fs from 'fs';
import path from 'path';

const spreadsheetId = '16ygVILHgFYZz2ORBshaXKbAWpvD2S-_n3n2R_4aHx3Y';
const serviceAccountPath = '2-Fabriek/athena/athena-x/factory/service-account.json';
const projectName = 'portfolio-kbm';

async function run() {
    const auth = new google.auth.GoogleAuth({
        keyFile: serviceAccountPath,
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    const allSheets = response.data.sheets;
    console.log(`🔍 Found ${allSheets.length} sheets:`, allSheets.map(s => s.properties.title).join(', '));

    const mapping = {};
    allSheets.forEach(s => {
        const title = s.properties.title;
        const gid = s.properties.sheetId;
        const key = title.toLowerCase();
        
        mapping[key] = {
            editUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit#gid=${gid}`,
            exportUrl: `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=tsv&gid=${gid}`
        };
    });

    const outputPath = `2-Fabriek/athena/athena-x/input/${projectName}/project-settings/url-sheet.json`;
    const siteOutputPath = `2-Fabriek/athena/athena-x/sites/${projectName}/project-settings/url-sheet.json`;
    
    fs.writeFileSync(outputPath, JSON.stringify(mapping, null, 2));
    console.log(`✅ Updated input url-sheet.json with ${Object.keys(mapping).length} tabs.`);
    
    if (fs.existsSync(siteOutputPath)) {
        fs.writeFileSync(siteOutputPath, JSON.stringify(mapping, null, 2));
        console.log(`✅ Updated site url-sheet.json.`);
    }
}

run().catch(console.error);
