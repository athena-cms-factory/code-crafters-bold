#!/bin/bash
# AfterAgent Hook v3.0 - Deterministische Pulse Trigger
AGENT_ID=$(cat conductor/agents/*.json 2>/dev/null | jq -r '.agent_id' | head -n 1)

if [ -n "$AGENT_ID" ] && [ "$AGENT_ID" != "null" ]; then
    echo "🛡️  [HOOK] AfterAgent: Forcing Pulse for $AGENT_ID..."
    node conductor/pulse.js agent "$AGENT_ID"
fi
