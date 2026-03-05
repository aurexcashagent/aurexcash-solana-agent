import express from "express";
import OpenAI from "openai";
import { Keypair } from "@solana/web3.js";
import nacl from "tweetnacl";
import crypto from "crypto";

// ---------- config ----------
const PORT = Number(process.env.PORT || 8787);

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
  if (!apiKey) {
    // fallback чтобы MCP работал даже без OpenAI ключа
    return `AurexCash: получен prompt "${prompt}". (OPENAI_API_KEY не задан, поэтому отвечаю локальным fallback)`;
  }

  const client = new OpenAI({ apiKey });

  const resp = await client.responses.create({
    model: "gpt-4.1-mini",
    input: prompt,
  });

  // responses API отдаёт текст так:
  return resp.output_text || "(no output_text)";
}

// ---------- server ----------
const app = express();
app.use(express.json({ limit: "2mb" }));

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/mcp", async (req, res) => {
  try {
    const { prompt } = req.body || {};
    if (typeof prompt !== "string" || !prompt.trim()) {
      return res.status(400).json({ ok: false, error: "prompt must be a non-empty string" });
    }

    const keypair = getKeypairFromEnv();
    const signer = makeSigner(keypair);

    const output = await generateText(prompt);

    // prompt + output + nonce
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

const PORT = process.env.PORT || 8787;

app.listen(PORT, () => {
  console.log(`AurexCash server: http://localhost:${PORT}`);
  console.log(`curl -s http://localhost:${PORT}/health`);
  console.log(
    `curl -s -X POST http://localhost:${PORT}/mcp -H 'Content-Type: application/json' -d '{"prompt":"Hello from AurexCash"}'`
  );
});
