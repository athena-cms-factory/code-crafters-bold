import { google } from 'googleapis';
import fs from 'fs';

async function readSheetStructure() {
  console.log("🔍 Reading Google Sheet structure...");
  const auth = new google.auth.GoogleAuth({
    keyFile: 'service-account.json',
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });

  const sheets = google.sheets({ version: 'v4', auth });
  const spreadsheetId = '1HrOUhMWGmY2A_eqsyMmBid1ChWNxtVA9TBwFPVNLxPk';

  try {
    const response = await sheets.spreadsheets.get({ spreadsheetId });
    console.log(`📑 Title: ${response.data.properties.title}`);
    console.log("\n📋 Tabs found:");
    
    const mapping = {};
    response.data.sheets.forEach(s => {
      console.log(`- ${s.properties.title} (GID: ${s.properties.sheetId})`);
      mapping[s.properties.title] = s.properties.sheetId;
    });

    fs.writeFileSync('gids.json', JSON.stringify(mapping, null, 2));
    console.log("\n✅ Mapping saved to gids.json");

  } catch (err) {
    console.error("❌ Error reading sheet:", err.message);
  }
}

readSheetStructure();
