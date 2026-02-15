
import { AthenaGateway } from '../5-engine/lib/Gateway.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '../..');

dotenv.config({ path: path.join(root, 'factory/.env') });

async function testConnection() {
    console.log("🔍 Testing IMAP connection for Athena Gateway...");
    console.log(`User: ${process.env.MAIL_USER}`);
    console.log(`Host: ${process.env.MAIL_HOST}`);
    
    const gateway = new AthenaGateway(root);
    try {
        await gateway.processMailOnce();
        console.log("✅ IMAP connection test completed successfully.");
    } catch (error) {
        console.error("❌ IMAP connection test failed:");
        console.error(error);
        process.exit(1);
    }
}

testConnection();
