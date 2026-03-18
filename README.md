# @verilex/mcp-server

[![Smithery](https://smithery.ai/badge/carrierone/verilexdata-mcp)](https://smithery.ai/servers/carrierone/verilexdata-mcp)
[![Signal402](https://img.shields.io/badge/Signal402-listed-blue)](https://signal402.com)
[![x402](https://img.shields.io/badge/x402-USDC%20payments-green)](https://verilexdata.com/docs/x402)
[![Datasets](https://img.shields.io/badge/datasets-20-orange)](https://verilexdata.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

MCP server for [Verilex Data](https://verilexdata.com) — 20 structured datasets accessible from AI agents via the [Model Context Protocol](https://modelcontextprotocol.io/).

[![Verilex Data MCP server](https://glama.ai/mcp/servers/carrierone/verilexdata-mcp/badges/card.svg)](https://glama.ai/mcp/servers/carrierone/verilexdata-mcp)

## Install

Add to your MCP client config (Claude Desktop, VS Code, Cursor, etc.):

```json
{
  "mcpServers": {
    "verilex": {
      "command": "npx",
      "args": ["-y", "github:carrierone/verilexdata-mcp"]
    }
  }
}
```

## Datasets

### Government & Business
- **NPI Providers** — 9M+ US healthcare providers
- **SEC Filings** — EDGAR filings, updated every 15 min
- **Weather Data** — NOAA GHCN-Daily observations
- **PACER Courts** — Federal court case metadata
- **OTC Companies** — Shell risk scoring & analytics
- **Trademarks** — USPTO registrations (coming soon)
- **Patents** — 1.6M+ US patent grants
- **Gov Contracts** — Federal award intelligence
- **Company Intelligence** — Cross-dataset profiles & signals
- **Economic Indicators** — FRED data, releases & surprises

### Crypto Intelligence
- **DeFi Liquidation Signals** — Multi-chain risk monitoring
- **OFAC Sanctions** — Wallet & name screening
- **Whale Tracking** — High-balance wallet monitoring
- **Address Labels** — Risk scores & wallet attribution
- **Token Holders** — Holder rankings & concentration
- **DEX Trades** — Swap-level flow analytics

### Prediction Markets
- **PM Smart Money** — Top Polymarket wallet signals
- **PM Arbitrage** — AI-powered cross-platform spreads
- **PM Resolution** — Resolution source tracking
- **PM Microstructure** — Order book depth & liquidity

## Change Feeds

All high-frequency datasets support `?since=ISO8601` change feed queries, returning only records updated after the given timestamp. Your agent can poll efficiently without re-fetching unchanged data.

## Payment

Verilex uses the [x402 protocol](https://x402.org) for pay-per-query access with USDC on Base chain. Free endpoints (stats, samples) work without payment. Paid endpoints return HTTP 402 with payment requirements.

## Data Freshness

Every paid response includes headers:
- `X-Data-Stale: true|false`
- `X-Data-Last-Updated: ISO 8601 timestamp`
- `X-Data-Age-Seconds: number`

## Environment Variables

| Variable | Description |
|----------|-------------|
| `VERILEX_API_URL` | API base URL (default: `https://api.verilexdata.com`) |
| `VERILEX_PAYMENT_TOKEN` | x402 payment token for paid endpoints |

## Links

- Website: https://verilexdata.com
- API Docs: https://verilexdata.com/docs/
- Status: https://verilexdata.com/status/
- Support: https://support.verilexdata.com

## License

MIT — © 2026 Optimal Reality LLC