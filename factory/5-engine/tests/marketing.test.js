import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MarketingController } from '../controllers/MarketingController';
import { AthenaDataManager } from '../lib/DataManager.js';
import { generateWithAI } from '../core/ai-engine.js';
import fs from 'fs';
import path from 'path';

// Mock dependencies
vi.mock('../lib/DataManager.js');
vi.mock('../core/ai-engine.js');
vi.mock('fs');

describe('MarketingController', () => {
    let marketing;
    let mockConfigManager;

    beforeEach(() => {
        vi.restoreAllMocks();
        vi.clearAllMocks();
        
        mockConfigManager = {
            get: vi.fn().mockReturnValue('/mock/factory')
        };
        
        marketing = new MarketingController(mockConfigManager);
    });

    describe('generateSEO', () => {
        it('should generate SEO metadata and sync to sheet', async () => {
            const projectName = 'test-site';
            const mockPaths = { dataDir: '/mock/sites/test-site/src/data' };
            const mockSEO = {
                title: "Optimized Title",
                description: "Meta description",
                keywords: "test, seo"
            };

            // Setup mocks
            marketing.dataManager.resolvePaths.mockReturnValue(mockPaths);
            marketing.dataManager.loadJSON.mockReturnValue({ company: "Test Co" });
            vi.mocked(generateWithAI).mockResolvedValue(mockSEO);
            vi.spyOn(fs, 'readdirSync').mockReturnValue(['basis.json', 'site_settings.json']);
            vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            const result = await marketing.generateSEO(projectName);

            expect(generateWithAI).toHaveBeenCalled();
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('seo.json'),
                expect.stringContaining('Optimized Title')
            );
            expect(marketing.dataManager.syncToSheet).toHaveBeenCalledWith(projectName);
            expect(result.success).toBe(true);
            expect(result.seo.title).toBe("Optimized Title");
        });
    });

    describe('generateBlog', () => {
        it('should generate a blog post and prepend to blog.json', async () => {
            const projectName = 'test-site';
            const mockPaths = { dataDir: '/mock/sites/test-site/src/data' };
            const mockBlog = {
                title: "AI Blog",
                content: "Content here"
            };

            marketing.dataManager.resolvePaths.mockReturnValue(mockPaths);
            marketing.dataManager.loadJSON.mockReturnValue({});
            vi.mocked(generateWithAI).mockResolvedValue(mockBlog);
            vi.spyOn(fs, 'existsSync').mockReturnValue(true);
            vi.spyOn(fs, 'readFileSync').mockReturnValue('[]');
            vi.spyOn(fs, 'writeFileSync').mockImplementation(() => {});

            const result = await marketing.generateBlog(projectName, "AI rules");

            expect(generateWithAI).toHaveBeenCalledWith(
                expect.stringContaining("AI rules"),
                expect.objectContaining({ isJson: true })
            );
            expect(fs.writeFileSync).toHaveBeenCalledWith(
                expect.stringContaining('blog.json'),
                expect.any(String)
            );
            expect(result.blog.title).toBe("AI Blog");
        });
    });
});
