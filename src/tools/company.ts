// Company Intelligence tools
//
// Tools:
//   company_profile       — Unified cross-dataset company profile by ticker/CIK/name
//   screen_companies      — Company screener with financial, IP, and litigation filters
//   trader_signals        — Alpha signals from recent activity across all datasets
//
// These are the premium cross-dataset endpoints that combine SEC, OTC, Patents,
// Trademarks, and PACER data into unified intelligence views.

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "../client.js";

export function registerCompanyTools(server: McpServer): void {
  // ── Company Profile ─────────────────────────────────────────────────────

  server.registerTool(
    "company_profile",
    {
      title: "Company Profile",
      description:
        "Get a unified company profile across all Verilex datasets. Searches by ticker symbol, " +
        "SEC CIK number, or company name. Returns SEC filings, OTC data (shell risk, financials), " +
        "patent portfolio, trademark registrations, and court cases — all in one response. " +
        "This is the premium cross-dataset intelligence endpoint.",
      inputSchema: {
        identifier: z
          .string()
          .min(1)
          .max(100)
          .describe("Company identifier: ticker symbol (e.g. AAPL), CIK number (e.g. 0000320193), or company name"),
      },
    },
    async ({ identifier }) => {
      const res = await apiGet<Record<string, unknown>>(
        `/api/v1/company/${encodeURIComponent(identifier)}`,
      );

      if (!res.ok) {
        const msg =
          res.status === 404
            ? `No data found for '${identifier}' across any dataset.`
            : `API error (${res.status}): ${JSON.stringify(res.data)}`;
        return {
          content: [{ type: "text" as const, text: msg }],
          isError: res.status !== 404,
        };
      }

      return {
        content: [
          { type: "text" as const, text: JSON.stringify(res.data, null, 2) },
        ],
      };
    },
  );

  // ── Company Screener ────────────────────────────────────────────────────

  server.registerTool(
    "screen_companies",
    {
      title: "Screen Companies",
      description:
        "Screen companies using financial, industry, IP, and litigation filters. " +
        "Combine SIC industry codes, revenue/asset brackets, shell risk scores, " +
        "patent/trademark/litigation flags, and short interest levels. " +
        "Cross-references SEC, OTC, Patents, Trademarks, and PACER datasets.",
      inputSchema: {
        sic_code: z
          .string()
          .optional()
          .describe("SIC industry code (e.g. '7372' for software)"),
        industry: z
          .string()
          .optional()
          .describe("Industry keyword search (partial match)"),
        min_revenue: z
          .number()
          .optional()
          .describe("Minimum revenue in USD"),
        max_revenue: z
          .number()
          .optional()
          .describe("Maximum revenue in USD"),
        min_assets: z
          .number()
          .optional()
          .describe("Minimum total assets in USD"),
        max_assets: z
          .number()
          .optional()
          .describe("Maximum total assets in USD"),
        max_shell_risk: z
          .number()
          .int()
          .min(0)
          .max(100)
          .optional()
          .describe("Maximum shell risk score (0-100)"),
        min_filing_recency: z
          .number()
          .int()
          .min(0)
          .max(100)
          .optional()
          .describe("Minimum filing recency score (0-100)"),
        has_patents: z
          .boolean()
          .optional()
          .describe("Filter to companies with patent activity"),
        has_trademarks: z
          .boolean()
          .optional()
          .describe("Filter to companies with trademark registrations"),
        has_litigation: z
          .boolean()
          .optional()
          .describe("Filter to companies with court cases"),
        min_short_interest: z
          .number()
          .optional()
          .describe("Minimum short interest ratio"),
        sort_by: z
          .string()
          .optional()
          .describe("Sort field: revenue, assets, shell_risk, filing_recency, short_interest"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25, max 100)"),
      },
    },
    async (params) => {
      const queryParams: Record<string, string | number | undefined> = {
        sic_code: params.sic_code,
        industry: params.industry,
        min_revenue: params.min_revenue,
        max_revenue: params.max_revenue,
        min_assets: params.min_assets,
        max_assets: params.max_assets,
        max_shell_risk: params.max_shell_risk,
        min_filing_recency: params.min_filing_recency,
        has_patents: params.has_patents != null ? String(params.has_patents) : undefined,
        has_trademarks: params.has_trademarks != null ? String(params.has_trademarks) : undefined,
        has_litigation: params.has_litigation != null ? String(params.has_litigation) : undefined,
        min_short_interest: params.min_short_interest,
        sort_by: params.sort_by,
        limit: params.limit ?? 25,
      };

      const res = await apiGet<{ dataset: string; count: number; data: Record<string, unknown>[] }>(
        "/api/v1/companies/screen",
        queryParams,
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
      const summary = `Found ${count} company/companies matching filters.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Trader Signals ──────────────────────────────────────────────────────

  server.registerTool(
    "trader_signals",
    {
      title: "Trader Alpha Signals",
      description:
        "Get recent alpha signals for traders and hedge funds. Signals include new 8-K filings, " +
        "short interest spikes, new patent grants, new trademark filings, new litigation, " +
        "and delinquent filers. Scans activity across all Verilex datasets over a configurable lookback period.",
      inputSchema: {
        days: z
          .number()
          .int()
          .min(1)
          .max(90)
          .optional()
          .describe("Lookback period in days (default 7, max 90)"),
        signal_types: z
          .array(z.enum([
            "new_8k",
            "short_interest_spike",
            "new_patent",
            "new_trademark",
            "new_litigation",
            "delinquent_filer",
          ]))
          .optional()
          .describe("Filter to specific signal types (default: all)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(500)
          .optional()
          .describe("Maximum signals to return (default 100, max 500)"),
      },
    },
    async ({ days, signal_types, limit }) => {
      const res = await apiGet<{
        dataset: string;
        lookback_days: number;
        count: number;
        signals: Record<string, unknown>[];
      }>("/api/v1/companies/signals", {
        days: days ?? 7,
        signal_types: signal_types ? signal_types.join(",") : undefined,
        limit: limit ?? 100,
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

      const { lookback_days, count, signals } = res.data;
      const summary = `Found ${count} signal(s) in the last ${lookback_days} days.`;
      const json = JSON.stringify(signals, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );
}
