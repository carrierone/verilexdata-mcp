// Polymarket Intelligence tools
//
// Tools:
//   pm_whales     — Top Polymarket wallets by PnL/volume ($0.005)
//   pm_signals    — Smart money flow signals ($0.02)
//   pm_movements  — Position changes by whale wallets ($0.01)
//   pm_changes    — Change feed for Polymarket data updates ($0.01)
//   pm_stats      — Get Polymarket dataset statistics (free)
//
// Data source: Polymarket on-chain trading data

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface PmQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface PmStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerPmTools(server: McpServer): void {
  // ── PM whale wallets ──────────────────────────────────────────────────

  server.registerTool(
    "pm_whales",
    {
      title: "Polymarket Whale Wallets",
      description:
        "Get top Polymarket wallets ranked by PnL, volume, or position size. " +
        "Shows wallet address, total PnL, win rate, and active markets. " +
        "Cost: $0.005 per query. Source: Polymarket on-chain data.",
      inputSchema: {
        sort: z
          .enum(["pnl", "volume", "positions"])
          .optional()
          .describe("Sort order (default: pnl)"),
        market_id: z
          .string()
          .optional()
          .describe("Filter by specific market ID"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ sort, market_id, limit }) => {
      const res = await apiGet<PmQueryResponse>("/api/v1/pm/whales", {
        sort: sort ?? "pnl",
        market_id,
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
      const summary = `${warn}Found ${count} Polymarket whale(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Smart money signals ───────────────────────────────────────────────

  server.registerTool(
    "pm_signals",
    {
      title: "Polymarket Smart Money Signals",
      description:
        "Get smart money flow signals showing where top traders are positioning. " +
        "Aggregates whale wallet activity into directional signals per market. " +
        "Cost: $0.02 per query. Source: Polymarket on-chain data.",
      inputSchema: {
        market_id: z
          .string()
          .optional()
          .describe("Filter by market ID"),
        min_confidence: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Minimum signal confidence (0-1, default 0.5)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ market_id, min_confidence, limit }) => {
      const res = await apiGet<PmQueryResponse>("/api/v1/pm/signals", {
        market_id,
        min_confidence: min_confidence ?? 0.5,
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
      const summary = `${warn}Found ${count} smart money signal(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Position movements ────────────────────────────────────────────────

  server.registerTool(
    "pm_movements",
    {
      title: "Polymarket Position Movements",
      description:
        "Get recent position changes by whale wallets on Polymarket. Shows buys, sells, " +
        "and position size changes across prediction markets. " +
        "Cost: $0.01 per query. Source: Polymarket on-chain data.",
      inputSchema: {
        market_id: z
          .string()
          .optional()
          .describe("Filter by market ID"),
        wallet: z
          .string()
          .optional()
          .describe("Filter by wallet address"),
        hours: z
          .number()
          .int()
          .min(1)
          .max(168)
          .optional()
          .describe("Lookback period in hours (default 24)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ market_id, wallet, hours, limit }) => {
      const res = await apiGet<PmQueryResponse>("/api/v1/pm/movements", {
        market_id,
        wallet,
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
      const summary = `${warn}Found ${count} position movement(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Change feed ───────────────────────────────────────────────────────

  server.registerTool(
    "pm_changes",
    {
      title: "Polymarket Changes",
      description:
        "Get recent changes to Polymarket data since a given timestamp. " +
        "Cost: $0.01 per query. Source: Polymarket on-chain data.",
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
      const res = await apiGet<PmQueryResponse>("/api/v1/pm/changes", {
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
      const summary = `${warn}Found ${count} Polymarket change(s) since ${since}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "pm_stats",
    {
      title: "Polymarket Dataset Statistics",
      description:
        "Get statistics about the Polymarket dataset: total markets, wallets tracked, " +
        "volume, and last updated timestamp. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<PmStatsResponse>("/api/v1/pm/stats");

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
