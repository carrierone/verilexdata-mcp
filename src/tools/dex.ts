// DEX Trading Intelligence tools
//
// Tools:
//   query_dex_trades  — Recent swaps on decentralized exchanges ($0.003)
//   query_dex_pairs   — Available trading pairs ($0.001)
//   query_dex_volume  — Volume statistics by pair/chain ($0.005)
//   dex_changes       — Change feed for DEX data updates ($0.003)
//   dex_stats         — Get DEX dataset statistics (free)
//
// Data source: On-chain DEX trade data across Uniswap, Sushiswap, Curve, etc.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface DexQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface DexStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerDexTools(server: McpServer): void {
  // ── Query DEX trades ──────────────────────────────────────────────────

  server.registerTool(
    "query_dex_trades",
    {
      title: "Query DEX Trades",
      description:
        "Get recent swap transactions on decentralized exchanges. Filter by trading pair, " +
        "chain, minimum size, and DEX protocol. Returns trade details including price, " +
        "size, slippage, and maker/taker addresses. " +
        "Cost: $0.003 per query. Source: On-chain DEX analytics.",
      inputSchema: {
        pair: z
          .string()
          .optional()
          .describe("Trading pair (e.g. WETH-USDC)"),
        chain: z
          .enum(["ethereum", "arbitrum", "polygon", "base", "bsc"])
          .optional()
          .describe("Filter by blockchain network"),
        dex: z
          .string()
          .optional()
          .describe("Filter by DEX protocol (e.g. uniswap_v3, sushiswap)"),
        min_usd: z
          .number()
          .optional()
          .describe("Minimum trade size in USD"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ pair, chain, dex, min_usd, limit }) => {
      const res = await apiGet<DexQueryResponse>("/api/v1/dex/trades", {
        pair,
        chain,
        dex,
        min_usd,
        limit: limit ?? 25,
      });

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
      const warn = stalenessWarning(res);
      const summary = `${warn}Found ${count} DEX trade(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Query DEX pairs ───────────────────────────────────────────────────

  server.registerTool(
    "query_dex_pairs",
    {
      title: "Query DEX Pairs",
      description:
        "List available trading pairs on decentralized exchanges. Filter by chain, " +
        "base token, or quote token. Returns pair details with liquidity and volume. " +
        "Cost: $0.001 per query. Source: On-chain DEX analytics.",
      inputSchema: {
        chain: z
          .enum(["ethereum", "arbitrum", "polygon", "base", "bsc"])
          .optional()
          .describe("Filter by blockchain network"),
        base_token: z
          .string()
          .optional()
          .describe("Filter by base token symbol (e.g. WETH)"),
        quote_token: z
          .string()
          .optional()
          .describe("Filter by quote token symbol (e.g. USDC)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ chain, base_token, quote_token, limit }) => {
      const res = await apiGet<DexQueryResponse>("/api/v1/dex/pairs", {
        chain,
        base_token,
        quote_token,
        limit: limit ?? 25,
      });

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
      const warn = stalenessWarning(res);
      const summary = `${warn}Found ${count} DEX pair(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Query DEX volume ──────────────────────────────────────────────────

  server.registerTool(
    "query_dex_volume",
    {
      title: "Query DEX Volume",
      description:
        "Get volume statistics for DEX trading pairs. Shows 24h volume, 7d volume, " +
        "trade count, and volume trends by pair and chain. " +
        "Cost: $0.005 per query. Source: On-chain DEX analytics.",
      inputSchema: {
        pair: z
          .string()
          .optional()
          .describe("Trading pair (e.g. WETH-USDC)"),
        chain: z
          .enum(["ethereum", "arbitrum", "polygon", "base", "bsc"])
          .optional()
          .describe("Filter by blockchain network"),
        period: z
          .enum(["24h", "7d", "30d"])
          .optional()
          .describe("Volume aggregation period (default: 24h)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ pair, chain, period, limit }) => {
      const res = await apiGet<DexQueryResponse>("/api/v1/dex/volume", {
        pair,
        chain,
        period: period ?? "24h",
        limit: limit ?? 25,
      });

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
      const warn = stalenessWarning(res);
      const summary = `${warn}Found ${count} DEX volume record(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Change feed ───────────────────────────────────────────────────────

  server.registerTool(
    "dex_changes",
    {
      title: "DEX Changes",
      description:
        "Get recent changes to DEX trade data since a given timestamp. " +
        "Cost: $0.003 per query. Source: On-chain DEX analytics.",
      inputSchema: {
        since: z
          .string()
          .describe("ISO 8601 timestamp to get changes since (e.g. 2026-03-01T00:00:00Z)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 50)"),
      },
    },
    async ({ since, limit }) => {
      const res = await apiGet<DexQueryResponse>("/api/v1/dex/changes", {
        since,
        limit: limit ?? 50,
      });

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
      const warn = stalenessWarning(res);
      const summary = `${warn}Found ${count} DEX change(s) since ${since}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "dex_stats",
    {
      title: "DEX Dataset Statistics",
      description:
        "Get statistics about the DEX trading dataset: total trades, pairs tracked, " +
        "chains and protocols covered, last updated. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<DexStatsResponse>("/api/v1/dex/stats");

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
