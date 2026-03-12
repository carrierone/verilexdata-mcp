# @verilex/mcp-server

MCP (Model Context Protocol) server for [Verilex Data](https://verilexdata.com). Query public datasets directly from Claude Desktop, VS Code, Cursor, and other MCP-compatible AI clients.

## Datasets

| Dataset | Tools | Description |
|---------|-------|-------------|
| **NPI** | `query_npi_providers`, `lookup_npi`, `npi_stats` | 7.2M+ healthcare providers from CMS NPPES |
| **SEC** | `search_sec_filings`, `get_sec_filing`, `search_sec_companies`, `sec_stats` | SEC EDGAR filings (10-K, 10-Q, 8-K, etc.) |
| **Weather** | `get_current_weather`, `get_weather_history`, `get_weather_forecast`, `weather_stats` | NOAA weather data from 200+ US stations |
| **PACER** | `search_pacer_cases`, `get_pacer_case`, `pacer_stats` | Federal court case records |
| **OTC** | `query_otc_companies`, `lookup_otc_ticker`, `otc_stats` | OTC-traded companies with shell risk scores |

## Installation

```bash
npm install -g @verilex/mcp-server
```

Or run directly with npx:

```bash
npx @verilex/mcp-server
```

## Configuration

### Claude Desktop

Add to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "verilex": {
      "command": "npx",
      "args": ["-y", "@verilex/mcp-server"]
    }
  }
}
```

### VS Code / Cursor

Add to your MCP settings:

```json
{
  "mcp": {
    "servers": {
      "verilex": {
        "command": "npx",
        "args": ["-y", "@verilex/mcp-server"]
      }
    }
  }
}
```

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `VERILEX_API_URL` | `https://api.verilexdata.com` | Verilex API base URL |
| `VERILEX_PAYMENT_TOKEN` | _(none)_ | x402 payment token for paid endpoints |

## Tools

### NPI (Healthcare Providers)

- **`query_npi_providers`** -- Search by state, specialty, name, city, ZIP. Returns up to 100 results.
- **`lookup_npi`** -- Look up a single provider by 10-digit NPI number.
- **`npi_stats`** -- Dataset statistics (free).

### SEC (EDGAR Filings)

- **`search_sec_filings`** -- Search by CIK, form type, company name, date range.
- **`get_sec_filing`** -- Get a single filing by accession number.
- **`search_sec_companies`** -- Find companies by name to get their CIK.
- **`sec_stats`** -- Dataset statistics (free).

### Weather (NOAA)

- **`get_current_weather`** -- Current conditions by lat/lon or ZIP.
- **`get_weather_history`** -- Historical observations for a location and date range.
- **`get_weather_forecast`** -- Forecast up to 16 days.
- **`weather_stats`** -- Dataset statistics (free).

### PACER (Court Records)

- **`search_pacer_cases`** -- Search by party name, court, case type, date range.
- **`get_pacer_case`** -- Look up a single case by ID.
- **`pacer_stats`** -- Dataset statistics (free).

### OTC (OTC-Traded Companies)

- **`query_otc_companies`** -- Search by ticker, company name, financials, shell risk, filing recency.
- **`lookup_otc_ticker`** -- Look up a single company by ticker symbol.
- **`otc_stats`** -- Dataset statistics (free).

## Pricing

Free endpoints (stats, samples) require no payment. Paid query and lookup endpoints use [x402](https://www.x402.org/) micropayments (USDC on Base chain).

| Endpoint type | Price |
|---------------|-------|
| Stats / Sample | Free |
| Single query | $0.01 - $0.03 |
| Bulk export | $24.99 - $49.99 |

See [verilexdata.com/pricing](https://verilexdata.com/pricing) for full details.

## Development

```bash
git clone https://github.com/carrierone/verilexdata-mcp.git
cd verilexdata-mcp
npm install
npm run build
npm start
```

For development with auto-rebuild:

```bash
npm run dev
```

To test against a local API server:

```bash
VERILEX_API_URL=http://localhost:3000 npm start
```

## Architecture

The MCP server is a thin client that delegates all data queries to the Verilex API over HTTP. It does not connect directly to any database or storage.

```
AI Client (Claude/VS Code/Cursor)
  +-- stdio --> @verilex/mcp-server
                  +-- HTTP --> api.verilexdata.com
                                +-- DuckDB (Parquet on MinIO)
                                +-- PostgreSQL + TimescaleDB
```

## License

MIT
