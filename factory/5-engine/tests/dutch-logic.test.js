import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
// This import will fail because generateClientInstructions is not exported yet
import { generateClientInstructions } from '../core/factory.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Dutch Logic - factory.js', () => {
    const testDir = path.join(__dirname, 'test-project');

    beforeEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true });
        }
        fs.mkdirSync(testDir);
    });

    afterEach(() => {
        if (fs.existsSync(testDir)) {
            fs.rmSync(testDir, { recursive: true });
        }
    });

    it('should generate HANDLEIDING_BEHEER.md with correct placeholders', () => {
        const projectName = 'test-project';
        // Mock the blueprint object that the function actually expects
        const blueprint = {
            blueprint_name: 'test-blueprint',
            data_structure: [
                {
                    table_name: 'products',
                    columns: [
                        { name: 'name', description: 'De productnaam.' },
                        { name: 'price', description: 'De prijs in euros.' }
                    ]
                }
            ]
        };
        
        // Call the function with the correct object structure
        generateClientInstructions(testDir, projectName, blueprint);
        
        const manualPath = path.join(testDir, 'HANDLEIDING_BEHEER.md');
        expect(fs.existsSync(manualPath)).toBe(true);
        
        const content = fs.readFileSync(manualPath, 'utf8');
        // Check for the replaced values
        expect(content).toContain(projectName); // {{PROJECT_NAME}}
        expect(content).toContain(blueprint.blueprint_name); // {{BLUEPRINT_NAME}}
        expect(content).toContain('De productnaam.'); // Dynamic content from data_structure
    });
});
