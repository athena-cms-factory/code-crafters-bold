import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DoctorController } from '../controllers/DoctorController';
import fs from 'fs';
import path from 'path';
import * as child_process from 'child_process';

// Final mock strategy that works with Vitest's CJS/ESM handling of Node built-ins
vi.mock('child_process', () => {
    const mockExecSync = vi.fn();
    return {
        execSync: mockExecSync,
        default: {
            execSync: mockExecSync
        }
    };
});

describe('DoctorController', () => {
    let doctor;
    let mockConfigManager;

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        
        mockConfigManager = {
            get: vi.fn().mockReturnValue('/mock/sites')
        };
        
        doctor = new DoctorController(mockConfigManager);
    });

    describe('audit', () => {
        it('should return healthy for a valid site', () => {
            const siteName = 'healthy-site';
            const sitePath = '/mock/sites/healthy-site';
            const dataPath = path.join(sitePath, 'src/data');

            vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
                if (p === path.join(sitePath, 'node_modules')) return true;
                if (p === dataPath) return true;
                return false;
            });

            vi.spyOn(fs, 'readdirSync').mockImplementation((p) => {
                if (p === dataPath) return ['content.json'];
                return [];
            });

            vi.spyOn(fs, 'readFileSync').mockReturnValue('{"key": "value"}');

            const report = doctor.audit(siteName);

            expect(report.status).toBe('healthy');
            expect(report.issues).toHaveLength(0);
        });

        it('should report broken if node_modules is missing', () => {
            const siteName = 'broken-site';
            const sitePath = '/mock/sites/broken-site';

            vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
                if (p === path.join(sitePath, 'node_modules')) return false;
                if (p === path.join(sitePath, 'src/data')) return true;
                return false;
            });

            vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

            const report = doctor.audit(siteName);

            expect(report.status).toBe('broken');
            expect(report.issues).toContain('Missing node_modules');
        });

        it('should report broken for corrupt JSON files', () => {
            const siteName = 'corrupt-site';

            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            vi.spyOn(fs, 'readdirSync').mockReturnValue(['invalid.json']);
            vi.spyOn(fs, 'readFileSync').mockReturnValue('{ invalid json }');

            const report = doctor.audit(siteName);

            expect(report.status).toBe('broken');
            expect(report.issues).toContain('Corrupt JSON file: invalid.json');
        });

        it('should report warning for empty JSON files', () => {
            const siteName = 'empty-site';

            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            vi.spyOn(fs, 'readdirSync').mockReturnValue(['empty.json']);
            vi.spyOn(fs, 'readFileSync').mockReturnValue('{}');

            const report = doctor.audit(siteName);

            expect(report.status).toBe('warning');
            expect(report.issues).toContain('Empty JSON file: empty.json');
        });
    });

    describe('heal', () => {
        it('should reinstall dependencies if node_modules is missing', async () => {
            const siteName = 'fixable-site';
            const sitePath = '/mock/sites/fixable-site';

            vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
                if (p === path.join(sitePath, 'node_modules')) return false;
                if (p === path.join(sitePath, 'src/data')) return true;
                return false;
            });
            vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

            const result = await doctor.heal(siteName);

            // Access the mock from the imported module namespace
            expect(child_process.execSync).toHaveBeenCalledWith(
                'pnpm install --no-frozen-lockfile',
                expect.objectContaining({ cwd: sitePath, stdio: 'ignore' })
            );
            expect(result.fixes).toContain('Reinstalled dependencies');
        });

        it('should not attempt to heal if site is healthy', async () => {
            const siteName = 'perfect-site';
            
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            vi.spyOn(fs, 'readdirSync').mockReturnValue([]);

            const result = await doctor.heal(siteName);

            expect(child_process.execSync).not.toHaveBeenCalled();
            expect(result.message).toBe("Site is already healthy.");
        });
    });
});
