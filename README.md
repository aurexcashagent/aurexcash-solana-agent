# AurexCash Solana AI Agent

[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Solana](https://img.shields.io/badge/blockchain-Solana-purple)](https://solana.com)
[![Open Source](https://img.shields.io/badge/status-open--source-blue)]()
[![AI Agent](https://img.shields.io/badge/type-AI%20Agent-orange)]()

Open-source AI agent running on **Solana Agent Registry** with an MCP endpoint and cryptographically signed responses.

---

# Overview

AurexCash is a **Web3 AI agent** that:

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
aurexcash-solana-agent

server.js            MCP server
metadata.json        Agent metadata

scripts/
  register-agent.ts
  verify.ts
  set-wallet.ts
  update-uri.ts
  get-wallet.ts
  list-skills.ts

README.md
LICENSE
.gitignore
package.json
```

---

# Quick Start

Clone repository

```bash
git clone https://github.com/aurexcashagent/aurexcash-solana-agent
cd aurexcash-solana-agent
npm install
```

Run the agent

```bash
node server.js
```

Server runs at

```
http://localhost:8787
```

---

# Test Agent Locally

Health check

```bash
curl http://127.0.0.1:8787/health
```

Expected response

```
{"ok":true}
```

Send prompt to agent

```bash
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

```bash
ngrok http 8787
```

Example public endpoint

```
https://xxxxx.ngrok-free.dev/mcp
```

Test public agent

```bash
curl -X POST https://xxxxx.ngrok-free.dev/mcp \
-H "Content-Type: application/json" \
-d '{"prompt":"Who are you?"}'
```

---

# Verify Agent On Chain

Run verification script

```bash
npx tsx scripts/verify.ts FSQcBRee4uviHS61VRViavoqVE9zZ14DrSNQPdiRt4ae
```

Expected output

```
Name: Agent
Owner: 3mcdWL...
URI: ipfs://...
```

---

# Architecture

```
User
 ↓
MCP Endpoint (server.js)
 ↓
AI Model
 ↓
Response
 ↓
Solana Wallet Signature
```

Every response returned by the agent includes a cryptographic signature from the agent wallet.

---

# Proof

Agent authenticity can be verified through:

1️⃣ Solana Agent Registry record
2️⃣ Public MCP endpoint
3️⃣ Signed responses from the owner wallet

Example signed response fields:

```
signature
signer
nonce
```

---

# Roadmap

• MCP tools support
• On-chain skill registry
• Multi-agent communication
• Autonomous Web3 actions

---

# License

MIT
