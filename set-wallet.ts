import { SolanaSDK } from "8004-solana";
import { Keypair, PublicKey } from "@solana/web3.js";

async function main() {
  const pk = process.env.SOLANA_PRIVATE_KEY;
  if (!pk) throw new Error("SOLANA_PRIVATE_KEY is not set");

  const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(pk)));
  const sdk = new SolanaSDK({ signer });

  // ✅ ВСТАВЬ СЮДА адрес агента (asset), который тебе выводило: "Agent created: ..."
  const AGENT_ASSET = new PublicKey("FSQcBRee4uviHS61VRViavoqVE9zZ14DrSNQPdiRt4ae");

  // Вариант 1: operational wallet = текущий signer
  const res = await sdk.setAgentWallet(AGENT_ASSET, signer.publicKey);

  console.log("✅ Agent wallet set to:", signer.publicKey.toBase58());
  console.log("Tx:", res.signature ?? res);
}

main().catch(console.error);
