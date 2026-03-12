// NPI (National Provider Identifier) tools
//
// Tools:
//   query_npi_providers — Search healthcare providers by state, specialty, name, city, ZIP
//   lookup_npi         — Look up a single provider by their 10-digit NPI number
//   npi_stats          — Get NPI dataset statistics (record count, last updated)

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "../client.js";

interface NpiQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
  note?: string;
}

interface NpiStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerNpiTools(server: McpServer): void {
  // ── Query providers ──────────────────────────────────────────────────────

  server.registerTool(
    "query_npi_providers",
    {
      title: "Query NPI Providers",
      description:
        "Search the NPI (National Provider Identifier) registry for healthcare providers. " +
        "Filter by state, specialty, name, city, or ZIP code. Returns up to 100 results per query. " +
        "Source: CMS NPPES, updated weekly. ~7.2 million providers.",
      inputSchema: {
        state: z
          .string()
          .length(2)
          .optional()
          .describe("Two-letter US state code (e.g. CA, NY, TX)"),
        specialty: z
          .string()
          .optional()
          .describe(
            "Provider specialty or taxonomy description (e.g. Cardiology, Family Medicine)",
          ),
        name: z
          .string()
          .optional()
          .describe(
            "Provider name (partial match on first or last name, or organization name)",
          ),
        city: z.string().optional().describe("City name"),
        zip: z
          .string()
          .optional()
          .describe("5-digit ZIP code"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of results to return (default 25, max 100)"),
      },
    },
    async ({ state, specialty, name, city, zip, limit }) => {
      const res = await apiGet<NpiQueryResponse>("/api/v1/npi", {
        state,
        specialty,
        name,
        city,
        zip,
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
      const summary = `Found ${count} NPI provider(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Single provider lookup ───────────────────────────────────────────────

  server.registerTool(
    "lookup_npi",
    {
      title: "Lookup NPI Provider",
      description:
        "Look up a single healthcare provider by their 10-digit NPI number. " +
        "Returns full provider details including name, address, specialty, and enumeration date.",
      inputSchema: {
        npi: z
          .string()
          .regex(/^\d{10}$/, "NPI must be exactly 10 digits")
          .describe("The 10-digit NPI number"),
      },
    },
    async ({ npi }) => {
      const res = await apiGet<{ dataset: string; data: Record<string, unknown> }>(
        `/api/v1/npi/${npi}`,
      );

      if (!res.ok) {
        const msg =
          res.status === 404
            ? `NPI ${npi} not found in the registry.`
            : `API error (${res.status}): ${JSON.stringify(res.data)}`;
        return {
          content: [{ type: "text" as const, text: msg }],
          isError: res.status !== 404,
        };
      }

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(res.data.data, null, 2) },
        ],
      };
    },
  );

  // ── Dataset stats ────────────────────────────────────────────────────────

  server.registerTool(
    "npi_stats",
    {
      title: "NPI Dataset Statistics",
      description:
        "Get statistics about the NPI dataset: total record count, number of states, " +
        "last updated timestamp, and data source information. Free endpoint, no payment required.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<NpiStatsResponse>("/api/v1/npi/stats");

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
