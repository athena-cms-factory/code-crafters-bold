#!/bin/bash
# Athena Dashboard Launcher
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

# Maak log directory aan indien nodig
mkdir -p output/logs
TIMESTAMP=$(date +%Y-%m-%d)
LOG_FILE="output/logs/${TIMESTAMP}_dashboard.log"

# Opschonen oude logs
NODE_BIN=$(command -v node)
$NODE_BIN 6-utilities/rotate-logs.js

# Laad poort uit ConfigManager
FINAL_PORT=$($NODE_BIN cli/config-cli.js ports.dashboard)

# Controleer of poort al in gebruik is en herstart (Force Reload)
if ss -tuln | grep -q ":$FINAL_PORT " ; then
    echo "Recyclen van bestaand proces op poort $FINAL_PORT..."
    $NODE_BIN cli/pm-cli.js stop $FINAL_PORT
    sleep 1
fi

echo "🔱 Athena Dashboard starten op poort $FINAL_PORT..."
# Gebruik de beschikbare Node binary
NODE_BIN=$(command -v node)
$NODE_BIN dashboard/athena.js > "$LOG_FILE" 2>&1 &
# Geef de server even de tijd om te binden aan de poort
sleep 2

# Open de browser (dit werkt op ChromeOS Crostini)
if command -v xdg-open > /dev/null; then
    xdg-open http://localhost:$FINAL_PORT
else
    # Fallback voor sommige omgevingen
    garcon-url-handler http://localhost:$FINAL_PORT
fi
