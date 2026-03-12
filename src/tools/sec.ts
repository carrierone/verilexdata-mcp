// SEC EDGAR tools
//
// Tools:
//   search_sec_filings — Search SEC filings by CIK, form type, company name, date range
//   get_sec_filing     — Get a single filing by accession number
//   search_sec_companies — Search for SEC-registered companies by name
//   sec_stats          — Get SEC dataset statistics

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "../client.js";

interface SecFilingsResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
  note?: string;
}

interface SecFilingResponse {
  dataset: string;
  data: Record<string, unknown>;
}

interface SecCompaniesResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface SecStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerSecTools(server: McpServer): void {
  // ── Search filings ───────────────────────────────────────────────────────

  server.registerTool(
    "search_sec_filings",
    {
      title: "Search SEC Filings",
      description:
        "Search SEC EDGAR filings by CIK number, form type (10-K, 10-Q, 8-K, etc.), " +
        "company name, and date range. Returns filing metadata including accession number, " +
        "filing date, and document URLs. Source: SEC EDGAR, updated every 15 minutes.",
      inputSchema: {
        cik: z
          .string()
          .optional()
          .describe(
            "Central Index Key — SEC's unique company identifier (e.g. 0001652044 for Alphabet)",
          ),
        form_type: z
          .string()
          .optional()
          .describe(
            "SEC form type (e.g. 10-K, 10-Q, 8-K, S-1, DEF 14A). Case-insensitive.",
          ),
        company_name: z
          .string()
          .optional()
          .describe("Company name to search for (partial match)"),
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
    async ({ cik, form_type, company_name, date_from, date_to, limit }) => {
      const res = await apiGet<SecFilingsResponse>("/api/v1/sec/filings", {
        cik,
        form_type,
        company_name,
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
      const summary = `Found ${count} SEC filing(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Single filing lookup ─────────────────────────────────────────────────

  server.registerTool(
    "get_sec_filing",
    {
      title: "Get SEC Filing",
      description:
        "Retrieve a single SEC filing by its accession number. Returns full filing metadata " +
        "including company info, form type, filing date, and document URLs.",
      inputSchema: {
        accession_number: z
          .string()
          .describe(
            "SEC accession number (e.g. 0001652044-25-000001). Dashes are optional.",
          ),
      },
    },
    async ({ accession_number }) => {
      const res = await apiGet<SecFilingResponse>(
        `/api/v1/sec/filings/${encodeURIComponent(accession_number)}`,
      );

      if (!res.ok) {
        const msg =
          res.status === 404
            ? `Filing ${accession_number} not found.`
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

  // ── Company search ───────────────────────────────────────────────────────

  server.registerTool(
    "search_sec_companies",
    {
      title: "Search SEC Companies",
      description:
        "Search for companies registered with the SEC by name. Returns CIK numbers, " +
        "company names, and filing counts. Useful for finding a company's CIK before " +
        "searching their filings.",
      inputSchema: {
        search: z
          .string()
          .min(2)
          .describe("Company name to search for (at least 2 characters)"),
      },
    },
    async ({ search }) => {
      const res = await apiGet<SecCompaniesResponse>("/api/v1/sec/companies", {
        search,
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
      const summary = `Found ${count} compan${count === 1 ? "y" : "ies"}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ────────────────────────────────────────────────────────

  server.registerTool(
    "sec_stats",
    {
      title: "SEC Dataset Statistics",
      description:
        "Get statistics about the SEC filings dataset: total filings, form type breakdown, " +
        "date range, and last updated timestamp. Free endpoint, no payment required.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<SecStatsResponse>("/api/v1/sec/stats");

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
