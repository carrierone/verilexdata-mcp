// Economic Indicators tools
//
// Tools:
//   query_indicators — Current values for economic indicators ($0.01)
//   query_releases   — Upcoming economic data releases ($0.01)
//   query_surprises  — Actual vs consensus comparison ($0.02)
//   econ_changes     — Change feed for economic data updates ($0.005)
//   econ_stats       — Get economic dataset statistics (free)
//
// Data source: Federal Reserve, BLS, BEA, Census Bureau

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface EconQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface EconStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerEconTools(server: McpServer): void {
  // ── Query indicators ──────────────────────────────────────────────────

  server.registerTool(
    "query_indicators",
    {
      title: "Query Economic Indicators",
      description:
        "Get current values for economic indicators like CPI, GDP, unemployment, " +
        "interest rates, and more. Filter by series ID, category, or frequency. " +
        "Cost: $0.01 per query. Source: FRED, BLS, BEA.",
      inputSchema: {
        series: z
          .string()
          .optional()
          .describe("FRED series ID (e.g. CPIAUCSL, GDP, UNRATE)"),
        category: z
          .string()
          .optional()
          .describe("Category filter (e.g. inflation, employment, gdp)"),
        frequency: z
          .enum(["daily", "weekly", "monthly", "quarterly", "annual"])
          .optional()
          .describe("Data frequency filter"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ series, category, frequency, limit }) => {
      const res = await apiGet<EconQueryResponse>("/api/v1/econ/indicators", {
        series,
        category,
        frequency,
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
      const summary = `${warn}Found ${count} indicator(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Query releases ────────────────────────────────────────────────────

  server.registerTool(
    "query_releases",
    {
      title: "Query Economic Releases",
      description:
        "Get upcoming economic data releases. Shows release dates, expected impact, " +
        "prior values, and consensus forecasts. " +
        "Cost: $0.01 per query. Source: FRED, BLS, BEA.",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .optional()
          .describe("Number of days to look ahead (default 14)"),
        category: z
          .string()
          .optional()
          .describe("Category filter (e.g. inflation, employment)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ days, category, limit }) => {
      const res = await apiGet<EconQueryResponse>("/api/v1/econ/releases", {
        days: days ?? 14,
        category,
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
      const summary = `${warn}Found ${count} upcoming release(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Query surprises ───────────────────────────────────────────────────

  server.registerTool(
    "query_surprises",
    {
      title: "Query Economic Surprises",
      description:
        "Get actual vs consensus comparison for recent economic releases. Shows beat/miss " +
        "magnitude, historical surprise patterns, and market impact. " +
        "Cost: $0.02 per query. Source: FRED, BLS, BEA.",
      inputSchema: {
        series: z
          .string()
          .optional()
          .describe("FRED series ID to filter by"),
        days: z
          .number()
          .int()
          .min(1)
          .max(365)
          .optional()
          .describe("Lookback period in days (default 30)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ series, days, limit }) => {
      const res = await apiGet<EconQueryResponse>("/api/v1/econ/surprise", {
        series,
        days: days ?? 30,
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
      const summary = `${warn}Found ${count} economic surprise(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Change feed ───────────────────────────────────────────────────────

  server.registerTool(
    "econ_changes",
    {
      title: "Economic Data Changes",
      description:
        "Get recent changes to economic data since a given timestamp. " +
        "Cost: $0.005 per query. Source: FRED, BLS, BEA.",
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
      const res = await apiGet<EconQueryResponse>("/api/v1/econ/changes", {
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
      const summary = `${warn}Found ${count} economic data change(s) since ${since}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "econ_stats",
    {
      title: "Economic Dataset Statistics",
      description:
        "Get statistics about the economic indicators dataset: total series, " +
        "categories covered, date range, and data source information. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<EconStatsResponse>("/api/v1/econ/stats");

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
