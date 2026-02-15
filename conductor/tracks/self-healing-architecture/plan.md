# Implementation Plan: Self-Healing Architecture

## Phase 1: Engine Logic (DoctorController)
- [x] Implement `DoctorController.js` (Audit logic)
- [x] Add "check-site" command to athena-agent
- [x] Implement "heal-site" logic (npm install, json validation)

## Phase 2: Monitoring & Automation
- [x] Create nightly monitor script (`athena-monitor.sh`)
- [x] Integrate storage pruning into monitor cycle
- [x] Add automated `pnpm store prune` to maintenance
- [ ] Add cron-job setup instructions to documentation
