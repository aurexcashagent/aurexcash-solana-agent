/**
 * AurexCash Solana Agent — Enhanced Server
 *
 * Original: MCP endpoint with signed responses
 * Added:    /purchase, /approve/:id, /reject/:id, /cards, /balance
 *
 * Drop-in replacement for the existing server.js
 */

import express from "express";
import OpenAI from "openai";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import crypto from "crypto";
import { PurchaseAgent } from "./src/agent/purchase-agent.js";

// ─── Existing helpers (unchanged) ───

function getKeypairFromEnv() {
  const pk = process.env.SOLANA_PRIVATE_KEY;
  if (!pk) throw new Error("SOLANA_PRIVATE_KEY is not set");
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(pk)));
}

function makeSigner(keypair) {
  return {
    publicKey: keypair.publicKey,
    sign: async (messageBytes) =>
      nacl.sign.detached(messageBytes, keypair.secretKey),
  };
}

async function generateText(prompt) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return `AurexCash: получен prompt "${prompt}". (OPENAI_API_KEY не задан)`;
  }
  const client = new OpenAI({ apiKey });
  const resp = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });
  return resp.output_text || "(no output_text)";
}

// ─── Purchase Agent Setup ───

const purchaseAgent = process.env.AUREX_API_KEY
  ? new PurchaseAgent({
      userId: process.env.AUREX_USER_ID,
      aurexApiKey: process.env.AUREX_API_KEY,
      approvalTransport: process.env.APPROVAL_TRANSPORT || "console",
      enableBrowser: process.env.ENABLE_BROWSER === "true",
    })
  : null;

// ─── Server ───

const app = express();
app.use(express.json({ limit: "2mb" }));

// ── Existing endpoints (unchanged) ──

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    features: {
      mcp: true,
      purchase: !!purchaseAgent,
      browser: process.env.ENABLE_BROWSER === "true",
    },
  });
});

app.post("/mcp", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res
        .status(400)
        .json({ ok: false, error: "prompt must be a non-empty string" });
    }

    const keypair = getKeypairFromEnv();
    const signer = makeSigner(keypair);

    // Check if this is a purchase request
    const isPurchase =
      purchaseAgent && /\b(buy|купи|закажи|order|purchase)\b/i.test(prompt);

    let output;
    if (isPurchase) {
      const result = await purchaseAgent.handleMessage(prompt);
      output = JSON.stringify(result, null, 2);
    } else {
      output = await generateText(prompt);
    }

    // Sign response
    const nonce = crypto.randomBytes(16).toString("hex");
    const message = JSON.stringify({ prompt, output, nonce });
    const messageBytes = new TextEncoder().encode(message);
    const sigBytes = await signer.sign(messageBytes);
    const signature = Buffer.from(sigBytes).toString("base64");

    res.json({
      ok: true,
      output,
      signature,
      signer: signer.publicKey.toBase58(),
      nonce,
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// ── New: Purchase endpoints ──

app.post("/purchase", async (req, res) => {
  if (!purchaseAgent) {
    return res.status(503).json({
      ok: false,
      error: "Purchase agent not configured. Set AUREX_API_KEY and AUREX_USER_ID.",
    });
  }

  const { product, merchant, maxBudget, url } = req.body || {};
  if (!product || !maxBudget) {
    return res.status(400).json({
      ok: false,
      error: "Required: product, maxBudget. Optional: merchant, url",
    });
  }

  try {
    const result = await purchaseAgent.executePurchase({
      product,
      merchant: merchant || "unknown",
      maxBudget: parseFloat(maxBudget),
      url,
    });
    res.json({ ok: result.success, ...result });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.post("/approve/:requestId", (req, res) => {
  if (!purchaseAgent) return res.status(503).json({ ok: false });

  const handled = purchaseAgent.approval.handleResponse(
    req.params.requestId,
    true
  );
  res.json({ ok: handled, action: "approved" });
});

app.post("/reject/:requestId", (req, res) => {
  if (!purchaseAgent) return res.status(503).json({ ok: false });

  const handled = purchaseAgent.approval.handleResponse(
    req.params.requestId,
    false
  );
  res.json({ ok: handled, action: "rejected" });
});

// ── New: Card management endpoints ──

app.get("/cards", async (req, res) => {
  if (!purchaseAgent) return res.status(503).json({ ok: false });
  try {
    const result = await purchaseAgent.aurex.listCards(purchaseAgent.userId);
    res.json(result);
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

app.get("/balance", async (req, res) => {
  if (!purchaseAgent) return res.status(503).json({ ok: false });
  try {
    const balance = await purchaseAgent.aurex.getUserBalance(
      purchaseAgent.userId
    );
    res.json({ ok: true, balance });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

// ── Start ──

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`\n  ◎ AurexCash Agent: http://localhost:${PORT}`);
  console.log(`  ├─ Health:   GET  /health`);
  console.log(`  ├─ MCP:      POST /mcp`);
  console.log(`  ├─ Purchase: POST /purchase`);
  console.log(`  ├─ Approve:  POST /approve/:id`);
  console.log(`  ├─ Reject:   POST /reject/:id`);
  console.log(`  ├─ Cards:    GET  /cards`);
  console.log(`  └─ Balance:  GET  /balance\n`);

  if (!purchaseAgent) {
    console.log(
      "  ⚠ Purchase agent disabled. Set AUREX_API_KEY and AUREX_USER_ID to enable.\n"
    );
  }
});
