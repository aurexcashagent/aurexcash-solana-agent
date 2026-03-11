/**
 * Card Manager
 * Higher-level card operations with fee awareness and safety checks
 */

// Fee structure from Aurex docs
const FEES = {
  ISSUE_FEE: 19, // Fixed card issuance fee ($19)
  SERVICE_FEE_RATE: 0.05, // 5% on initial balance
  TOPUP_FEE_RATE: 0.03, // 3% on top-up amount
  MIN_BALANCE: 25,
  MAX_BALANCE: 100000,
  MIN_TOPUP: 10,
  MAX_TOPUP: 10000,
};

export class CardManager {
  constructor(aurexClient) {
    this.client = aurexClient;
  }

  /**
   * Calculate total wallet deduction for creating a card
   * @param {number} desiredBalance - how much you want ON the card
   * @returns {{ depositAmount, serviceFee, issueFee, totalFees, cardBalance }}
   */
  calculateCreateFees(desiredBalance) {
    const serviceFee = Math.ceil(desiredBalance * FEES.SERVICE_FEE_RATE * 100) / 100;
    const issueFee = FEES.ISSUE_FEE;
    const totalFees = serviceFee + issueFee;
    const depositAmount = desiredBalance + totalFees;

    return {
      depositAmount,
      serviceFee,
      issueFee,
      totalFees,
      cardBalance: desiredBalance,
    };
  }

  /**
   * Calculate total wallet deduction for top-up
   */
  calculateTopupFees(amount) {
    const serviceFee = Math.ceil(amount * FEES.TOPUP_FEE_RATE * 100) / 100;
    return {
      depositAmount: amount + serviceFee,
      serviceFee,
      cardAdded: amount,
    };
  }

  /**
   * Create card for a specific purchase
   * Adds buffer for potential price changes
   */
  async createPurchaseCard(userId, merchant, estimatedPrice, bufferPercent = 5) {
    const buffer = Math.ceil(estimatedPrice * (bufferPercent / 100));
    const cardBalance = Math.max(estimatedPrice + buffer, FEES.MIN_BALANCE);

    const fees = this.calculateCreateFees(cardBalance);
    const cardName = `${merchant}-${Math.round(estimatedPrice)}`;

    const result = await this.client.createCard(userId, cardName, cardBalance);

    return {
      ...result,
      fees,
      estimatedPrice,
      actualCardBalance: cardBalance,
    };
  }

  /**
   * Get card details for checkout — returns only what's needed
   * ⚠️ These values must NOT be logged or persisted
   */
  async getCheckoutDetails(userId, cardId) {
    const result = await this.client.getCardDetails(userId, cardId);
    const card = result.data;

    return {
      number: card.cardNumber?.replace(/\s/g, ""),
      expiry: card.expiryDate,
      expiryMonth: card.expiryDate?.split("/")[0],
      expiryYear: card.expiryDate?.split("/")[1],
      cvv: card.cvv,
      balance: card.balance,
    };
  }

  /**
   * Handle 3DS OTP verification
   */
  async get3dsCode(userId, cardId) {
    const result = await this.client.getOTP(userId, cardId);
    return {
      code: result.data.otp,
      expiresIn: result.data.expiresIn,
    };
  }

  /**
   * Check if a purchase transaction completed
   */
  async verifyPurchase(userId, cardId, expectedAmount, tolerance = 5) {
    const result = await this.client.getTransactions(userId, cardId);
    const txns = result.data || [];

    // Look for a completed transaction close to expected amount
    const match = txns.find(
      (tx) =>
        tx.status === "completed" &&
        Math.abs(tx.amount - expectedAmount) <= tolerance
    );

    return {
      found: !!match,
      transaction: match || null,
      allTransactions: txns,
    };
  }
}

export { FEES };
