# Implementation Plan: Hydration Management System

## Phase 1: Engine Logic (DoctorController)
- [x] Extend `DoctorController.js` with `applyPolicy(siteName, policy)` method.
- [x] Implement `prune(siteName)` (delete node_modules) and `hydrate(siteName)` (pnpm install).
- [x] Add `calculateStorageUsage(siteName)` to report disk space.
- [x] Create `hydration-policies.json` handler to manage global/group/site hierarchy.

## Phase 2: Dashboard API & Integration
- [x] Add `GET /api/storage/status`: Return status of all sites (Hydrated/Dormant) and usage.
- [x] Add `POST /api/storage/policy`: Update policy for site/group/global.
- [x] Integrate policy check into `DoctorController.audit()`.

## Phase 3: Visual Interface
- [x] Create "Storage & Health" tab in Athena Dashboard.
- [x] Implement visual toggles for policy (Always Hydrated, Always Dormant, Global Default).
- [x] Add "Prune All Dormant" button for immediate space recovery.

## Phase 4: Verification
- [x] Unit test the policy hierarchy (Site > Group > Global).
- [x] Verify node_modules deletion and re-installation via Dashboard.
- [x] Integrate hydration commands into `athena-agent.js` CLI.
