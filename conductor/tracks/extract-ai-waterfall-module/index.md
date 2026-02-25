# Track: Extract AI Waterfall Module

## Status
- **Phase**: Implementation
- **Owner**: Gemini-CLI
- **Created**: 2026-02-17

## Objective
Extract the AI waterfall system from the Athena CMS Factory into a standalone, portable module located in `~/aiga`. This module should be usable in other projects and include its own configuration and dependency management.

## Context
The AI waterfall system provides a robust way to generate content by falling back through multiple AI providers (Google, Groq, OpenRouter, Hugging Face) if one fails or hits a rate limit.

## Scope
- Extract `ai-engine.js` and its core logic.
- Simplify dependencies (e.g., `env-loader`, `cli-interface`).
- Create a standalone `package.json` for the new module.
- Set up initial configuration (`ai-models.json`).
- Verify functionality in the new location.

## Files Involved
- `factory/5-engine/ai-engine.js` (Source)
- `factory/5-engine/env-loader.js` (Source)
- `factory/config/ai-models.json` (Source)
- `~/aiga/ai-waterfall/index.js` (Target)
- `~/aiga/ai-waterfall/package.json` (Target)
- `~/aiga/ai-waterfall/ai-models.json` (Target)
- `~/aiga/ai-waterfall/.env` (Target)
- `~/aiga/ai-waterfall/README.md` (Target)

## Plan
1. [x] Scaffold `~/aiga` directory.
2. [x] Create `package.json` and install dependencies.
3. [x] Copy and refactor `ai-engine.js` into `index.js`.
4. [x] Implement simplified env loading.
5. [x] Copy `ai-models.json`.
6. [x] Create a test script to verify the standalone module.
