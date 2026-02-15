# Roadmap for Testing & Finalization

This document outlines the strategy for verifying the Athena CMS Factory's functionality and bringing the administration and documentation up to date.

## 1. Task Distribution Matrix

| Category | Responsibility | Task Description | Status |
| :--- | :--- | :--- | :--- |
| **Agent-Only** | AI Agent | **Controller Unit Tests:** Create Vitest suites for `DoctorController`, `MarketingController`, and `SiteController`. | COMPLETED (Doctor) |
| **Agent-Only** | AI Agent | **Mock Testing:** Simulate LLM outputs for `Interpreter.js` to validate prompt-to-config logic. | PENDING |
| **Agent-Only** | AI Agent | **Documentation Update:** Use Jules to sync `factory/docs/` with the current state of the controllers. | PENDING |
| **User-Only** | User | **Visual Dock Testing:** Test `dock-connector` and manual UI interactions in Athena Dock (port 4002). | PENDING |
| **User-Only** | User | **External Service Validation:** Verify Google Sheets permissions and final GitHub Pages deployment layout. | PENDING |
| **Collaborative** | Agent + User | **End-to-End (E2E) Flow:** Verify the full cycle: Prompt -> Site Creation -> Sheet Sync -> GitHub Deploy. | PENDING |
| **Collaborative** | Agent + User | **Edge Case Discovery:** Agent generates complex prompts; User audits visual and data quality. | PENDING |

## 2. Technical Priorities

1.  **Self-Healing Activation:** Finalize the `DoctorController` and implement the automated audit monitor.
2.  **AI Interpreter Validation:** Ensure `create-site --prompt` and `update-site --instruction` are 100% reliable.
3.  **SEO Automation:** Complete the SEO metadata generation logic in `MarketingController`.

## 3. Administrative Tasks

- [ ] Sync `factory/docs/` with current CLI capabilities.
- [ ] Update `README.md` to reflect the "Prompt-to-Site" features.
- [ ] Maintain the `Tracks Registry` as tests are completed.

---
*Last updated: Saturday, February 14, 2026*
