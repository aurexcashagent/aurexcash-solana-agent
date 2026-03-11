/**
 * Purchase Agent
 * Main orchestrator: parses intent → approval → card → checkout → confirm
 */

import { AurexClient } from "../aurex/client.js";
import { CardManager } from "../aurex/card-manager.js";
import { ApprovalEngine } from "../approval/engine.js";
import { CheckoutAutomation } from "../browser/checkout.js";

export class PurchaseAgent {
  constructor(config) {
    this.userId = config.userId;
    this.aurex = new AurexClient(config.aurexApiKey);
    this.cards = new CardManager(this.aurex);
    this.approval = new ApprovalEngine({
      transport: config.approvalTransport || "console",
      telegramBot: config.telegramBot,
      telegramChatId: config.telegramChatId,
    });
    this.browser = config.enableBrowser !== false
      ? new CheckoutAutomation()
      : null;

    this.log = config.logger || console;
  }

  /**
   * Execute a full purchase flow
   * @param {object} intent - parsed purchase intent
   * @param {string} intent.product - what to buy
   * @param {string} intent.merchant - where to buy (e.g. "amazon.com")
   * @param {number} intent.maxBudget - maximum amount user will spend
   * @param {string} [intent.url] - direct product URL
   * @returns {{ success, orderId?, error?, details }}
   */
  async executePurchase(intent) {
    const { product, merchant, maxBudget, url } = intent;

    this.log.info(`[agent] Purchase request: ${product} from ${merchant}, budget $${maxBudget}`);

    try {
      // Step 1: Check wallet balance
      const balance = await this.aurex.getUserBalance(this.userId);
      const fees = this.cards.calculateCreateFees(maxBudget);

      if (balance < fees.depositAmount) {
        return {
          success: false,
          error: "insufficient_balance",
          details: {
            walletBalance: balance,
            required: fees.depositAmount,
            shortfall: fees.depositAmount - balance,
          },
        };
      }

      // Step 2: Request user approval
      this.log.info(`[agent] Requesting approval...`);
      const approvalResult = await this.approval.requestApproval({
        product,
        merchant,
        amount: maxBudget,
        fees,
      });

      if (!approvalResult.approved) {
        this.log.info(`[agent] Purchase ${approvalResult.reason}`);
        return {
          success: false,
          error: approvalResult.reason,
          details: approvalResult,
        };
      }

      // Step 3: Create card
      this.log.info(`[agent] Creating card for $${maxBudget}...`);
      const cardResult = await this.cards.createPurchaseCard(
        this.userId,
        merchant,
        maxBudget,
        5 // 5% buffer
      );

      const cardId = cardResult.data?.cardId;
      if (!cardId) {
        return { success: false, error: "card_creation_failed", details: cardResult };
      }

      this.log.info(`[agent] Card created: ${cardId}`);

      // Step 4: Get card details for checkout
      const checkoutDetails = await this.cards.getCheckoutDetails(this.userId, cardId);

      // Step 5: Perform checkout (if browser enabled)
      if (this.browser && url) {
        this.log.info(`[agent] Starting browser checkout...`);

        const checkoutResult = await this.browser.performCheckout({
          url,
          card: checkoutDetails,
          product,
          getOtp: async () => {
            const otp = await this.cards.get3dsCode(this.userId, cardId);
            return otp.code;
          },
        });

        if (!checkoutResult.success) {
          return {
            success: false,
            error: "checkout_failed",
            details: checkoutResult,
            cardId,
          };
        }

        // Step 6: Verify transaction
        this.log.info(`[agent] Verifying transaction...`);
        await new Promise((r) => setTimeout(r, 5000)); // wait for TX processing

        const verification = await this.cards.verifyPurchase(
          this.userId,
          cardId,
          maxBudget
        );

        return {
          success: true,
          orderId: checkoutResult.orderId,
          cardId,
          transactionVerified: verification.found,
          transaction: verification.transaction,
          details: checkoutResult,
        };
      }

      // No browser — return card details for manual checkout
      return {
        success: true,
        mode: "manual",
        cardId,
        card: {
          number: checkoutDetails.number,
          expiry: checkoutDetails.expiry,
          cvv: checkoutDetails.cvv,
        },
        message: "Card created. Use these details for manual checkout.",
      };
    } catch (err) {
      this.log.error(`[agent] Purchase failed: ${err.message}`);
      return {
        success: false,
        error: "agent_error",
        details: { message: err.message },
      };
    }
  }

  /**
   * Handle a natural language purchase request
   * Extracts intent and calls executePurchase
   */
  async handleMessage(message) {
    const intent = this.parseIntent(message);

    if (!intent) {
      return {
        type: "clarification_needed",
        message:
          "I need more details. Tell me what you want to buy, where, and your budget. Example: 'Buy AirPods Pro on Amazon, up to $300'",
      };
    }

    const result = await this.executePurchase(intent);

    return {
      type: "purchase_result",
      intent,
      result,
    };
  }

  /**
   * Simple intent parser — extract product, merchant, budget from text
   * In production, replace with LLM-based parsing
   */
  parseIntent(text) {
    const lower = text.toLowerCase();

    // Extract budget
    const budgetMatch = lower.match(
      /(?:up to|budget|max|до|максимум|за)\s*\$?(\d+(?:\.\d{1,2})?)/
    );
    const maxBudget = budgetMatch ? parseFloat(budgetMatch[1]) : null;

    // Extract merchant
    const merchants = {
      amazon: "amazon.com",
      ebay: "ebay.com",
      walmart: "walmart.com",
      aliexpress: "aliexpress.com",
      newegg: "newegg.com",
    };

    let merchant = null;
    for (const [key, domain] of Object.entries(merchants)) {
      if (lower.includes(key)) {
        merchant = domain;
        break;
      }
    }

    // Extract URL if present
    const urlMatch = text.match(/(https?:\/\/[^\s]+)/);
    const url = urlMatch ? urlMatch[1] : null;

    if (url && !merchant) {
      try {
        merchant = new URL(url).hostname;
      } catch {}
    }

    // Extract product (rough — everything between "buy" and merchant/budget)
    const buyMatch = lower.match(
      /(?:buy|купи|закажи|order)\s+(.+?)(?:\s+on\s+|\s+from\s+|\s+за\s+|\s+up to|\s+budget|\s*$)/
    );
    const product = buyMatch ? buyMatch[1].trim() : null;

    if (!product && !url) return null;

    return {
      product: product || "item from link",
      merchant: merchant || "unknown",
      maxBudget: maxBudget || 100,
      url,
    };
  }
}
