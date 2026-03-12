// Trademark Data tools
//
// Tools:
//   query_trademarks     — Search trademarks by mark text, owner, class, status, date range
//   lookup_trademark     — Look up a single trademark by serial number
//   trademark_stats      — Get trademark dataset statistics
//
// Pipeline: collectors/trademarks.py + processors/trademarks.py (USPTO TSDR / bulk XML)
// Data: US trademark registrations and applications with owner, class, status, dates

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "../client.js";

interface TrademarkQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface TrademarkStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerTrademarkTools(server: McpServer): void {
  // ── Query trademarks ────────────────────────────────────────────────────

  server.registerTool(
    "query_trademarks",
    {
      title: "Query Trademarks",
      description:
        "Search US trademarks from the USPTO. Filter by mark text, owner name, " +
        "international class, status, and filing/registration date range. " +
        "Source: USPTO TSDR and bulk XML data, updated weekly.",
      inputSchema: {
        mark_text: z
          .string()
          .optional()
          .describe("Trademark text/name (partial match, e.g. 'APPLE')"),
        owner_name: z
          .string()
          .optional()
          .describe("Trademark owner/applicant name (partial match)"),
        international_class: z
          .string()
          .optional()
          .describe("Nice Classification code (e.g. '009' for computers/electronics)"),
        status: z
          .string()
          .optional()
          .describe("Trademark status (e.g. REGISTERED, PENDING, ABANDONED, CANCELLED)"),
        date_from: z
          .string()
          .optional()
          .describe("Start date for filing/registration (YYYY-MM-DD)"),
        date_to: z
          .string()
          .optional()
          .describe("End date for filing/registration (YYYY-MM-DD)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results to return (default 25, max 100)"),
      },
    },
    async ({ mark_text, owner_name, international_class, status, date_from, date_to, limit }) => {
      const res = await apiGet<TrademarkQueryResponse>("/api/v1/trademarks", {
        mark_text,
        owner_name,
        international_class,
        status,
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
      const summary = `Found ${count} trademark(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Single trademark lookup ─────────────────────────────────────────────

  server.registerTool(
    "lookup_trademark",
    {
      title: "Lookup Trademark",
      description:
        "Look up a single US trademark by its USPTO serial number. Returns full details " +
        "including mark text, owner, international class, filing date, registration date, " +
        "status, attorney, and description of goods/services. Source: USPTO TSDR.",
      inputSchema: {
        serial: z
          .string()
          .regex(/^\d{7,8}$/, "Serial number must be 7-8 digits")
          .describe("USPTO serial number (e.g. 97123456)"),
      },
    },
    async ({ serial }) => {
      const res = await apiGet<{ dataset: string; data: Record<string, unknown> }>(
        `/api/v1/trademarks/${encodeURIComponent(serial)}`,
      );

      if (!res.ok) {
        const msg =
          res.status === 404
            ? `Serial number ${serial} not found in the trademark dataset.`
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
    "trademark_stats",
    {
      title: "Trademark Dataset Statistics",
      description:
        "Get statistics about the trademark dataset: total trademarks, status breakdown, " +
        "top international classes, last updated timestamp, and data source information. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<TrademarkStatsResponse>("/api/v1/trademarks/stats");

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
