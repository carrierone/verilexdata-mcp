// Whale Wallet Intelligence tools
//
// Tools:
//   query_whales    — List whale wallets by chain, balance, activity ($0.014)
//   lookup_whale    — Get detail for a single whale wallet ($0.02)
//   whale_movements — Large balance changes across whale wallets ($0.04)
//   whale_changes   — Change feed for whale wallet updates ($0.01)
//   whale_stats     — Get whale dataset statistics (free)
//
// Data source: On-chain analytics across Ethereum, Arbitrum, Base, Polygon, BSC

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface WhaleQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface WhaleStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerWhaleTools(server: McpServer): void {
  // ── Query whale wallets ───────────────────────────────────────────────

  server.registerTool(
    "query_whales",
    {
      title: "Query Whale Wallets",
      description:
        "List whale wallets filtered by blockchain, minimum balance, token, and activity. " +
        "Returns wallet address, balance, token holdings, and last activity timestamp. " +
        "Cost: $0.014 per query. Source: On-chain analytics, updated hourly.",
      inputSchema: {
        chain: z
          .enum(["ethereum", "arbitrum", "polygon", "base", "bsc"])
          .optional()
          .describe("Filter by blockchain network"),
        min_balance_usd: z
          .number()
          .optional()
          .describe("Minimum wallet balance in USD"),
        token: z
          .string()
          .optional()
          .describe("Filter by token symbol (e.g. WETH, USDC)"),
        sort: z
          .enum(["balance", "activity", "pnl"])
          .optional()
          .describe("Sort order (default: balance)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ chain, min_balance_usd, token, sort, limit }) => {
      const res = await apiGet<WhaleQueryResponse>("/api/v1/whales", {
        chain,
        min_balance_usd,
        token,
        sort,
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
      const summary = `${warn}Found ${count} whale wallet(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Lookup single whale ───────────────────────────────────────────────

  server.registerTool(
    "lookup_whale",
    {
      title: "Lookup Whale Wallet",
      description:
        "Get full detail for a single whale wallet by address. Returns balance history, " +
        "token holdings, recent transactions, and PnL metrics. " +
        "Cost: $0.02 per query. Source: On-chain analytics.",
      inputSchema: {
        address: z
          .string()
          .describe("Wallet address (e.g. 0x...)"),
      },
    },
    async ({ address }) => {
      const res = await apiGet<{ dataset: string; data: Record<string, unknown> }>(
        `/api/v1/whales/${encodeURIComponent(address)}`,
      );

      if (!res.ok) {
        const msg =
          res.status === 404
            ? `Whale wallet ${address} not found.`
            : `API error (${res.status}): ${JSON.stringify(res.data)}`;
        return {
          content: [{ type: "text" as const, text: msg }],
          isError: res.status !== 404,
        };
      }

      const warn = stalenessWarning(res);
      return {
        content: [
          { type: "text" as const, text: `${warn}${JSON.stringify(res.data.data, null, 2)}` },
        ],
      };
    },
  );

  // ── Whale movements ───────────────────────────────────────────────────

  server.registerTool(
    "whale_movements",
    {
      title: "Whale Movements",
      description:
        "Get large balance changes across whale wallets. Shows significant inflows, " +
        "outflows, and transfers that may signal market moves. " +
        "Cost: $0.04 per query. Source: On-chain analytics.",
      inputSchema: {
        chain: z
          .enum(["ethereum", "arbitrum", "polygon", "base", "bsc"])
          .optional()
          .describe("Filter by blockchain network"),
        min_usd: z
          .number()
          .optional()
          .describe("Minimum movement size in USD"),
        token: z
          .string()
          .optional()
          .describe("Filter by token symbol"),
        hours: z
          .number()
          .int()
          .min(1)
          .max(168)
          .optional()
          .describe("Lookback period in hours (default 24, max 168)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ chain, min_usd, token, hours, limit }) => {
      const res = await apiGet<WhaleQueryResponse>("/api/v1/whales/movements", {
        chain,
        min_usd,
        token,
        hours: hours ?? 24,
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
      const summary = `${warn}Found ${count} whale movement(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Change feed ───────────────────────────────────────────────────────

  server.registerTool(
    "whale_changes",
    {
      title: "Whale Changes",
      description:
        "Get recent changes to whale wallet data since a given timestamp. " +
        "Cost: $0.01 per query. Source: On-chain analytics.",
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
      const res = await apiGet<WhaleQueryResponse>("/api/v1/whales/changes", {
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
      const summary = `${warn}Found ${count} whale change(s) since ${since}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "whale_stats",
    {
      title: "Whale Dataset Statistics",
      description:
        "Get statistics about the whale wallet dataset: total wallets tracked, " +
        "chains covered, last updated timestamp. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<WhaleStatsResponse>("/api/v1/whales/stats");

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
