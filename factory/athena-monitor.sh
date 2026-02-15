#!/bin/bash

# Athena CMS Factory - Nightly Health & Storage Monitor
# Description: Audits all sites, enforces hydration policies, and prunes storage.

# Get the directory where this script is located
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

LOG_DIR="output/logs"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/monitor.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

echo "--------------------------------------------------" | tee -a "$LOG_FILE"
echo "🔱 Athena Monitor Started at $TIMESTAMP" | tee -a "$LOG_FILE"
echo "--------------------------------------------------" | tee -a "$LOG_FILE"

# 0. Sync AI Waterfall (Keep models up to date)
echo "🤖 Phase 0: Syncing AI Waterfall Models..." | tee -a "$LOG_FILE"
node 5-engine/sync-ai-waterfall.js >> "$LOG_FILE" 2>&1
echo "✅ AI Waterfall synchronized." | tee -a "$LOG_FILE"

# 1. Enforce Hydration Policies & Prune Storage
echo "🧹 Phase 1: Storage Pruning (Enforcing Dormancy)..." | tee -a "$LOG_FILE"
node athena-agent.js storage-prune-all >> "$LOG_FILE" 2>&1
echo "✅ Storage cleanup completed." | tee -a "$LOG_FILE"

# 2. Global Health Audit
echo "🚑 Phase 2: Global Health Audit..." | tee -a "$LOG_FILE"
# We run doctor-check without args to audit all sites
node athena-agent.js doctor-check > "$LOG_DIR/last_full_audit.json" 2>/dev/null

# Basic summary from the JSON
BROKEN_SITES=$(grep -c '"status": "broken"' "$LOG_DIR/last_full_audit.json")
WARNING_SITES=$(grep -c '"status": "warning"' "$LOG_DIR/last_full_audit.json")
HEALTHY_SITES=$(grep -c '"status": "healthy"' "$LOG_DIR/last_full_audit.json")

echo "📊 Audit Summary:" | tee -a "$LOG_FILE"
echo "   - Healthy: $HEALTHY_SITES" | tee -a "$LOG_FILE"
echo "   - Warnings: $WARNING_SITES" | tee -a "$LOG_FILE"
echo "   - Broken: $BROKEN_SITES" | tee -a "$LOG_FILE"

if [ "$BROKEN_SITES" -gt 0 ]; then
    echo "🚨 WARNING: $BROKEN_SITES site(s) require attention! Run 'athena-agent doctor-check' for details." | tee -a "$LOG_FILE"
fi

# 3. System Disk Cleanup
echo "🧹 Phase 3: System Maintenance..." | tee -a "$LOG_FILE"
pnpm store prune >> "$LOG_FILE" 2>&1
echo "✅ pnpm store pruned." | tee -a "$LOG_FILE"

echo "--------------------------------------------------" | tee -a "$LOG_FILE"
echo "✨ Athena Monitor Finished at $(date '+%Y-%m-%d %H:%M:%S')" | tee -a "$LOG_FILE"
echo "--------------------------------------------------" | tee -a "$LOG_FILE"
