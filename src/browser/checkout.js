/**
 * Checkout Automation
 * Browser-based checkout using Playwright
 * Fills card details, handles 3DS OTP, captures confirmation
 */

export class CheckoutAutomation {
  constructor(opts = {}) {
    this.headless = opts.headless !== false;
    this.screenshotDir = opts.screenshotDir || "./screenshots";
    this.timeout = opts.timeout || 60000;
    this.browser = null;
  }

  /**
   * Perform a full checkout
   * @param {object} opts
   * @param {string} opts.url - Product URL
   * @param {object} opts.card - { number, expiryMonth, expiryYear, cvv }
   * @param {string} opts.product - Product name (for logging)
   * @param {function} opts.getOtp - async function that returns OTP code
   * @returns {{ success, orderId?, screenshot?, error? }}
   */
  async performCheckout({ url, card, product, getOtp }) {
    // Lazy-load Playwright (may not be installed in all environments)
    let playwright;
    try {
      playwright = await import("playwright");
    } catch {
      return {
        success: false,
        error: "playwright_not_installed",
        message:
          "Install playwright: npm install playwright && npx playwright install chromium",
      };
    }

    let browser, page;

    try {
      browser = await playwright.chromium.launch({ headless: this.headless });
      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      });
      page = await context.newPage();

      // Step 1: Navigate to product
      console.log(`[checkout] Navigating to ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: this.timeout });

      // Step 2: Add to cart (merchant-specific logic needed)
      console.log(`[checkout] Looking for add-to-cart...`);
      const addedToCart = await this._addToCart(page);
      if (!addedToCart) {
        return { success: false, error: "add_to_cart_failed" };
      }

      // Step 3: Proceed to checkout
      console.log(`[checkout] Proceeding to checkout...`);
      await this._proceedToCheckout(page);

      // Step 4: Fill card details
      console.log(`[checkout] Filling card details...`);
      await this._fillCardDetails(page, card);

      // Step 5: Handle 3DS if needed
      const needs3ds = await this._check3DS(page);
      if (needs3ds && getOtp) {
        console.log(`[checkout] 3DS detected, getting OTP...`);
        const otp = await getOtp();
        await this._fill3DS(page, otp);
      }

      // Step 6: Capture confirmation
      console.log(`[checkout] Capturing confirmation...`);
      const confirmation = await this._captureConfirmation(page);

      return {
        success: true,
        orderId: confirmation.orderId,
        screenshot: confirmation.screenshot,
      };
    } catch (err) {
      // Take error screenshot
      if (page) {
        try {
          await page.screenshot({
            path: `${this.screenshotDir}/error-${Date.now()}.png`,
          });
        } catch {}
      }

      return {
        success: false,
        error: "checkout_error",
        message: err.message,
      };
    } finally {
      if (browser) await browser.close();
    }
  }

  // ─── Merchant-specific helpers ───
  // These are generic implementations. Override for specific merchants.

  async _addToCart(page) {
    const selectors = [
      "#add-to-cart-button", // Amazon
      '[data-testid="add-to-cart"]',
      'button:has-text("Add to Cart")',
      'button:has-text("Add to Bag")',
      'button:has-text("Buy Now")',
      ".add-to-cart",
      "#addToCart",
    ];

    for (const sel of selectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          await page.waitForTimeout(2000);
          return true;
        }
      } catch {}
    }

    return false;
  }

  async _proceedToCheckout(page) {
    const selectors = [
      "#proceed-to-checkout", // Amazon
      'a:has-text("Checkout")',
      'button:has-text("Checkout")',
      'a:has-text("Proceed to Checkout")',
      '[data-testid="checkout"]',
    ];

    for (const sel of selectors) {
      try {
        const btn = await page.$(sel);
        if (btn) {
          await btn.click();
          await page.waitForTimeout(3000);
          return;
        }
      } catch {}
    }
  }

  async _fillCardDetails(page, card) {
    // Common card input field patterns
    const fields = [
      { patterns: ['[name="cardNumber"]', '[name="card_number"]', "#card-number", '[autocomplete="cc-number"]'], value: card.number },
      { patterns: ['[name="expiryMonth"]', '[name="exp-month"]', '[autocomplete="cc-exp-month"]'], value: card.expiryMonth },
      { patterns: ['[name="expiryYear"]', '[name="exp-year"]', '[autocomplete="cc-exp-year"]'], value: card.expiryYear },
      { patterns: ['[name="cvv"]', '[name="cvc"]', '[name="securityCode"]', '[autocomplete="cc-csc"]'], value: card.cvv },
    ];

    for (const field of fields) {
      for (const sel of field.patterns) {
        try {
          const input = await page.$(sel);
          if (input) {
            await input.fill(field.value);
            break;
          }
        } catch {}
      }
    }
  }

  async _check3DS(page) {
    await page.waitForTimeout(3000);
    const otp = await page.$('input[name="otp"], input[name="code"], #otp-input');
    return !!otp;
  }

  async _fill3DS(page, otp) {
    const selectors = ['input[name="otp"]', 'input[name="code"]', "#otp-input", '[autocomplete="one-time-code"]'];
    for (const sel of selectors) {
      try {
        const input = await page.$(sel);
        if (input) {
          await input.fill(otp);
          // Try to submit
          const submit = await page.$('button[type="submit"], button:has-text("Verify"), button:has-text("Submit")');
          if (submit) await submit.click();
          await page.waitForTimeout(3000);
          return;
        }
      } catch {}
    }
  }

  async _captureConfirmation(page) {
    await page.waitForTimeout(5000);

    const screenshotPath = `${this.screenshotDir}/confirmation-${Date.now()}.png`;
    await page.screenshot({ path: screenshotPath, fullPage: false });

    // Try to extract order ID
    const text = await page.textContent("body");
    const orderMatch = text?.match(
      /(?:order|confirmation|заказ)\s*(?:#|number|номер)?\s*[:.]?\s*([A-Z0-9-]{5,})/i
    );

    return {
      orderId: orderMatch ? orderMatch[1] : null,
      screenshot: screenshotPath,
    };
  }
}
