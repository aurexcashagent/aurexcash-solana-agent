# AurexCash Solana AI Agent

Open-source AI agent on Solana with **virtual card payments** powered by [Aurex](https://aurex.cash).

The agent can **buy things for you**: you send a message → agent finds the product → you approve → agent creates a card, fills checkout, handles 3DS → done.

## Architecture

```
User (Telegram / Web)
  ↓ "Buy AirPods on Amazon, up to $300"
AI Agent (NLP + intent parsing)
  ↓ parses product, merchant, budget
Approval Engine
  ↓ "AirPods $279 on Amazon. Approve?" → [✅] [❌]
Aurex API (aurex.cash/api/dashboard)
  ├─ POST /cards          → create virtual card ($300)
  ├─ GET  /cards/:id      → get PAN, CVV, expiry
  └─ GET  /otp            → get 3DS code
Browser Automation (Playwright)
  ↓ fills checkout form with card details
Merchant (Amazon, etc.)
  ↓ processes payment
Agent → User: "Order #123-456 confirmed ✅"
```

## Features

- **MCP endpoint** with Solana wallet-signed responses
- **Aurex virtual cards** — create, top-up, get details via API
- **Human-in-the-loop** — every purchase requires user approval
- **Browser checkout** — automated form filling with Playwright
- **3DS handling** — automatic OTP retrieval from Aurex API
- **On-chain registration** — agent registered in Solana Agent Registry

## Agent Info

| Field | Value |
|-------|-------|
| Agent ID | `FSQcBRee4uviHS61VRViavoqVE9zZ14DrSNQPdiRt4ae` |
| Owner | `3mcdWL1sffpuHnmLiXfoADdTsNPGgKEBXY2KeHXySoqT` |

## Repository Structure

```
aurexcash-solana-agent/
├── server.js                     # Main server (MCP + purchase endpoints)
├── src/
│   ├── aurex/
│   │   ├── client.js             # Aurex API client
│   │   ├── card-manager.js       # Card operations + fee calculations
│   │   └── index.js
│   ├── agent/
│   │   └── purchase-agent.js     # Main orchestrator
│   ├── approval/
│   │   └── engine.js             # Human approval flow
│   ├── browser/
│   │   └── checkout.js           # Playwright checkout automation
│   └── tools/
│       └── aurex-tools.js        # MCP tool definitions
├── scripts/                      # On-chain registration scripts
├── tests/
│   └── test-aurex-client.js
├── .env.example
├── package.json
└── README.md
```

## Quick Start

```bash
git clone https://github.com/aurexcashagent/aurexcash-solana-agent
cd aurexcash-solana-agent
npm install
cp .env.example .env
node server.js
```

| Variable | Description |
|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Solana wallet secret key (JSON array) |
| `AUREX_API_KEY` | API key from Aurex dashboard |
| `AUREX_USER_ID` | Your Aurex user ID |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/mcp` | MCP endpoint (auto-detects purchase intent) |
| POST | `/purchase` | Direct purchase API |
| POST | `/approve/:id` | Approve pending purchase |
| POST | `/reject/:id` | Reject pending purchase |
| GET | `/cards` | List virtual cards |
| GET | `/balance` | Wallet balance |

## Usage

```bash
# Natural language via MCP
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Buy AirPods Pro on Amazon up to $300"}'

# Direct purchase API
curl -X POST http://localhost:8787/purchase \
  -H "Content-Type: application/json" \
  -d '{"product":"AirPods Pro","merchant":"amazon.com","maxBudget":300}'

# Approve
curl -X POST http://localhost:8787/approve/REQUEST_ID
```

## Aurex API Integration

| Endpoint | Usage |
|----------|-------|
| `POST /users/{id}/cards` | Create card per purchase |
| `GET /users/{id}/cards/{cardId}` | Get PAN/CVV/expiry |
| `POST /cards/{cardId}/topup` | Top up card |
| `GET /users/{id}/otp?cardId=` | Get 3DS OTP |
| `GET /cards/{cardId}/transactions` | Verify purchase |

**Fees**: $19 issue + 5% service | Top-up: 3% | Min $25 / Max $100k

## Security

- Every spend requires explicit user approval
- New card per transaction — isolates risk
- Card details in memory only, never persisted
- Auto-decline after 5 min timeout
- MCP responses signed with Solana wallet

## Roadmap

- [x] MCP endpoint with signed responses
- [x] Aurex card API integration
- [x] Human approval flow
- [x] Browser checkout automation
- [ ] Telegram bot interface
- [ ] Multi-merchant checkout profiles
- [ ] On-chain skill registry

## License

MIT# AurexCash Solana AI Agent

Open-source AI agent on Solana with **virtual card payments** powered by [Aurex](https://aurex.cash).

The agent can **buy things for you**: you send a message → agent finds the product → you approve → agent creates a card, fills checkout, handles 3DS → done.

## Architecture

```
User (Telegram / Web)
  ↓ "Buy AirPods on Amazon, up to $300"
AI Agent (NLP + intent parsing)
  ↓ parses product, merchant, budget
Approval Engine
  ↓ "AirPods $279 on Amazon. Approve?" → [✅] [❌]
Aurex API (aurex.cash/api/dashboard)
  ├─ POST /cards          → create virtual card ($300)
  ├─ GET  /cards/:id      → get PAN, CVV, expiry
  └─ GET  /otp            → get 3DS code
Browser Automation (Playwright)
  ↓ fills checkout form with card details
Merchant (Amazon, etc.)
  ↓ processes payment
Agent → User: "Order #123-456 confirmed ✅"
```

## Features

- **MCP endpoint** with Solana wallet-signed responses
- **Aurex virtual cards** — create, top-up, get details via API
- **Human-in-the-loop** — every purchase requires user approval
- **Browser checkout** — automated form filling with Playwright
- **3DS handling** — automatic OTP retrieval from Aurex API
- **On-chain registration** — agent registered in Solana Agent Registry

## Agent Info

| Field | Value |
|-------|-------|
| Agent ID | `FSQcBRee4uviHS61VRViavoqVE9zZ14DrSNQPdiRt4ae` |
| Owner | `3mcdWL1sffpuHnmLiXfoADdTsNPGgKEBXY2KeHXySoqT` |

## Repository Structure

```
aurexcash-solana-agent/
├── server.js                     # Main server (MCP + purchase endpoints)
├── src/
│   ├── aurex/
│   │   ├── client.js             # Aurex API client
│   │   ├── card-manager.js       # Card operations + fee calculations
│   │   └── index.js
│   ├── agent/
│   │   └── purchase-agent.js     # Main orchestrator
│   ├── approval/
│   │   └── engine.js             # Human approval flow
│   ├── browser/
│   │   └── checkout.js           # Playwright checkout automation
│   └── tools/
│       └── aurex-tools.js        # MCP tool definitions
├── scripts/                      # On-chain registration scripts
├── tests/
│   └── test-aurex-client.js
├── .env.example
├── package.json
└── README.md
```

## Quick Start

```bash
git clone https://github.com/aurexcashagent/aurexcash-solana-agent
cd aurexcash-solana-agent
npm install
cp .env.example .env
node server.js
```

| Variable | Description |
|----------|-------------|
| `SOLANA_PRIVATE_KEY` | Solana wallet secret key (JSON array) |
| `AUREX_API_KEY` | API key from Aurex dashboard |
| `AUREX_USER_ID` | Your Aurex user ID |

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/mcp` | MCP endpoint (auto-detects purchase intent) |
| POST | `/purchase` | Direct purchase API |
| POST | `/approve/:id` | Approve pending purchase |
| POST | `/reject/:id` | Reject pending purchase |
| GET | `/cards` | List virtual cards |
| GET | `/balance` | Wallet balance |

## Usage

```bash
# Natural language via MCP
curl -X POST http://localhost:8787/mcp \
  -H "Content-Type: application/json" \
  -d '{"prompt":"Buy AirPods Pro on Amazon up to $300"}'

# Direct purchase API
curl -X POST http://localhost:8787/purchase \
  -H "Content-Type: application/json" \
  -d '{"product":"AirPods Pro","merchant":"amazon.com","maxBudget":300}'

# Approve
curl -X POST http://localhost:8787/approve/REQUEST_ID
```

## Aurex API Integration

| Endpoint | Usage |
|----------|-------|
| `POST /users/{id}/cards` | Create card per purchase |
| `GET /users/{id}/cards/{cardId}` | Get PAN/CVV/expiry |
| `POST /cards/{cardId}/topup` | Top up card |
| `GET /users/{id}/otp?cardId=` | Get 3DS OTP |
| `GET /cards/{cardId}/transactions` | Verify purchase |

**Fees**: $19 issue + 5% service | Top-up: 3% | Min $25 / Max $100k

## Security

- Every spend requires explicit user approval
- New card per transaction — isolates risk
- Card details in memory only, never persisted
- Auto-decline after 5 min timeout
- MCP responses signed with Solana wallet

## Roadmap

- [x] MCP endpoint with signed responses
- [x] Aurex card API integration
- [x] Human approval flow
- [x] Browser checkout automation
- [ ] Telegram bot interface
- [ ] Multi-merchant checkout profiles
- [ ] On-chain skill registry

## License

MIT
