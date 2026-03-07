# Athena CMS: Client Onboarding Protocol (v1.0)

## Overview
This protocol defines the standard operating procedure for onboarding new clients into the Athena CMS Factory. The goal is to minimize manual labor and ensure a consistent, professional setup for every site.

## The 4-Step Flow

### 1. Discovery Interview
The operator (or AI agent) conducts a discovery session.
- **Goal**: Understand business identity, target audience, and primary USP.
- **Key Questions**:
    - "What is the name and tagline?"
    - "Who is your ideal customer?"
    - "What action should they take on the site?"
    - "What style/mood fits best (Modern, Classic, Bold, Warm)?"

### 2. Technical Provisioning
Automated execution of technical assets.
- **Folder**: Create `input/<client_slug>/`.
- **Sheet**: Clone the Master Google Sheet template.
- **Repo**: Initialize a private GitHub repository in the `athena-cms-factory` org.
- **Registry**: Add the site to `sites.json`.

### 3. Content Ingestion (The Scraper)
If a legacy site exists, use the Scraper.
- **Command**: `pnpm onboard --import <url>`
- **AI Logic**: Parse the scraped HTML and map it to the "basis", "heros", and "sections" tabs in the Google Sheet.

### 4. First Generation (The Prototype)
- **Action**: Run `pnpm site-wizard --slug <client_slug>`.
- **Result**: A live preview for the client to review.

## Operator Skills
- Use `skill-athena-onboarding` for a guided CLI experience.
- Use `auto-sheet-provisioner.js` for manual sheet overrides.
