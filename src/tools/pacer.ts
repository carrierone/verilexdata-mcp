// PACER (Public Access to Court Electronic Records) tools
//
// Tools:
//   search_pacer_cases — Search federal court cases by party name, court, date range
//   get_pacer_case     — Look up a single case by ID
//   pacer_stats        — Get PACER dataset statistics
//
// Pipeline: collectors/pacer.py + processors/pacer.py (CourtListener API)
// Data: Federal court case metadata, partitioned by court code
// Note: Requires COURTLISTENER_TOKEN env var for data collection

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "../client.js";

interface PacerCasesResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface PacerStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerPacerTools(server: McpServer): void {
  // ── Search cases ─────────────────────────────────────────────────────────

  server.registerTool(
    "search_pacer_cases",
    {
      title: "Search PACER Cases",
      description:
        "Search federal court case records from PACER. Filter by party name, court code, " +
        "case type, and date range. Returns case metadata including title, parties, court, " +
        "and filing date. Source: PACER, updated daily. " +
        "Note: This dataset is coming soon and may not have data yet.",
      inputSchema: {
        party: z
          .string()
          .optional()
          .describe("Party name to search for (plaintiff or defendant)"),
        court: z
          .string()
          .optional()
          .describe(
            "Federal court code (e.g. cacd = Central District of California, " +
            "nysd = Southern District of New York, txed = Eastern District of Texas)",
          ),
        case_type: z
          .string()
          .optional()
          .describe("Case type (e.g. civil, criminal, bankruptcy)"),
        date_from: z
          .string()
          .optional()
          .describe("Start date for filing date range (YYYY-MM-DD)"),
        date_to: z
          .string()
          .optional()
          .describe("End date for filing date range (YYYY-MM-DD)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of results (default 25, max 100)"),
      },
    },
    async ({ party, court, case_type, date_from, date_to, limit }) => {
      const res = await apiGet<PacerCasesResponse>("/api/v1/pacer/cases", {
        party,
        court,
        case_type,
        date_from,
        date_to,
        limit: limit ?? 25,
      });

      if (!res.ok) {
        if (res.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: "PACER dataset is not yet available. This data source is coming soon.",
              },
            ],
          };
        }
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
      const summary = `Found ${count} PACER case(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Single case lookup ───────────────────────────────────────────────────

  server.registerTool(
    "get_pacer_case",
    {
      title: "Get PACER Case",
      description:
        "Look up a single federal court case by its case ID. Returns full case metadata " +
        "including title, parties, court, nature of suit, filing date, and assigned judge. " +
        "Source: PACER via CourtListener, updated daily.",
      inputSchema: {
        case_id: z
          .string()
          .describe("The case ID to look up"),
      },
    },
    async ({ case_id }) => {
      const res = await apiGet<Record<string, unknown>>(
        `/api/v1/pacer/cases/${encodeURIComponent(case_id)}`,
      );

      if (!res.ok) {
        if (res.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: `Case ${case_id} not found in PACER dataset.`,
              },
            ],
          };
        }
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

  // ── Dataset stats ────────────────────────────────────────────────────────

  server.registerTool(
    "pacer_stats",
    {
      title: "PACER Dataset Statistics",
      description:
        "Get statistics about the PACER court records dataset: total cases indexed, " +
        "courts covered, date range, and last updated timestamp. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<PacerStatsResponse>("/api/v1/pacer/stats");

      if (!res.ok) {
        if (res.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: "PACER dataset is not yet available. This data source is coming soon.",
              },
            ],
          };
        }
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
