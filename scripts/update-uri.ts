import { SolanaSDK } from "8004-solana";
import { Keypair, PublicKey } from "@solana/web3.js";

async function main() {

  const pk = process.env.SOLANA_PRIVATE_KEY;
  if (!pk) throw new Error("SOLANA_PRIVATE_KEY not set");

  const signer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(pk))
  );

  const sdk = new SolanaSDK({ signer });

  const AGENT = new PublicKey(
    "FSQcBRee4uviHS61VRViavoqVE9zZ14DrSNQPdiRt4ae"
  );

  const NEW_URI =
    "ipfs://Qmbcr46R1TVm8GKsqSBkprUBcxAs6zGyVcUAk15PC45gCj";

  const tx = await sdk.setAgentUri(AGENT, NEW_URI);

  console.log("Agent URI updated");
  console.log(tx);
}

main();
