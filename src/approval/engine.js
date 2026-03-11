/**
 * Approval Engine
 * Human-in-the-loop confirmation for all spending actions
 * Supports: Telegram, Console (for dev), Webhook
 */

import crypto from "crypto";

const APPROVAL_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export class ApprovalEngine {
  constructor(opts = {}) {
    this.pending = new Map(); // requestId -> { resolve, reject, timeout, data }
    this.transport = opts.transport || "console"; // "console" | "telegram" | "webhook"
    this.telegramBot = opts.telegramBot || null;
    this.telegramChatId = opts.telegramChatId || null;
    this.webhookUrl = opts.webhookUrl || null;
    this.onApprovalRequest = opts.onApprovalRequest || null;
  }

  /**
   * Request user approval for a purchase
   * Returns a Promise that resolves when user approves or rejects
   */
  async requestApproval(purchaseDetails) {
    const requestId = crypto.randomBytes(8).toString("hex");

    const data = {
      requestId,
      ...purchaseDetails,
      createdAt: Date.now(),
    };

    const message = this._formatMessage(data);

    return new Promise((resolve, reject) => {
      // Set timeout for auto-decline
      const timeout = setTimeout(() => {
        this.pending.delete(requestId);
        resolve({ approved: false, reason: "timeout", requestId });
      }, APPROVAL_TIMEOUT_MS);

      this.pending.set(requestId, { resolve, reject, timeout, data });

      // Send approval request via chosen transport
      this._sendRequest(requestId, message, data);
    });
  }

  /**
   * Handle user response (called by transport handler)
   */
  handleResponse(requestId, approved) {
    const entry = this.pending.get(requestId);
    if (!entry) return false;

    clearTimeout(entry.timeout);
    this.pending.delete(requestId);

    entry.resolve({
      approved,
      reason: approved ? "user_approved" : "user_rejected",
      requestId,
      respondedAt: Date.now(),
    });

    return true;
  }

  // ─── Private ───

  _formatMessage(data) {
    const fees = data.fees || {};
    const lines = [
      `🛒 Purchase Request`,
      ``,
      `Product: ${data.product || "Unknown"}`,
      `Store: ${data.merchant || "Unknown"}`,
      `Price: $${data.amount?.toFixed(2) || "?"}`,
    ];

    if (fees.totalFees) {
      lines.push(`Card fees: $${fees.totalFees.toFixed(2)}`);
      lines.push(`Total from wallet: $${fees.depositAmount?.toFixed(2)}`);
    }

    if (data.cardId) {
      lines.push(`Card: ...${data.cardId.slice(-6)}`);
    }

    lines.push(``);
    lines.push(`Approve this purchase?`);

    return lines.join("\n");
  }

  async _sendRequest(requestId, message, data) {
    switch (this.transport) {
      case "telegram":
        await this._sendTelegram(requestId, message);
        break;
      case "webhook":
        await this._sendWebhook(requestId, message, data);
        break;
      case "console":
      default:
        this._sendConsole(requestId, message);
        break;
    }

    // Custom handler
    if (this.onApprovalRequest) {
      this.onApprovalRequest(requestId, message, data);
    }
  }

  _sendConsole(requestId, message) {
    console.log("\n" + "═".repeat(50));
    console.log(message);
    console.log(`\nRequest ID: ${requestId}`);
    console.log(`To approve:  POST /approve/${requestId}`);
    console.log(`To reject:   POST /reject/${requestId}`);
    console.log("═".repeat(50) + "\n");
  }

  async _sendTelegram(requestId, message) {
    if (!this.telegramBot || !this.telegramChatId) {
      console.warn("Telegram not configured, falling back to console");
      return this._sendConsole(requestId, message);
    }

    // Send message with inline keyboard
    const keyboard = {
      inline_keyboard: [
        [
          {
            text: "✅ Approve",
            callback_data: `approve:${requestId}`,
          },
          {
            text: "❌ Reject",
            callback_data: `reject:${requestId}`,
          },
        ],
      ],
    };

    await this.telegramBot.sendMessage(this.telegramChatId, message, {
      reply_markup: keyboard,
      parse_mode: "Markdown",
    });
  }

  async _sendWebhook(requestId, message, data) {
    if (!this.webhookUrl) {
      return this._sendConsole(requestId, message);
    }

    await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type: "approval_request",
        requestId,
        message,
        data,
      }),
    });
  }
}
