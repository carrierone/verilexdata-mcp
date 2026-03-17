// Token Holder Intelligence tools
//
// Tools:
//   query_holders        — Top holders for a token ($0.04)
//   holder_concentration — Gini coefficient and distribution metrics ($0.02)
//   holder_changes       — Change feed for holder updates ($0.02)
//   holder_stats         — Get holder dataset statistics (free)
//
// Data source: On-chain token holder analysis

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface HolderQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface HolderStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerHolderTools(server: McpServer): void {
  // ── Query top holders ─────────────────────────────────────────────────

  server.registerTool(
    "query_holders",
    {
      title: "Query Top Holders",
      description:
        "Get the top holders for a token contract address. Returns wallet addresses, " +
        "balances, percentage of supply, and holder labels (exchange, whale, contract). " +
        "Cost: $0.04 per query. Source: On-chain token analytics.",
      inputSchema: {
        token: z
          .string()
          .describe("Token contract address (e.g. 0xdAC17F958D2ee523a2206206994597C13D831ec7)"),
        chain: z
          .enum(["ethereum", "arbitrum", "polygon", "base", "bsc"])
          .optional()
          .describe("Blockchain network (default: ethereum)"),
        limit: z
          .number()
          .int()
          .min(1)
          .max(100)
          .optional()
          .describe("Maximum results (default 25)"),
      },
    },
    async ({ token, chain, limit }) => {
      const res = await apiGet<HolderQueryResponse>(
        `/api/v1/holders/${encodeURIComponent(token)}`,
        {
          chain,
          limit: limit ?? 25,
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
      const summary = `${warn}Found ${count} holder(s) for token ${token}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Holder concentration ──────────────────────────────────────────────

  server.registerTool(
    "holder_concentration",
    {
      title: "Holder Concentration",
      description:
        "Get Gini coefficient and distribution metrics for a token. Shows concentration " +
        "risk, top-10/top-50 holder percentages, and supply distribution buckets. " +
        "Cost: $0.02 per query. Source: On-chain token analytics.",
      inputSchema: {
        token: z
          .string()
          .describe("Token contract address"),
        chain: z
          .enum(["ethereum", "arbitrum", "polygon", "base", "bsc"])
          .optional()
          .describe("Blockchain network (default: ethereum)"),
      },
    },
    async ({ token, chain }) => {
      const res = await apiGet<{ dataset: string; data: Record<string, unknown> }>(
        `/api/v1/holders/${encodeURIComponent(token)}/concentration`,
        { chain },
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

      const warn = stalenessWarning(res);
      return {
        content: [
          { type: "text" as const, text: `${warn}${JSON.stringify(res.data.data, null, 2)}` },
        ],
      };
    },
  );

  // ── Change feed ───────────────────────────────────────────────────────

  server.registerTool(
    "holder_changes",
    {
      title: "Holder Changes",
      description:
        "Get recent changes to token holder data since a given timestamp. " +
        "Cost: $0.02 per query. Source: On-chain token analytics.",
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
      const res = await apiGet<HolderQueryResponse>("/api/v1/holders/changes", {
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
      const summary = `${warn}Found ${count} holder change(s) since ${since}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "holder_stats",
    {
      title: "Holder Dataset Statistics",
      description:
        "Get statistics about the token holder dataset: total tokens tracked, " +
        "total holder records, chains covered, last updated. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<HolderStatsResponse>("/api/v1/holders/stats");

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
