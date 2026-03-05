import { SolanaSDK, IPFSClient, buildRegistrationFileJson, ServiceType } from "8004-solana";
import { Keypair } from "@solana/web3.js";

async function main() {
  const pk = process.env.SOLANA_PRIVATE_KEY;
  if (!pk) throw new Error("SOLANA_PRIVATE_KEY is not set");

  const jwt = process.env.PINATA_JWT;
  if (!jwt) throw new Error("PINATA_JWT is not set");

  const signer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(pk)));

  const ipfs = new IPFSClient({
    pinataEnabled: true,
    pinataJwt: jwt,
  });

  const sdk = new SolanaSDK({ signer, ipfsClient: ipfs });

  const metadata = buildRegistrationFileJson({
    name: "AurexCash",
    description: "Aurex built by Solana",
    image: "ipfs://placeholder",
    services: [{ type: ServiceType.MCP, value: "https://percolative-ruttiest-shakia.ngrok-free.dev/mcp" }],
    skills: ["natural_language_processing/natural_language_generation/natural_language_generation"],
  });

  const cid = await ipfs.addJson(metadata);
  const result = await sdk.registerAgent(`ipfs://${cid}`);

  console.log("Agent created:", result.asset.toBase58());
}

main().catch(console.error);
