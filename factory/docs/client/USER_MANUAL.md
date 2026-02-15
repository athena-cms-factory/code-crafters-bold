# Athena CMS Factory - User Manual (v8.0)

Welcome to the Athena CMS Factory User Manual. This guide summarizes the new automation and marketing capabilities introduced in version 8.0.

## 🚀 Key Features Overview

The Athena Factory now includes advanced tools for **autonomous marketing** and **storage optimization**.

### 1. Marketing & SEO Automation

You can now use AI to generate content and optimize your site for search engines directly from the CLI or Dashboard.

*   **Blog Generator (`generate-blog`)**:
    *   Creates a complete blog post based on your site's context and a topic you provide.
    *   Automatically syncs the new post to your Google Sheet.
    *   **Usage:** `node athena-agent.js generate-blog [project-name] "Your Topic"`

*   **SEO Optimizer (`generate-seo`)**:
    *   Analyzes your site's content and generates optimized `metaTitle`, `metaDescription`, and `keywords`.
    *   Updates your `site_settings.json` and syncs to Google Sheets.
    *   **Usage:** `node athena-agent.js generate-seo [project-name]`

### 2. Storage & Health Management

To keep your factory running smoothly, we've introduced the **Hydration Management System**. This system helps manage disk space by removing bulky dependency folders (`node_modules`) from sites you aren't currently working on.

*   **What is Hydration?**
    *   **Dehydrated Site:** A site without `node_modules`. It takes up very little space but cannot be started immediately.
    *   **Hydrated Site:** A site with all dependencies installed. Ready for development.

*   **Commands:**
    *   `storage-status`: Check how much space your sites are using.
    *   `storage-prune-all`: "Dehydrate" all sites to free up space (often saving gigabytes).
    *   `doctor-heal [site-name]`: "Rehydrate" a specific site when you need to work on it again.

### 3. Nightly Health Monitor

The factory now includes a `athena-monitor.sh` script designed to run every night. It:
1.  Checks the health of all sites (JSON integrity).
2.  Logs storage usage.
3.  Ensures your factory stays clean and operational.

## 🛠️ Dashboard Updates

The Athena Dashboard (port 5001) has been updated with:
*   **Storage & Health Tab:** Visual interface for `storage-status` and one-click cleanup buttons ("pnpm Prune", "Clean Sites").
*   **Marketing Tools:** Buttons to trigger Blog and SEO generation directly from the interface.

## ❓ FAQ

**Q: If I run `storage-prune-all`, will I lose my work?**
A: **No.** You only delete the downloaded libraries (`node_modules`). Your source code (`src/`) and data (`input/`) are safe. You can restore a site anytime by running `pnpm install` or `doctor-heal`.

**Q: Can I edit the generated SEO/Blog content?**
A: Yes! The content is synced to your Google Sheet. You can edit it there and pull the changes back to your site.
