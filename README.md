# AurexCash Solana AI Agent

Open-source **AI agent running on Solana Agent Registry** with an MCP endpoint and cryptographically signed responses.

---

# Overview

AurexCash is a Web3 AI agent that:

• runs an MCP endpoint
• signs every response using a Solana wallet
• is registered on-chain in the Solana Agent Registry

This means anyone can independently verify the agent.

---

# Agent Information

Agent ID

```
FSQcBRee4uviHS61VRViavoqVE9zZ14DrSNQPdiRt4ae
```

Owner wallet

```
3mcdWL1sffpuHnmLiXfoADdTsNPGgKEBXY2KeHXySoqT
```

---

# Repository Structure

```
server.js            MCP server
metadata.json        Agent metadata
scripts/             Solana registry scripts
README.md            Documentation
```

Scripts:

```
scripts/register-agent.ts
scripts/verify.ts
scripts/set-wallet.ts
scripts/update-uri.ts
```

---

# Install

Clone repository

```
git clone https://github.com/aurexcashagent/aurexcash-solana-agent
cd aurexcash-solana-agent
```

Install dependencies

```
npm install
```

---

# Run Agent

Start server

```
node server.js
```

Server runs at

```
http://localhost:8787
```

---

# Test Agent Locally

Health check

```
curl http://127.0.0.1:8787/health
```

Expected response

```
{"ok":true}
```

---

Send prompt to agent

```
curl -X POST http://127.0.0.1:8787/mcp \
-H "Content-Type: application/json" \
-d '{"prompt":"Hello AurexCash"}'
```

Example response

```
{
 "ok": true,
 "output": "Hello! How can I assist you today?",
 "signature": "...",
 "signer": "...",
 "nonce": "..."
}
```

---

# Make Endpoint Public

Run ngrok

```
ngrok http 8787
```

Example public endpoint

```
https://xxxxx.ngrok-free.dev/mcp
```

Test public agent

```
curl -X POST https://xxxxx.ngrok-free.dev/mcp \
-H "Content-Type: application/json" \
-d '{"prompt":"Who are you?"}'
```

---

# Verify Agent On Chain

Run verification script

```
npx tsx scripts/verify.ts FSQcBRee4uviHS61VRViavoqVE9zZ14DrSNQPdiRt4ae
```

Expected output

```
Name: Agent
Owner: 3mcdWL...
URI: ipfs://...
```

---

# Proof

Agent can be verified by:

1️⃣ Solana Agent Registry record
2️⃣ Public MCP endpoint
3️⃣ Signed responses from owner wallet

---

# License

MIT
