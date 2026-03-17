// Polymarket Arbitrage tools
//
// Tools:
//   pm_arb_opportunities — Cross-market spread opportunities ($0.01)
//   pm_arb_changes       — Change feed for arbitrage data updates ($0.005)
//   pm_arb_stats         — Get arbitrage dataset statistics (free)
//
// Data source: Polymarket cross-market spread analysis

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface PmArbQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface PmArbStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerPmArbTools(server: McpServer): void {
  // ── Arbitrage opportunities ───────────────────────────────────────────

  server.registerTool(
    "pm_arb_opportunities",
    {
      title: "Polymarket Arbitrage Opportunities",
      description:
        "Get cross-market arbitrage opportunities on Polymarket. Shows price spreads " +
        "between correlated markets, implied probability mismatches, and estimated profit. " +
        "Cost: $0.01 per query. Source: Polymarket spread analysis.",
      inputSchema: {
        min_spread: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Minimum spread threshold (0-1, default 0.05)"),
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
    async ({ min_spread, market_id, limit }) => {
      const res = await apiGet<PmArbQueryResponse>("/api/v1/pm/arb/opportunities", {
        min_spread: min_spread ?? 0.05,
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
      const summary = `${warn}Found ${count} arbitrage opportunity/opportunities.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Change feed ───────────────────────────────────────────────────────

  server.registerTool(
    "pm_arb_changes",
    {
      title: "Polymarket Arbitrage Changes",
      description:
        "Get recent changes to Polymarket arbitrage data since a given timestamp. " +
        "Cost: $0.005 per query. Source: Polymarket spread analysis.",
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
      const res = await apiGet<PmArbQueryResponse>("/api/v1/pm/arb/changes", {
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
      const summary = `${warn}Found ${count} arbitrage change(s) since ${since}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "pm_arb_stats",
    {
      title: "Polymarket Arbitrage Statistics",
      description:
        "Get statistics about the Polymarket arbitrage dataset: total opportunities tracked, " +
        "average spread, markets analyzed, and last updated. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<PmArbStatsResponse>("/api/v1/pm/arb/stats");

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
