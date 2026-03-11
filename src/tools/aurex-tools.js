/**
 * MCP Tools Registration
 * Makes Aurex card operations available as MCP tools
 * Used by the agent to interact with Aurex API
 */

export function registerAurexTools(agent) {
  return [
    {
      name: "aurex_create_card",
      description:
        "Create a new virtual card on Aurex. Returns card details for checkout. Requires user approval first.",
      parameters: {
        type: "object",
        properties: {
          merchant: { type: "string", description: "Merchant name (e.g. amazon.com)" },
          amount: { type: "number", description: "Card balance in USD (min $25)" },
        },
        required: ["merchant", "amount"],
      },
      handler: async ({ merchant, amount }) => {
        return agent.cards.createPurchaseCard(agent.userId, merchant, amount);
      },
    },
    {
      name: "aurex_get_card",
      description:
        "Get full card details (number, CVV, expiry) for checkout. Handle securely.",
      parameters: {
        type: "object",
        properties: {
          cardId: { type: "string", description: "Card ID from aurex_create_card" },
        },
        required: ["cardId"],
      },
      handler: async ({ cardId }) => {
        return agent.cards.getCheckoutDetails(agent.userId, cardId);
      },
    },
    {
      name: "aurex_topup_card",
      description: "Add funds to an existing card. Min $10, max $10k. 3% fee.",
      parameters: {
        type: "object",
        properties: {
          cardId: { type: "string" },
          amount: { type: "number", description: "Amount to add in USD" },
        },
        required: ["cardId", "amount"],
      },
      handler: async ({ cardId, amount }) => {
        return agent.aurex.topUpCard(agent.userId, cardId, amount);
      },
    },
    {
      name: "aurex_get_otp",
      description:
        "Get OTP code for 3DS card verification during checkout. Code expires in 300 seconds.",
      parameters: {
        type: "object",
        properties: {
          cardId: { type: "string" },
        },
        required: ["cardId"],
      },
      handler: async ({ cardId }) => {
        return agent.cards.get3dsCode(agent.userId, cardId);
      },
    },
    {
      name: "aurex_list_cards",
      description: "List all virtual cards for the current user.",
      parameters: { type: "object", properties: {} },
      handler: async () => {
        return agent.aurex.listCards(agent.userId);
      },
    },
    {
      name: "aurex_check_balance",
      description: "Check the user's Aurex wallet balance.",
      parameters: { type: "object", properties: {} },
      handler: async () => {
        const balance = await agent.aurex.getUserBalance(agent.userId);
        return { balance };
      },
    },
    {
      name: "aurex_verify_purchase",
      description:
        "Check if a purchase transaction completed on a card.",
      parameters: {
        type: "object",
        properties: {
          cardId: { type: "string" },
          expectedAmount: { type: "number" },
        },
        required: ["cardId"],
      },
      handler: async ({ cardId, expectedAmount }) => {
        return agent.cards.verifyPurchase(
          agent.userId,
          cardId,
          expectedAmount || 0,
          10
        );
      },
    },
    {
      name: "aurex_request_approval",
      description:
        "Request user approval for a purchase. Must be called before creating a card.",
      parameters: {
        type: "object",
        properties: {
          product: { type: "string" },
          merchant: { type: "string" },
          amount: { type: "number" },
        },
        required: ["product", "merchant", "amount"],
      },
      handler: async ({ product, merchant, amount }) => {
        const fees = agent.cards.calculateCreateFees(amount);
        return agent.approval.requestApproval({
          product,
          merchant,
          amount,
          fees,
        });
      },
    },
  ];
}
