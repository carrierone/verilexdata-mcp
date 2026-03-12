// Patent Data tools
//
// Tools:
//   query_patents     — Search patents by title, assignee, inventor, CPC section, type, dates
//   lookup_patent     — Look up a single patent by patent number
//   patent_stats      — Get patent dataset statistics
//
// Pipeline: collectors/patents.py + processors/patents.py (USPTO PatentsView API)
// Data: US patents with assignees, inventors, CPC classifications, citations, claims

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "../client.js";

interface PatentQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface PatentStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerPatentTools(server: McpServer): void {
  // ── Query patents ───────────────────────────────────────────────────────

  server.registerTool(
    "query_patents",
    {
      title: "Query Patents",
      description:
        "Search US patents from the USPTO PatentsView database. Filter by patent title, " +
        "assignee organization, inventor name, CPC section, patent type, and grant date range. " +
        "Source: USPTO PatentsView API, updated weekly.",
      inputSchema: {
        patent_title: z
          .string()
          .optional()
          .describe("Patent title keyword search (partial match)"),
        assignee: z
          .string()
          .optional()
          .describe("Assignee organization name (partial match, e.g. 'Google')"),
        inventor: z
          .string()
          .optional()
          .describe("Inventor name (partial match, e.g. 'Smith')"),
        cpc_section: z
          .string()
          .optional()
          .describe("CPC section letter (A=Human Necessities, B=Operations, C=Chemistry, " +
            "D=Textiles, E=Fixed Constructions, F=Mechanical Engineering, G=Physics, H=Electricity)"),
        patent_type: z
          .string()
          .optional()
          .describe("Patent type: utility, design, plant, reissue"),
        date_from: z
          .string()
          .optional()
          .describe("Start date for patent grant (YYYY-MM-DD)"),
        date_to: z
          .string()
          .optional()
          .describe("End date for patent grant (YYYY-MM-DD)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results to return (default 25, max 100)"),
      },
    },
    async ({ patent_title, assignee, inventor, cpc_section, patent_type, date_from, date_to, limit }) => {
      const res = await apiGet<PatentQueryResponse>("/api/v1/patents", {
        patent_title,
        assignee,
        inventor,
        cpc_section,
        patent_type,
        date_from,
        date_to,
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
      const summary = `Found ${count} patent(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Single patent lookup ────────────────────────────────────────────────

  server.registerTool(
    "lookup_patent",
    {
      title: "Lookup Patent",
      description:
        "Look up a single US patent by patent number. Returns full details including title, " +
        "abstract, assignee, inventors, CPC classifications, grant date, filing date, " +
        "number of claims, and citation counts. Source: USPTO PatentsView.",
      inputSchema: {
        patent_number: z
          .string()
          .regex(/^[A-Z]{0,2}\d{1,10}[A-Z]?\d*$/, "Invalid patent number format")
          .describe("Patent number (e.g. 11234567, D123456, RE12345)"),
      },
    },
    async ({ patent_number }) => {
      const res = await apiGet<{ dataset: string; data: Record<string, unknown> }>(
        `/api/v1/patents/${encodeURIComponent(patent_number)}`,
      );

      if (!res.ok) {
        const msg =
          res.status === 404
            ? `Patent ${patent_number} not found in the patent dataset.`
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

  // ── Dataset stats ───────────────────────────────────────────────────────

  server.registerTool(
    "patent_stats",
    {
      title: "Patent Dataset Statistics",
      description:
        "Get statistics about the patent dataset: total patents, type breakdown, " +
        "top CPC sections, top assignees, last updated timestamp, and data source information. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<PatentStatsResponse>("/api/v1/patents/stats");

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
