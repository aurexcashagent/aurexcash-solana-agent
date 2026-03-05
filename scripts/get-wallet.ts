import { SolanaSDK } from "8004-solana";
import { Keypair, PublicKey } from "@solana/web3.js";

async function main() {
  const pk = process.env.SOLANA_PRIVATE_KEY;
  if (!pk) throw new Error("SOLANA_PRIVATE_KEY is not set");

  const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(pk)));
  const sdk = new SolanaSDK({ signer });

  const AGENT_ASSET = new PublicKey("FSQcBRee4uviHS61VRViavoqVE9zZ14DrSNQPdiRt4ae");

  const agent = await sdk.loadAgent(AGENT_ASSET);

  console.log("Agent asset:", AGENT_ASSET.toBase58());
  console.log("Agent wallet:", agent.wallet?.toBase58?.() ?? agent.wallet);
}

main().catch(console.error);
