// Polymarket Resolution Intelligence tools
//
// Tools:
//   pm_resolution_lookup   — Look up resolution source for a market ($0.02)
//   pm_resolution_calendar — Upcoming resolution events ($0.02)
//   pm_resolution_stats    — Get resolution dataset statistics (free)
//
// Data source: Polymarket market resolution tracking

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface PmResolutionQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface PmResolutionStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerPmResolutionTools(server: McpServer): void {
  // ── Resolution lookup ─────────────────────────────────────────────────

  server.registerTool(
    "pm_resolution_lookup",
    {
      title: "Polymarket Resolution Lookup",
      description:
        "Look up the resolution source and criteria for a Polymarket market. Shows the " +
        "oracle, resolution rules, data sources, and expected resolution timeline. " +
        "Cost: $0.02 per query. Source: Polymarket resolution tracking.",
      inputSchema: {
        market_id: z
          .string()
          .optional()
          .describe("Market ID to look up"),
        query: z
          .string()
          .optional()
          .describe("Search markets by title/description"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ market_id, query, limit }) => {
      const res = await apiGet<PmResolutionQueryResponse>(
        "/api/v1/pm/resolution/lookup",
        {
          market_id,
          q: query,
          limit: limit ?? 25,
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
      const warn = stalenessWarning(res);
      const summary = `${warn}Found ${count} resolution record(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Resolution calendar ───────────────────────────────────────────────

  server.registerTool(
    "pm_resolution_calendar",
    {
      title: "Polymarket Resolution Calendar",
      description:
        "Get upcoming market resolution events. Shows markets expected to resolve " +
        "within a given timeframe with resolution dates, sources, and current prices. " +
        "Cost: $0.02 per query. Source: Polymarket resolution tracking.",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .optional()
          .describe("Number of days to look ahead (default 7)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ days, limit }) => {
      const res = await apiGet<PmResolutionQueryResponse>(
        "/api/v1/pm/resolution/calendar",
        {
          days: days ?? 7,
          limit: limit ?? 25,
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
      const warn = stalenessWarning(res);
      const summary = `${warn}Found ${count} upcoming resolution event(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "pm_resolution_stats",
    {
      title: "Polymarket Resolution Statistics",
      description:
        "Get statistics about the Polymarket resolution dataset: total markets tracked, " +
        "upcoming resolutions, resolution sources, and last updated. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<PmResolutionStatsResponse>(
        "/api/v1/pm/resolution/stats",
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

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(res.data, null, 2) },
        ],
      };
    },
  );
}
