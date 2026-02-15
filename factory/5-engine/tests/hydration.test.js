import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DoctorController } from '../controllers/DoctorController';
import fs from 'fs';
import path from 'path';
import * as child_process from 'child_process';

// Mock child_process for Vitest
vi.mock('child_process', () => {
    const mockExecSync = vi.fn((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('du -sm')) return "150\t/path";
        return Buffer.from('ok');
    });
    return {
        execSync: mockExecSync,
        default: {
            execSync: mockExecSync
        }
    };
});

vi.mock('fs');

describe('DoctorController - Hydration Management', () => {
    let doctor;
    let mockConfigManager;

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        
        mockConfigManager = {
            get: vi.fn().mockReturnValue('/mock/sites')
        };
        
        doctor = new DoctorController(mockConfigManager);
        
        // Mock the policy file reading
        vi.spyOn(fs, 'readFileSync').mockImplementation((p) => {
            if (p.includes('hydration-policies.json')) {
                return JSON.stringify({
                    globalDefault: "dormant",
                    sites: {
                        "active-site": "hydrated"
                    }
                });
            }
            return '{}';
        });
    });

    describe('getPolicy', () => {
        it('should return site-specific policy if it exists', () => {
            expect(doctor.getPolicy('active-site')).toBe('hydrated');
        });

        it('should return global default if no site policy exists', () => {
            expect(doctor.getPolicy('random-site')).toBe('dormant');
        });
    });

    describe('audit with hydration', () => {
        it('should report warning if site is hydrated but policy is dormant', () => {
            const siteName = 'dormant-site';
            const sitePath = '/mock/sites/dormant-site';

            vi.spyOn(fs, 'existsSync').mockImplementation((p) => {
                if (p === path.join(sitePath, 'node_modules')) return true; // Hydrated
                return false;
            });

            const report = doctor.audit(siteName);

            expect(report.hydration).toBe('hydrated');
            expect(report.policy).toBe('dormant');
            expect(report.status).toBe('warning');
            expect(report.issues).toContain('Policy requires dormancy, but node_modules exists (space waste)');
        });
    });

    describe('enforcePolicy', () => {
        it('should dehydrate site if policy is dormant and it is hydrated', async () => {
            const siteName = 'wasteful-site';
            const sitePath = '/mock/sites/wasteful-site';

            vi.spyOn(fs, 'existsSync').mockReturnValue(true); // Exists = hydrated
            
            const result = await doctor.enforcePolicy(siteName);

            expect(child_process.execSync).toHaveBeenCalledWith(
                expect.stringContaining('rm -rf "/mock/sites/wasteful-site/node_modules"')
            );
            expect(result.message).toContain('Dehydration complete');
        });

        it('should hydrate site if policy is hydrated and it is dormant', async () => {
            const siteName = 'active-site';
            const sitePath = '/mock/sites/active-site';

            vi.spyOn(fs, 'existsSync').mockReturnValue(false); // Doesn't exist = dormant
            
            const result = await doctor.enforcePolicy(siteName);

            expect(child_process.execSync).toHaveBeenCalledWith(
                'pnpm install --no-frozen-lockfile',
                expect.objectContaining({ cwd: sitePath })
            );
            expect(result.message).toContain('Hydration complete');
        });
    });
});
