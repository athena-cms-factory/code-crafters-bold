import { describe, it, expect } from 'vitest';
import { validateProjectName } from '../core/factory.js';

describe('factory.js', () => {
    describe('validateProjectName', () => {
        it('should lowercase the name', () => {
            expect(validateProjectName('MyProject')).toBe('myproject');
        });

        it('should replace spaces with hyphens', () => {
            expect(validateProjectName('my project')).toBe('my-project');
        });

        it('should remove special characters', () => {
            expect(validateProjectName('my!project@123')).toBe('my-project-123');
        });

        it('should trim leading and trailing hyphens', () => {
            expect(validateProjectName('!my-project!')).toBe('my-project');
        });

        it('should collapse multiple hyphens', () => {
            expect(validateProjectName('my---project')).toBe('my-project');
        });
    });
});
