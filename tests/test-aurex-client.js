/**
 * Test: Aurex Client
 * Run: node tests/test-aurex-client.js
 *
 * Tests Aurex API client against real or mock endpoints
 */

import { AurexClient } from "../src/aurex/client.js";
import { CardManager, FEES } from "../src/aurex/card-manager.js";

// ─── Fee calculation tests (no API needed) ───

function testFeeCalculations() {
  const manager = new CardManager(null);

  // Test 1: Create card fees for $100
  const fees100 = manager.calculateCreateFees(100);
  console.log("Create $100 card:", fees100);
  assert(fees100.issueFee === 19, "Issue fee should be $19");
  assert(fees100.serviceFee === 5, "Service fee should be $5 (5%)");
  assert(fees100.totalFees === 24, "Total fees should be $24");
  assert(fees100.depositAmount === 124, "Deposit should be $124");
  console.log("✓ Fee calculation for $100 card\n");

  // Test 2: Create card fees for $500
  const fees500 = manager.calculateCreateFees(500);
  console.log("Create $500 card:", fees500);
  assert(fees500.serviceFee === 25, "Service fee should be $25");
  assert(fees500.depositAmount === 544, "Deposit should be $544");
  console.log("✓ Fee calculation for $500 card\n");

  // Test 3: Top-up fees
  const topup = manager.calculateTopupFees(100);
  console.log("Topup $100:", topup);
  assert(topup.serviceFee === 3, "Topup fee should be $3 (3%)");
  assert(topup.depositAmount === 103, "Topup deposit should be $103");
  console.log("✓ Topup fee calculation\n");
}

// ─── Intent parsing tests ───

function testIntentParsing() {
  // Lazy import to avoid circular deps
  const { PurchaseAgent } = await import("../src/agent/purchase-agent.js");
  const agent = new PurchaseAgent({
    userId: "test",
    aurexApiKey: "test",
  });

  const tests = [
    {
      input: "Buy AirPods Pro on Amazon up to $300",
      expected: { product: "airpods pro", merchant: "amazon.com", maxBudget: 300 },
    },
    {
      input: "Order a keyboard from ebay budget $150",
      expected: { merchant: "ebay.com", maxBudget: 150 },
    },
    {
      input: "Купи наушники на aliexpress за $50",
      expected: { merchant: "aliexpress.com", maxBudget: 50 },
    },
    {
      input: "Buy from https://amazon.com/dp/B09JQMJHXY up to $200",
      expected: { merchant: "amazon.com", maxBudget: 200 },
    },
  ];

  for (const t of tests) {
    const result = agent.parseIntent(t.input);
    console.log(`Input: "${t.input}"`);
    console.log("Parsed:", result);

    if (t.expected.merchant) {
      assert(
        result?.merchant === t.expected.merchant,
        `Merchant should be ${t.expected.merchant}, got ${result?.merchant}`
      );
    }
    if (t.expected.maxBudget) {
      assert(
        result?.maxBudget === t.expected.maxBudget,
        `Budget should be ${t.expected.maxBudget}, got ${result?.maxBudget}`
      );
    }
    console.log("✓ Passed\n");
  }
}

// ─── Helpers ───

function assert(condition, msg) {
  if (!condition) throw new Error(`Assertion failed: ${msg}`);
}

// ─── Run ───

console.log("═══ Aurex Client Tests ═══\n");

testFeeCalculations();

console.log("═══ Intent Parsing Tests ═══\n");
// testIntentParsing is async due to dynamic import
testIntentParsing()
  .then(() => console.log("\n✅ All tests passed"))
  .catch((e) => {
    console.error("\n❌ Test failed:", e.message);
    process.exit(1);
  });
