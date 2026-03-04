import fs from 'fs';
import { exec } from 'child_process';

const agentsDir = 'conductor/agents/';
const logFile = 'conductor/execution_log.md';

console.log('🛡️  System Hook Monitor (v2.7) Started...');

setInterval(() => {
  if (!fs.existsSync(agentsDir)) return;

  const agentFiles = fs.readdirSync(agentsDir).filter(f => f.endsWith('.json'));
  
  agentFiles.forEach(file => {
    try {
      const data = JSON.parse(fs.readFileSync(`${agentsDir}${file}`, 'utf8'));
      const agentId = data.agent_id;
      
      // Controleer of dit agent proces draait
      exec(`pgrep -f "node conductor/pulse.js agent ${agentId}"`, (err, stdout) => {
        const isRunning = stdout.trim().length > 0;
        
        // Lees het laatste log-bericht
        let lastLog = '';
        if (fs.existsSync(logFile)) {
          const logs = fs.readFileSync(logFile, 'utf8').split('
');
          lastLog = logs.reverse().find(l => l.includes(`Agent (${agentId})`)) || '';
        }

        // Als het laatste bericht een PING of COMPLETED was (wat Wait Mode impliceert)
        // en de Pulse draait NIET...
        if (!isRunning && (lastLog.includes('[PING]') || lastLog.includes('COMPLETED') || lastLog.includes('STANDBY'))) {
            const hookMessage = `
## [${new Date().toISOString().replace('T', ' ').substring(0,19)}] [SYSTEM_HOOK] FATAL_PULSE_DROP: Agent (${agentId})
   - ⚠️ ERROR: Agent did not start the pulse.js tool! Agent MUST execute 'node conductor/pulse.js agent ${agentId}' IMMEDIATELY.
`;
            
            // Voorkom spam door te checken of we deze fout al zojuist hebben gelogd
            const currentLog = fs.readFileSync(logFile, 'utf8');
            if (!currentLog.endsWith(hookMessage.trim())) {
                console.log(`[MONITOR] Pulse drop detected for ${agentId}! Injecting system hook...`);
                fs.appendFileSync(logFile, hookMessage);
            }
        }
      });
    } catch (e) {
      // Negeer parse fouten van half-geschreven JSON bestanden
    }
  });
}, 5000);
