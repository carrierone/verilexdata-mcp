// Sanctions Screening tools
//
// Tools:
//   screen_sanctions   — Screen an address or name against sanctions lists ($0.005)
//   search_sanctions   — Full-text search across sanctions entries ($0.009)
//   sanctions_changes  — Change feed for sanctions list updates ($0.005)
//   sanctions_stats    — Get sanctions dataset statistics (free)
//
// Data source: OFAC SDN, EU, UN, UK consolidated sanctions lists

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface SanctionsQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface SanctionsStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerSanctionsTools(server: McpServer): void {
  // ── Screen address or name ────────────────────────────────────────────

  server.registerTool(
    "screen_sanctions",
    {
      title: "Screen Sanctions",
      description:
        "Screen an address, name, or entity against global sanctions lists (OFAC SDN, EU, " +
        "UN, UK). Returns matching entries with match scores. " +
        "Cost: $0.005 per query. Source: Consolidated sanctions lists, updated daily.",
      inputSchema: {
        name: z
          .string()
          .optional()
          .describe("Name or alias to screen"),
        address: z
          .string()
          .optional()
          .describe("Crypto address to screen"),
        threshold: z
          .number()
          .min(0)
          .max(1)
          .optional()
          .describe("Minimum match score (0-1, default 0.8)"),
      },
    },
    async ({ name, address, threshold }) => {
      const res = await apiGet<SanctionsQueryResponse>(
        "/api/v1/sanctions/screen",
        {
          name,
          address,
          threshold: threshold ?? 0.8,
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
      const summary = `${warn}Found ${count} sanctions match(es).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Full-text search ──────────────────────────────────────────────────

  server.registerTool(
    "search_sanctions",
    {
      title: "Search Sanctions",
      description:
        "Full-text search across all sanctions entries. Search by name, alias, address, " +
        "country, or program. Returns matching entries ranked by relevance. " +
        "Cost: $0.009 per query. Source: OFAC SDN, EU, UN, UK lists.",
      inputSchema: {
        q: z.string().describe("Search query (name, alias, address, country, etc.)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ q, limit }) => {
      const res = await apiGet<SanctionsQueryResponse>(
        "/api/v1/sanctions/search",
        { q, limit: limit ?? 25 },
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
      const summary = `${warn}Found ${count} sanctions result(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Change feed ───────────────────────────────────────────────────────

  server.registerTool(
    "sanctions_changes",
    {
      title: "Sanctions Changes",
      description:
        "Get recent changes to sanctions lists since a given timestamp. Shows additions, " +
        "removals, and modifications to sanctioned entities. " +
        "Cost: $0.005 per query. Source: Consolidated sanctions lists.",
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
      const res = await apiGet<SanctionsQueryResponse>(
        "/api/v1/sanctions/changes",
        { since, limit: limit ?? 50 },
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
      const summary = `${warn}Found ${count} sanctions change(s) since ${since}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "sanctions_stats",
    {
      title: "Sanctions Dataset Statistics",
      description:
        "Get statistics about the sanctions dataset: total entries, lists covered, " +
        "last updated timestamp, and data source information. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<SanctionsStatsResponse>("/api/v1/sanctions/stats");

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
