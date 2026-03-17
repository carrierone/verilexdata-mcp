// Government Contracts tools
//
// Tools:
//   search_contracts — Search federal contract awards by agency/vendor ($0.018)
//   lookup_contract  — Look up a single contract award ($0.018)
//   top_vendors      — Vendor rankings by award value ($0.03)
//   contract_stats   — Get contracts dataset statistics (free)
//
// Data source: USAspending.gov federal procurement data

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface ContractQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface ContractStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerContractTools(server: McpServer): void {
  // ── Search contracts ──────────────────────────────────────────────────

  server.registerTool(
    "search_contracts",
    {
      title: "Search Government Contracts",
      description:
        "Search federal contract awards by agency, vendor, NAICS code, or keyword. " +
        "Returns award details including value, period of performance, and competition type. " +
        "Cost: $0.018 per query. Source: USAspending.gov, updated daily.",
      inputSchema: {
        agency: z
          .string()
          .optional()
          .describe("Awarding agency name or abbreviation (e.g. DOD, HHS)"),
        vendor: z
          .string()
          .optional()
          .describe("Vendor/contractor name (partial match)"),
        naics: z
          .string()
          .optional()
          .describe("NAICS code filter"),
        keyword: z
          .string()
          .optional()
          .describe("Keyword search in award description"),
        min_value: z
          .number()
          .optional()
          .describe("Minimum award value in USD"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ agency, vendor, naics, keyword, min_value, limit }) => {
      const res = await apiGet<ContractQueryResponse>("/api/v1/contracts", {
        agency,
        vendor,
        naics,
        keyword,
        min_value,
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
      const summary = `${warn}Found ${count} contract award(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Lookup single contract ────────────────────────────────────────────

  server.registerTool(
    "lookup_contract",
    {
      title: "Lookup Contract Award",
      description:
        "Look up a single federal contract award by its ID. Returns full award details " +
        "including modifications, sub-awards, and performance history. " +
        "Cost: $0.018 per query. Source: USAspending.gov.",
      inputSchema: {
        contract_id: z
          .string()
          .describe("Contract award ID"),
      },
    },
    async ({ contract_id }) => {
      const res = await apiGet<{ dataset: string; data: Record<string, unknown> }>(
        `/api/v1/contracts/${encodeURIComponent(contract_id)}`,
      );

      if (!res.ok) {
        const msg =
          res.status === 404
            ? `Contract ${contract_id} not found.`
            : `API error (${res.status}): ${JSON.stringify(res.data)}`;
        return {
          content: [{ type: "text" as const, text: msg }],
          isError: res.status !== 404,
        };
      }

      const warn = stalenessWarning(res);
      return {
        content: [
          { type: "text" as const, text: `${warn}${JSON.stringify(res.data.data, null, 2)}` },
        ],
      };
    },
  );

  // ── Top vendors ───────────────────────────────────────────────────────

  server.registerTool(
    "top_vendors",
    {
      title: "Top Government Contract Vendors",
      description:
        "Get vendor rankings by total award value. Shows top contractors by agency, " +
        "total awards, and contract counts. " +
        "Cost: $0.03 per query. Source: USAspending.gov.",
      inputSchema: {
        agency: z
          .string()
          .optional()
          .describe("Filter by awarding agency"),
        period: z
          .enum(["1y", "3y", "5y", "all"])
          .optional()
          .describe("Time period for ranking (default: 1y)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ agency, period, limit }) => {
      const res = await apiGet<ContractQueryResponse>("/api/v1/contracts/vendors", {
        agency,
        period: period ?? "1y",
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
      const summary = `${warn}Found ${count} vendor(s).`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "contract_stats",
    {
      title: "Contracts Dataset Statistics",
      description:
        "Get statistics about the government contracts dataset: total awards, " +
        "agencies covered, date range, and data source information. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<ContractStatsResponse>("/api/v1/contracts/stats");

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
