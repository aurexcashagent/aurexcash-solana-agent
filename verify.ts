import { SolanaSDK } from "8004-solana";
import { PublicKey } from "@solana/web3.js";

async function main() {
  const assetStr = process.argv[2];
  if (!assetStr) throw new Error("Usage: npx tsx verify.ts <AGENT_ASSET>");

  const asset = new PublicKey(assetStr);

  const sdk = new SolanaSDK();
  const agent = await sdk.loadAgent(asset);

  console.log("Name:", agent.nft_name);
  console.log("Owner:", agent.getOwnerPublicKey().toBase58());
  console.log("URI:", agent.agent_uri);
}

main().catch(console.error);
