#!/usr/bin/env node

/**
 * Aurex Cash — MCP Server
 *
 * AI agent that pays with virtual cards via Aurex API.
 * Install: npm install -g @aurexcash/agent
 * Setup:  aurex-agent setup
 * Connect: aurex-agent setup-mcp
 *
 * Then in Claude: "Create a $100 card for Amazon"
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { AurexClient } from "./src/aurex-client.js";

// ─── Config ───

const AUREX_API_KEY = process.env.AUREX_API_KEY;
const AUREX_USER_ID = process.env.AUREX_USER_ID;

if (!AUREX_API_KEY || !AUREX_USER_ID) {
  console.error(
    "Missing AUREX_API_KEY or AUREX_USER_ID.\nRun: aurex-agent setup"
  );
  process.exit(1);
}

const client = new AurexClient(AUREX_API_KEY);

// ─── MCP Server ───

const server = new Server(
  { name: "aurex-cash", version: "2.1.0" },
  { capabilities: { tools: {} } }
);

// ─── Tool Definitions ───

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "aurex_balance",
      description:
        "Check your Aurex wallet balance. Returns the current USD balance available for card creation.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "aurex_create_card",
      description:
        "Create a new virtual Visa/Mastercard card with a specific balance. The card can be used at any online merchant. Minimum balance $25, maximum $100,000. Fees: $19 issue fee + 5% service fee deducted from wallet.",
      inputSchema: {
        type: "object",
        properties: {
          cardName: {
            type: "string",
            description:
              "Name for the card, e.g. 'Amazon-AirPods' or 'Shopping-March'",
          },
          amount: {
            type: "number",
            description: "Card balance in USD (minimum $25)",
          },
        },
        required: ["cardName", "amount"],
      },
    },
    {
      name: "aurex_list_cards",
      description:
        "List all your virtual cards with their balances, statuses, and IDs.",
      inputSchema: { type: "object", properties: {} },
    },
    {
      name: "aurex_card_details",
      description:
        "Get full card details including card number (PAN), CVV, and expiry date. Use this when you need to fill a checkout form. Handle these details securely.",
      inputSchema: {
        type: "object",
        properties: {
          cardId: {
            type: "string",
            description: "Card ID from aurex_list_cards or aurex_create_card",
          },
        },
        required: ["cardId"],
      },
    },
    {
      name: "aurex_topup_card",
      description:
        "Add funds to an existing card. Minimum $10, maximum $10,000 per top-up. 3% service fee applied.",
      inputSchema: {
        type: "object",
        properties: {
          cardId: { type: "string", description: "Card ID to top up" },
          amount: {
            type: "number",
            description: "Amount in USD to add (minimum $10)",
          },
        },
        required: ["cardId", "amount"],
      },
    },
    {
      name: "aurex_card_transactions",
      description:
        "Get transaction history for a specific card. Shows all purchases, declines, and pending transactions.",
      inputSchema: {
        type: "object",
        properties: {
          cardId: { type: "string", description: "Card ID" },
        },
        required: ["cardId"],
      },
    },
    {
      name: "aurex_get_otp",
      description:
        "Get a one-time password (OTP) for 3D Secure card verification during checkout. The code expires in 300 seconds. Use when a merchant requires 3DS verification.",
      inputSchema: {
        type: "object",
        properties: {
          cardId: { type: "string", description: "Card ID" },
        },
        required: ["cardId"],
      },
    },
    {
      name: "aurex_calculate_fees",
      description:
        "Calculate the total cost of creating a card, including issue fee ($19) and service fee (5%). Useful before creating a card to show the user exact costs.",
      inputSchema: {
        type: "object",
        properties: {
          amount: {
            type: "number",
            description: "Desired card balance in USD",
          },
        },
        required: ["amount"],
      },
    },
  ],
}));

// ─── Tool Handlers ───

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  try {
    switch (name) {
      case "aurex_balance": {
        const balance = await client.getUserBalance(AUREX_USER_ID);
        return result(`Wallet balance: $${balance.toFixed(2)}`);
      }

      case "aurex_create_card": {
        const { cardName, amount } = args;
        if (amount < 25) return error("Minimum card balance is $25");
        if (amount > 100000) return error("Maximum card balance is $100,000");

        const fees = calculateFees(amount);
        const res = await client.createCard(AUREX_USER_ID, cardName, amount);
        const card = res.data;

        return result(
          [
            `Card created successfully.`,
            ``,
            `Card ID: ${card.cardId}`,
            `Name: ${card.cardName}`,
            `Balance: $${card.balance}`,
            `Status: ${card.status}`,
            ``,
            `Fees charged:`,
            `  Issue fee: $${fees.issueFee}`,
            `  Service fee: $${fees.serviceFee.toFixed(2)}`,
            `  Total from wallet: $${fees.depositAmount.toFixed(2)}`,
            ``,
            `Use aurex_card_details to get the full card number for checkout.`,
          ].join("\n")
        );
      }

      case "aurex_list_cards": {
        const res = await client.listCards(AUREX_USER_ID);
        const cards = res.data || [];

        if (cards.length === 0) return result("No cards found. Use aurex_create_card to create one.");

        const lines = cards.map(
          (c) =>
            `${c.cardId} | ${c.cardName} | $${c.balance} | ${c.status}`
        );
        return result(
          [`Cards (${cards.length}):`, ``, `ID | Name | Balance | Status`, ...lines].join("\n")
        );
      }

      case "aurex_card_details": {
        const res = await client.getCardDetails(AUREX_USER_ID, args.cardId);
        const card = res.data;

        return result(
          [
            `Card Details (handle securely):`,
            ``,
            `Number: ${card.cardNumber}`,
            `Expiry: ${card.expiryDate}`,
            `CVV: ${card.cvv}`,
            `Balance: $${card.balance}`,
            `Status: ${card.status}`,
          ].join("\n")
        );
      }

      case "aurex_topup_card": {
        const { cardId, amount } = args;
        if (amount < 10) return error("Minimum top-up is $10");
        if (amount > 10000) return error("Maximum top-up is $10,000");

        const fee = Math.ceil(amount * 0.03 * 100) / 100;
        const res = await client.topUpCard(AUREX_USER_ID, cardId, amount);

        return result(
          [
            `Card topped up successfully.`,
            ``,
            `Card: ${res.data?.cardId || cardId}`,
            `Added: $${amount}`,
            `Fee (3%): $${fee.toFixed(2)}`,
            `Total charged: $${(amount + fee).toFixed(2)}`,
            `New balance: $${res.data?.newBalance || "check with aurex_list_cards"}`,
          ].join("\n")
        );
      }

      case "aurex_card_transactions": {
        const res = await client.getTransactions(AUREX_USER_ID, args.cardId);
        const txns = res.data || [];

        if (txns.length === 0) return result("No transactions found for this card.");

        const lines = txns.map(
          (t) =>
            `${t.createdAt} | $${t.amount} ${t.currency} | ${t.status}`
        );
        return result(
          [`Transactions (${txns.length}):`, ``, ...lines].join("\n")
        );
      }

      case "aurex_get_otp": {
        const res = await client.getOTP(AUREX_USER_ID, args.cardId);
        return result(
          [
            `3DS OTP Code: ${res.data.otp}`,
            `Expires in: ${res.data.expiresIn} seconds`,
            ``,
            `Enter this code in the 3D Secure verification form on the merchant site.`,
          ].join("\n")
        );
      }

      case "aurex_calculate_fees": {
        const fees = calculateFees(args.amount);
        return result(
          [
            `Fee calculation for $${args.amount} card:`,
            ``,
            `Card balance: $${args.amount}`,
            `Issue fee: $${fees.issueFee}`,
            `Service fee (5%): $${fees.serviceFee.toFixed(2)}`,
            `Total from wallet: $${fees.depositAmount.toFixed(2)}`,
          ].join("\n")
        );
      }

      default:
        return error(`Unknown tool: ${name}`);
    }
  } catch (err) {
    return error(`${err.message}`);
  }
});

// ─── Helpers ───

function result(text) {
  return { content: [{ type: "text", text }] };
}

function error(text) {
  return { content: [{ type: "text", text: `Error: ${text}` }], isError: true };
}

function calculateFees(amount) {
  const issueFee = 19;
  const serviceFee = Math.ceil(amount * 0.05 * 100) / 100;
  return {
    issueFee,
    serviceFee,
    totalFees: issueFee + serviceFee,
    depositAmount: amount + issueFee + serviceFee,
    cardBalance: amount,
  };
}

// ─── Start ───

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Aurex Cash MCP Server running");
}

main().catch((err) => {
  console.error("Fatal:", err);
  process.exit(1);
});
