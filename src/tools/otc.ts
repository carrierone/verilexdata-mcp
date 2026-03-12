// OTC Company Data tools
//
// Tools:
//   query_otc_companies — Search OTC-traded companies by ticker, name, financials, risk scores
//   lookup_otc_ticker   — Look up a single company by ticker symbol
//   otc_stats           — Get OTC dataset statistics (company count, last updated)
//
// Pipeline: collectors/otc.py + processors/otc.py (SEC EDGAR + FINRA + SEC XBRL)
// Data: ~4,000-6,000 OTC companies with shell risk scores, filing recency, financials

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "../client.js";

interface OtcQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface OtcStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerOtcTools(server: McpServer): void {
  // ── Query OTC companies ─────────────────────────────────────────────────

  server.registerTool(
    "query_otc_companies",
    {
      title: "Query OTC Companies",
      description:
        "Search OTC-traded companies from SEC EDGAR. Filter by ticker, company name, " +
        "financial metrics, shell risk score, and filing recency. Includes derived analytics " +
        "like shell risk flags and filing recency scores. ~4,000-6,000 companies. " +
        "Source: SEC EDGAR + FINRA, updated daily.",
      inputSchema: {
        ticker: z
          .string()
          .optional()
          .describe("Ticker symbol (partial match, e.g. ACME)"),
        company_name: z
          .string()
          .optional()
          .describe("Company name (partial match)"),
        has_financials: z
          .boolean()
          .optional()
          .describe("Filter to companies with SEC XBRL financial data"),
        min_filing_recency: z
          .number()
          .int()
          .min(0)
          .max(100)
          .optional()
          .describe("Minimum filing recency score (0-100, higher = more recent filings)"),
        max_shell_risk: z
          .number()
          .int()
          .min(0)
          .max(100)
          .optional()
          .describe("Maximum shell risk score (0-100, lower = less likely to be a shell)"),
        min_revenue: z
          .number()
          .optional()
          .describe("Minimum revenue in USD (from latest SEC XBRL filing)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum number of results to return (default 25, max 100)"),
      },
    },
    async ({ ticker, company_name, has_financials, min_filing_recency, max_shell_risk, min_revenue, limit }) => {
      const res = await apiGet<OtcQueryResponse>("/api/v1/otc", {
        ticker,
        company_name,
        has_financials: has_financials != null ? String(has_financials) : undefined,
        min_filing_recency,
        max_shell_risk,
        min_revenue,
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
      const summary = `Found ${count} OTC company/companies.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Single ticker lookup ───────────────────────────────────────────────

  server.registerTool(
    "lookup_otc_ticker",
    {
      title: "Lookup OTC Company",
      description:
        "Look up a single OTC-traded company by ticker symbol. Returns full company details " +
        "including CIK, SIC code, financials (revenue, assets, net income), short interest, " +
        "shell risk score, and filing recency score. Source: SEC EDGAR + FINRA.",
      inputSchema: {
        ticker: z
          .string()
          .regex(/^[A-Za-z]{1,10}$/, "Ticker must be 1-10 letters")
          .describe("The ticker symbol (e.g. ACME)"),
      },
    },
    async ({ ticker }) => {
      const res = await apiGet<{ dataset: string; data: Record<string, unknown> }>(
        `/api/v1/otc/${encodeURIComponent(ticker.toUpperCase())}`,
      );

      if (!res.ok) {
        const msg =
          res.status === 404
            ? `Ticker ${ticker.toUpperCase()} not found in the OTC dataset.`
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
    "otc_stats",
    {
      title: "OTC Dataset Statistics",
      description:
        "Get statistics about the OTC company dataset: total companies, companies with financials, " +
        "average shell risk score, last updated timestamp, and data source information. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<OtcStatsResponse>("/api/v1/otc/stats");

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
