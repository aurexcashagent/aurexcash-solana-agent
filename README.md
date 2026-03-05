# AurexCash Solana AI Agent

Web3 AI agent deployed on **Solana Agent Registry** with an MCP endpoint and signed responses.

---

## Overview

AurexCash is an AI-powered Web3 agent that:

• runs an MCP endpoint
• signs every response with its Solana wallet
• is registered on-chain in the Solana Agent Registry

This means anyone can verify:

1️⃣ the agent exists on-chain
2️⃣ the responses are cryptographically signed
3️⃣ the endpoint is publicly accessible

---

## Agent Info

**Agent asset (Registry ID)**

```
FSQcBRee4uviHS61VRViavoqVE9zZ14DrSNQPdiRt4ae
```

**Owner wallet**

```
3mcdWL1sffpuHnmLiXfoADdTsNPGgKEBXY2KeHXySoqT
```

---

## MCP Endpoint

Example:

```
https://YOUR-NGROK.ngrok-free.dev/mcp
```

---

# How to Run

## 1 Install dependencies

```
npm install
```

---

## 2 Run the agent server

```
node server.js
```

Server runs at:

```
http://localhost:8787
```

---

## 3 Test locally

Health check

```
curl http://127.0.0.1:8787/health
```

Chat with the agent

```
curl -X POST http://127.0.0.1:8787/mcp \
-H "Content-Type: application/json" \
-d '{"prompt":"Hello AurexCash"}'
```

Example response:

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

Start ngrok:

```
ngrok http
```
