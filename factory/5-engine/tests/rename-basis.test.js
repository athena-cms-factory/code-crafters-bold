import { describe, it, expect } from 'vitest';
import { ProjectGenerator } from '../core/factory.js';

describe('Basis Rename Refactoring', () => {
    it('should have "basis" as the default primary table name in ProjectGenerator', () => {
        // This is a bit tricky as ProjectGenerator constructor does a lot of fs work.
        // We can check if the hardcoded strings in factory.js are updated.
        const generator = new ProjectGenerator({
            projectName: 'test-project',
            blueprintFile: 'test.json'
        });
        
        // We expect primary table to be 'basis' if not specified or if it's the first one.
        // Actually, let's test the transformWebshopApp output directly.
        const webshopCode = generator.transformWebshopApp('content');
        expect(webshopCode).toContain('data.basis || Object.values(data)[0]');
        expect(webshopCode).not.toContain('data.basisgegevens');
    });
});
