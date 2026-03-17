// Crypto Intelligence tools
//
// Tools:
//   query_protocol_risk   — Protocol-level liquidation risk monitor
//   query_network_stress  — Network-level market stress indices
//   query_cohort_critical — Near-liquidation cohort signals by health tier
//   crypto_stats          — Get crypto intelligence dataset statistics
//
// Data source: Liquidationbot telemetry across Aave V3, Compound V3, Venus,
// Radiant, Morpho Blue, LlamaLend, ZeroLend, MakerDAO on Ethereum, Arbitrum,
// Polygon, Base, BSC, Avalanche.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "../client.js";

interface CryptoQueryResponse {
  dataset: string;
  product: string;
  window: string;
  count: number;
  data: Record<string, unknown>[];
}

interface CryptoStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  networks: string[];
  products: string[];
  stats: Record<string, unknown>;
}

export function registerCryptoTools(server: McpServer): void {
  // ── Protocol Risk Monitor ─────────────────────────────────────────────

  server.registerTool(
    "query_protocol_risk",
    {
      title: "Protocol Risk Monitor",
      description:
        "Get liquidation pressure and stress scores for DeFi lending protocols. " +
        "Shows critical/high-risk account counts, health factor deterioration rate, " +
        "and total debt at risk per protocol. Covers Aave V3, Compound V3, Venus, " +
        "Radiant, Morpho Blue, LlamaLend, ZeroLend, MakerDAO across 6 chains. " +
        "Source: Liquidationbot real-time telemetry.",
      inputSchema: {
        window: z
          .enum(["5m", "1h", "24h", "7d"])
          .optional()
          .describe("Time window for aggregation (default: 1h)"),
        network: z
          .enum(["ethereum", "arbitrum", "polygon", "base", "bsc", "avalanche"])
          .optional()
          .describe("Filter by blockchain network"),
        protocol: z
          .enum([
            "aave_v3",
            "compound_v3",
            "venus",
            "radiant",
            "morpho_blue",
            "llamalend",
            "zerolend",
            "makerdao",
          ])
          .optional()
          .describe("Filter by lending protocol"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 100)"),
      },
    },
    async ({ window, network, protocol, limit }) => {
      const res = await apiGet<CryptoQueryResponse>(
        "/api/v1/crypto/risk/protocols",
        {
          window: window ?? "1h",
          network,
          protocol,
          limit: limit ?? 100,
        },
      );

      if (!res.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `API error (${res.status}): ${JSON.stringify(res.data)}`,
            },
          ],
          isError: true,
        };
      }

      const { count, data } = res.data;
      const summary = `Found ${count} protocol risk record(s) for window=${window ?? "1h"}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Market Stress Indices ─────────────────────────────────────────────

  server.registerTool(
    "query_network_stress",
    {
      title: "Market Stress Indices",
      description:
        "Get network-level market stress indices combining liquidation intensity, " +
        "gas costs, and execution failure rates. Provides a 0-100 composite stress " +
        "score per blockchain. Useful for macro risk assessment across DeFi lending. " +
        "Source: Liquidationbot real-time telemetry.",
      inputSchema: {
        window: z
          .enum(["1h", "24h", "7d"])
          .optional()
          .describe("Time window for aggregation (default: 1h)"),
        network: z
          .enum(["ethereum", "arbitrum", "polygon", "base", "bsc", "avalanche"])
          .optional()
          .describe("Filter by blockchain network"),
      },
    },
    async ({ window, network }) => {
      const res = await apiGet<CryptoQueryResponse>(
        "/api/v1/crypto/risk/networks",
        {
          window: window ?? "1h",
          network,
        },
      );

      if (!res.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `API error (${res.status}): ${JSON.stringify(res.data)}`,
            },
          ],
          isError: true,
        };
      }

      const { count, data } = res.data;
      const summary = `Found ${count} network stress record(s) for window=${window ?? "1h"}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Near-Liquidation Cohort Signals ───────────────────────────────────

  server.registerTool(
    "query_cohort_critical",
    {
      title: "Near-Liquidation Cohort Signals",
      description:
        "Get near-liquidation cohort signals showing account populations by health " +
        "factor tier (critical/high/moderate), entry/exit rates, and deterioration " +
        "velocity. Early warning on borrowers entering critical health factor tiers. " +
        "Source: Liquidationbot real-time telemetry.",
      inputSchema: {
        window: z
          .enum(["5m", "1h", "24h"])
          .optional()
          .describe("Time window for aggregation (default: 1h)"),
        network: z
          .enum(["ethereum", "arbitrum", "polygon", "base", "bsc", "avalanche"])
          .optional()
          .describe("Filter by blockchain network"),
        protocol: z
          .enum([
            "aave_v3",
            "compound_v3",
            "venus",
            "radiant",
            "morpho_blue",
            "llamalend",
            "zerolend",
            "makerdao",
          ])
          .optional()
          .describe("Filter by lending protocol"),
      },
    },
    async ({ window, network, protocol }) => {
      const res = await apiGet<CryptoQueryResponse>(
        "/api/v1/crypto/cohorts/critical",
        {
          window: window ?? "1h",
          network,
          protocol,
        },
      );

      if (!res.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `API error (${res.status}): ${JSON.stringify(res.data)}`,
            },
          ],
          isError: true,
        };
      }

      const { count, data } = res.data;
      const summary = `Found ${count} cohort record(s) for window=${window ?? "1h"}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ────────────────────────────────────────────────────

  server.registerTool(
    "crypto_stats",
    {
      title: "Crypto Intelligence Statistics",
      description:
        "Get statistics about the crypto intelligence dataset: total signals, " +
        "total executions, networks and protocols active, date range. Free endpoint. " +
        "Source: Liquidationbot multi-chain telemetry.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<CryptoStatsResponse>("/api/v1/crypto/stats");

      if (!res.ok) {
        return {
          content: [
            {
              type: "text" as const,
              text: `API error (${res.status}): ${JSON.stringify(res.data)}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(res.data, null, 2) },
        ],
      };
    },
  );
}
