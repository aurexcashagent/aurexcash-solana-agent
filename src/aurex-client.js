/**
 * Aurex API Client
 * Docs: https://docs.aurex.cash/cards-and-usage/api
 */

const BASE_URL = "https://aurex.cash/api/dashboard";

export class AurexClient {
  constructor(apiKey) {
    this.apiKey = apiKey;
    this.baseUrl = BASE_URL;
  }

  async _request(method, path, body = null) {
    const url = `${this.baseUrl}${path}`;
    const opts = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    const data = await res.json();

    if (!res.ok || data.success === false) {
      throw new Error(data.error || `Aurex API error: HTTP ${res.status}`);
    }
    return data;
  }

  async getUser(userId) {
    return this._request("GET", `/users/${userId}`);
  }

  async getUserBalance(userId) {
    const user = await this.getUser(userId);
    return user.data?.balance ?? 0;
  }

  async createCard(userId, cardName, initialBalance) {
    return this._request("POST", `/users/${userId}/cards`, {
      cardName,
      initialBalance,
    });
  }

  async getCardDetails(userId, cardId) {
    return this._request("GET", `/users/${userId}/cards/${cardId}`);
  }

  async listCards(userId) {
    return this._request("GET", `/users/${userId}/cards`);
  }

  async topUpCard(userId, cardId, amount) {
    return this._request("POST", `/users/${userId}/cards/${cardId}/topup`, {
      amount,
    });
  }

  async getTransactions(userId, cardId) {
    return this._request(
      "GET",
      `/users/${userId}/cards/${cardId}/transactions`
    );
  }

  async getOTP(userId, cardId) {
    return this._request("GET", `/users/${userId}/otp?cardId=${cardId}`);
  }
}
