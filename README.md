# Aurex Cash Agent

AI agent that pays with virtual cards via [Aurex](https://aurex.cash).

Install the agent, connect to Claude or Cursor, and manage virtual Visa/Mastercard cards through natural language.

## Quick Start

```bash
npm install -g @aurexcash/agent
aurex-agent setup
aurex-agent setup-mcp
```

Restart Claude Desktop. Then:

> "Check my Aurex balance"
> "Create a $100 card called Amazon-March"
> "Show my cards"
> "Get card details for card_abc123"

## How It Works

```
You: "Create a $50 card for online shopping"
        ↓
Claude calls aurex_create_card
        ↓
Aurex API creates virtual Visa card
        ↓
Claude: "Card created. Balance: $50. Use aurex_card_details to get the number."
        ↓
You: "Get the card details"
        ↓
Claude calls aurex_card_details
        ↓
Claude: "Number: 4111...1234, CVV: 123, Exp: 12/28"
```

## Available Tools

| Tool | Description |
|------|-------------|
| `aurex_balance` | Check wallet balance |
| `aurex_create_card` | Create a new virtual card ($25 min) |
| `aurex_list_cards` | List all cards with balances |
| `aurex_card_details` | Get PAN, CVV, expiry for checkout |
| `aurex_topup_card` | Add funds to existing card |
| `aurex_card_transactions` | View transaction history |
| `aurex_get_otp` | Get 3DS verification code |
| `aurex_calculate_fees` | Preview fees before creating |

## Setup

### 1. Get Aurex Credentials

Sign up at [aurex.cash](https://aurex.cash) and get your API key and User ID from the dashboard.

### 2. Configure

```bash
aurex-agent setup
```

Enter your API key and User ID. Stored locally at `~/.aurex/config.json`.

### 3. Connect to Claude Desktop

```bash
aurex-agent setup-mcp
```

This adds Aurex to your Claude Desktop config. Restart Claude to activate.

### Manual MCP Config

Add to your Claude Desktop config (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "aurex-cash": {
      "command": "npx",
      "args": ["-y", "@aurexcash/agent"],
      "env": {
        "AUREX_API_KEY": "your_api_key",
        "AUREX_USER_ID": "your_user_id"
      }
    }
  }
}
```

### Cursor Integration

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "aurex-cash": {
      "command": "npx",
      "args": ["-y", "@aurexcash/agent"],
      "env": {
        "AUREX_API_KEY": "your_api_key",
        "AUREX_USER_ID": "your_user_id"
      }
    }
  }
}
```

## Fees

| Action | Fee |
|--------|-----|
| Card creation | $19 + 5% of balance |
| Top-up | 3% of amount |
| Min card balance | $25 |
| Max card balance | $100,000 |

## Security

- API keys stored locally at `~/.aurex/config.json`
- Card details only retrieved on explicit request
- No data sent to third parties
- All communication with Aurex API over HTTPS

## Requirements

- Node.js 18+
- Aurex account with API access
- Claude Desktop, Cursor, or any MCP-compatible client

## License

MIT
