import fs from 'fs';
import path from 'path';

const role = process.argv[2] || 'unknown';
const id = process.argv[3] || 'ALL';
const logFile = 'conductor/execution_log.md';

console.log('📡 Pulse v2.4 (Fleet-Aware) active for ' + role.toUpperCase() + ': ' + id);

if (!fs.existsSync(logFile)) {
  fs.writeFileSync(logFile, '# Execution Log - Initialized\n');
}

let lastSize = fs.statSync(logFile).size;

// Bepaal op welke tags we moeten "sensen"
const isArchitect = (role === 'architect' || role === 'lead');
const isAgent = (role === 'agent');

const interval = setInterval(() => {
  const stats = fs.statSync(logFile);
  if (stats.size > lastSize) {
    const fd = fs.openSync(logFile, 'r');
    const buffer = Buffer.alloc(stats.size - lastSize);
    fs.readSync(fd, buffer, 0, stats.size - lastSize, lastSize);
    fs.closeSync(fd);

    const diff = buffer.toString().trim();
    lastSize = stats.size;

    if (diff) {
      // Architect wacht op [PING] of [PROPOSAL]
      if (isArchitect && (diff.includes('[PING]') || diff.includes('[PROPOSAL]'))) {
        console.log('\n🔔 SIGNAL DETECTED for Architect:\n' + diff);
        clearInterval(interval);
        process.exit(0);
      }
      
      // Agent wacht op [DIRECTIVE] of [APPROVED] (voor zichzelf of ALL)
      if (isAgent && (diff.includes('[DIRECTIVE] Agent (' + id + ')') || diff.includes('[DIRECTIVE] ALL') || diff.includes('[APPROVED] Agent (' + id + ')'))) {
        console.log('\n🔔 SIGNAL DETECTED for Agent ' + id + ':\n' + diff);
        clearInterval(interval);
        process.exit(0);
      }
    }
  }
}, 1000);
