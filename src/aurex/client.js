/**
 * Aurex API Client
 * Wraps all aurex.cash/api/dashboard endpoints for card management
 * Docs: https://docs.aurex.cash/cards-and-usage/api
 */

const BASE_URL = process.env.AUREX_API_URL || "https://aurex.cash/api/dashboard";

export class AurexClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = BASE_URL;
  }

  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      Authorization: `Bearer ${this.apiKey}`,
      "Content-Type": "application/json",
    };

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const data = await res.json();

    if (!res.ok || data.success === false) {
      throw new AurexApiError(
        data.error || `HTTP ${res.status}`,
        res.status,
        data
      );
    }

    return data;
  }

  // ─── Users ───

  async getUser(userId) {
    return this._request("GET", `/users/${userId}`);
  }

  async getUserBalance(userId) {
    const user = await this.getUser(userId);
    return user.data?.balance ?? 0;
  }

  // ─── Cards ───

  /**
   * Create a new virtual card
   * @param {string} userId
   * @param {string} cardName - e.g. "Amazon-AirPods-2026-03"
   * @param {number} initialBalance - min $25, max $100,000
   * @returns card object with cardId, cardNumber, cvv, expiryDate
   */
  async createCard(userId, cardName, initialBalance) {
    if (initialBalance < 25)
      throw new Error("Minimum card balance is $25");
    if (initialBalance > 100000)
      throw new Error("Maximum card balance is $100,000");

    return this._request("POST", `/users/${userId}/cards`, {
      cardName,
      initialBalance,
    });
  }

  /**
   * Get full card details including PAN, CVV, expiry
   * ⚠️ Handle securely — never log or persist these values
   */
  async getCardDetails(userId, cardId) {
    return this._request("GET", `/users/${userId}/cards/${cardId}`);
  }

  /** List all cards for a user */
  async listCards(userId) {
    return this._request("GET", `/users/${userId}/cards`);
  }

  /**
   * Top up an existing card
   * @param {number} amount - min $10, max $10,000. 3% service fee applied.
   */
  async topUpCard(userId, cardId, amount) {
    if (amount < 10) throw new Error("Minimum top-up is $10");
    if (amount > 10000) throw new Error("Maximum top-up is $10,000");

    return this._request("POST", `/users/${userId}/cards/${cardId}/topup`, {
      amount,
    });
  }

  /** Get transaction history for a card */
  async getTransactions(userId, cardId) {
    return this._request(
      "GET",
      `/users/${userId}/cards/${cardId}/transactions`
    );
  }

  /**
   * Get OTP code for 3DS verification
   * ⚠️ Time-limited (300s) — use immediately
   */
  async getOTP(userId, cardId) {
    return this._request("GET", `/users/${userId}/otp?cardId=${cardId}`);
  }

  // ─── Helpers ───

  /**
   * Find or create a card suitable for a purchase
   * Reuses existing active card with sufficient balance, or creates new one
   */
  async getOrCreateCard(userId, merchantName, amount) {
    // Check existing cards
    const existing = await this.listCards(userId);
    const cards = existing.data || [];

    // Find active card with enough balance
    const suitable = cards.find(
      (c) => c.status === "active" && c.balance >= amount
    );

    if (suitable) {
      // Get full details
      const details = await this.getCardDetails(userId, suitable.cardId);
      return { card: details.data, isNew: false };
    }

    // Create new card
    const cardName = `${merchantName}-${Date.now()}`;
    const result = await this.createCard(userId, cardName, amount);
    return { card: result.data, isNew: true };
  }
}

export class AurexApiError extends Error {
  constructor(message, statusCode, response) {
    super(message);
    this.name = "AurexApiError";
    this.statusCode = statusCode;
    this.response = response;
  }
}
