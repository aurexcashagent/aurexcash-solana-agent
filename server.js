/**
 * AurexCash Solana Agent — Enhanced Server
 *
 * Multi-user: users pass their own Aurex API key + User ID via headers
 * Headers: X-Aurex-Key, X-Aurex-User-Id
 * Fallback: uses .env values if headers not provided
 */
import express from "express";
import OpenAI from "openai";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import crypto from "crypto";
import { PurchaseAgent } from "./src/agent/purchase-agent.js";

function getKeypairFromEnv() {
  const pk = process.env.SOLANA_PRIVATE_KEY;
  if (!pk) throw new Error("SOLANA_PRIVATE_KEY is not set");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(pk)));
}

function makeSigner(keypair) {
  return {
    publicKey: keypair.publicKey,
    sign: async (messageBytes) => nacl.sign.detached(messageBytes, keypair.secretKey),
  };
}

async function generateText(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return `AurexCash: received "${prompt}". (OPENAI_API_KEY not set)`;
  const client = new OpenAI({ apiKey });
  const resp = await client.responses.create({ model: "gpt-4.1-mini", input: prompt });
  return resp.output_text || "(no output_text)";
}

// Get Aurex credentials: from headers first, then .env fallback
function getAurexCreds(req) {
  const apiKey = req.headers["x-aurex-key"] || process.env.AUREX_API_KEY;
  const userId = req.headers["x-aurex-user-id"] || process.env.AUREX_USER_ID;
  if (!apiKey || !userId) return null;
  return { apiKey, userId };
}

// Create agent per request (supports multi-user)
function createAgent(creds) {
  return new PurchaseAgent({
    userId: creds.userId,
    aurexApiKey: creds.apiKey,
    approvalTransport: process.env.APPROVAL_TRANSPORT || "console",
  });
}

// Approval store (shared across requests)
const approvalAgents = new Map();

const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true, version: "2.0.0", features: { mcp: true, purchase: true, multiUser: true } });
});

app.post("/mcp", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ ok: false, error: "prompt required" });
    }
    const keypair = getKeypairFromEnv();
    const signer = makeSigner(keypair);

    const creds = getAurexCreds(req);
    const isPurchase = creds && /\b(buy|order|purchase)\b/i.test(prompt);
    let output;
    if (isPurchase) {
      const agent = createAgent(creds);
      const result = await agent.handleMessage(prompt);

      // Store agent for approval flow
      if (result.type === "purchase_result" && result.result?.pendingApproval) {
        approvalAgents.set(result.result.requestId, agent);
      }
      output = JSON.stringify(result, null, 2);
    } else {
      output = await generateText(prompt);
    }

    const nonce = crypto.randomBytes(16).toString("hex");
    const message = JSON.stringify({ prompt, output, nonce });
    const messageBytes = new TextEncoder().encode(message);
    const sigBytes = await signer.sign(messageBytes);
    const signature = Buffer.from(sigBytes).toString("base64");

    res.json({ ok: true, output, signature, signer: signer.publicKey.toBase58(), nonce });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Purchase endpoint — multi-user via headers
app.post("/purchase", async (req, res) => {
  const creds = getAurexCreds(req);
  if (!creds) {
    return res.status(401).json({
      ok: false,
      error: "Aurex credentials required. Pass X-Aurex-Key and X-Aurex-User-Id headers, or set AUREX_API_KEY and AUREX_USER_ID in .env",
    });
  }

  const { product, merchant, maxBudget, url } = req.body || {};
  if (!product || !maxBudget) {
    return res.status(400).json({ ok: false, error: "Required: product, maxBudget. Optional: merchant, url" });
  }

  try {
    const agent = createAgent(creds);
    const result = await agent.executePurchase({
      product,
      merchant: merchant || "unknown",
      maxBudget: parseFloat(maxBudget),
      url,
    });

    // Store agent for approval
    if (result.requestId) {
      approvalAgents.set(result.requestId, agent);
    }
    res.json({ ok: result.success, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/approve/:requestId", (req, res) => {
  const agent = approvalAgents.get(req.params.requestId);
  if (!agent) {
    // Try fallback with env creds
    const creds = getAurexCreds(req);
    if (creds) {
      const a = createAgent(creds);
      const handled = a.approval.handleResponse(req.params.requestId, true);
      return res.json({ ok: handled, action: "approved" });
    }
    return res.status(404).json({ ok: false, error: "Request not found" });
  }
  const handled = agent.approval.handleResponse(req.params.requestId, true);
  if (handled) approvalAgents.delete(req.params.requestId);
  res.json({ ok: handled, action: "approved" });
});

app.post("/reject/:requestId", (req, res) => {
  const agent = approvalAgents.get(req.params.requestId);
  if (agent) {
    agent.approval.handleResponse(req.params.requestId, false);
    approvalAgents.delete(req.params.requestId);
  }
  res.json({ ok: true, action: "rejected" });
});

// Card management — multi-user via headers
app.get("/cards", async (req, res) => {
  const creds = getAurexCreds(req);
  if (!creds) return res.status(401).json({ ok: false, error: "X-Aurex-Key and X-Aurex-User-Id required" });
  try {
    const agent = createAgent(creds);
    res.json(await agent.aurex.listCards(creds.userId));
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

app.get("/balance", async (req, res) => {
  const creds = getAurexCreds(req);
  if (!creds) return res.status(401).json({ ok: false, error: "X-Aurex-Key and X-Aurex-User-Id required" });
  try {
    const agent = createAgent(creds);
    const balance = await agent.aurex.getUserBalance(creds.userId);
    res.json({ ok: true, balance });
  } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
});

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`\n  AurexCash Agent: http://localhost:${PORT}`);
  console.log("  \n  Multi-user mode: pass X-Aurex-Key + X-Aurex-User-Id headers");
  console.log("  Or set AUREX_API_KEY + AUREX_USER_ID in .env for single-user\n");
  console.log("  Endpoints:");
  console.log("    GET  /health");
  console.log("    POST /mcp        (auto-detects purchase intent)");
  console.log("    POST /purchase   (structured purchase)");
  console.log("    POST /approve/:id");
  console.log("    POST /reject/:id");
  console.log("    GET  /cards");
  console.log("    GET  /balance\n");
});
