// Polymarket Microstructure tools
//
// Tools:
//   pm_micro_depth   — Market depth and spread analysis ($0.003)
//   pm_micro_thin    — Thin order book detection ($0.005)
//   pm_micro_changes — Change feed for microstructure data updates ($0.003)
//   pm_micro_stats   — Get microstructure dataset statistics (free)
//
// Data source: Polymarket order book microstructure analysis

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface PmMicroQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface PmMicroStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerPmMicroTools(server: McpServer): void {
  // ── Market depth ──────────────────────────────────────────────────────

  server.registerTool(
    "pm_micro_depth",
    {
      title: "Polymarket Market Depth",
      description:
        "Get market depth and bid-ask spread analysis for Polymarket markets. Shows " +
        "order book depth, spread width, and liquidity at various price levels. " +
        "Cost: $0.003 per query. Source: Polymarket order book analysis.",
      inputSchema: {
        market_id: z
          .string()
          .optional()
          .describe("Market ID to analyze"),
        min_liquidity: z
          .number()
          .optional()
          .describe("Minimum liquidity in USD"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ market_id, min_liquidity, limit }) => {
      const res = await apiGet<PmMicroQueryResponse>("/api/v1/pm/micro/depth", {
        market_id,
        min_liquidity,
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
      const summary = `${warn}Found ${count} market depth record(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Thin book detection ───────────────────────────────────────────────

  server.registerTool(
    "pm_micro_thin",
    {
      title: "Polymarket Thin Book Detection",
      description:
        "Detect markets with thin order books that may be susceptible to slippage or " +
        "manipulation. Shows markets below a liquidity threshold with spread metrics. " +
        "Cost: $0.005 per query. Source: Polymarket order book analysis.",
      inputSchema: {
        threshold: z
          .number()
          .optional()
          .describe("Liquidity threshold in USD (markets below this are flagged)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ threshold, limit }) => {
      const res = await apiGet<PmMicroQueryResponse>("/api/v1/pm/micro/thin", {
        threshold: threshold ?? 50,
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
      const summary = `${warn}Found ${count} thin book market(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Change feed ───────────────────────────────────────────────────────

  server.registerTool(
    "pm_micro_changes",
    {
      title: "Polymarket Microstructure Changes",
      description:
        "Get recent changes to Polymarket microstructure data since a given timestamp. " +
        "Cost: $0.003 per query. Source: Polymarket order book analysis.",
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
      const res = await apiGet<PmMicroQueryResponse>("/api/v1/pm/micro/changes", {
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
      const summary = `${warn}Found ${count} microstructure change(s) since ${since}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "pm_micro_stats",
    {
      title: "Polymarket Microstructure Statistics",
      description:
        "Get statistics about the Polymarket microstructure dataset: total markets analyzed, " +
        "average spread, thin book count, and last updated. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<PmMicroStatsResponse>("/api/v1/pm/micro/stats");

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
