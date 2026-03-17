// Address Label & Risk tools
//
// Tools:
//   lookup_label   — Look up label and risk score for a crypto address ($0.009)
//   label_changes  — Change feed for label updates ($0.005)
//   label_stats    — Get label dataset statistics (free)
//
// Data source: On-chain address labeling and risk scoring

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet, stalenessWarning } from "../client.js";

interface LabelQueryResponse {
  dataset: string;
  count: number;
  data: Record<string, unknown>[];
}

interface LabelStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerLabelTools(server: McpServer): void {
  // ── Lookup address label ──────────────────────────────────────────────

  server.registerTool(
    "lookup_label",
    {
      title: "Lookup Address Label",
      description:
        "Look up the label and risk score for a cryptocurrency address. Returns entity name, " +
        "category (exchange, DeFi, bridge, etc.), risk flags, and compliance tags. " +
        "Cost: $0.009 per query. Source: On-chain address intelligence.",
      inputSchema: {
        address: z
          .string()
          .describe("Crypto address to look up (e.g. 0xdAC17F958D2ee523a2206206994597C13D831ec7)"),
      },
    },
    async ({ address }) => {
      const res = await apiGet<{ dataset: string; data: Record<string, unknown> }>(
        `/api/v1/labels/${encodeURIComponent(address)}`,
      );

      if (!res.ok) {
        const msg =
          res.status === 404
            ? `No label found for address ${address}.`
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

  // ── Change feed ───────────────────────────────────────────────────────

  server.registerTool(
    "label_changes",
    {
      title: "Label Changes",
      description:
        "Get recent changes to address labels since a given timestamp. Shows newly labeled " +
        "addresses, risk score updates, and category changes. " +
        "Cost: $0.005 per query. Source: On-chain address intelligence.",
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
      const res = await apiGet<LabelQueryResponse>("/api/v1/labels/changes", {
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
      const summary = `${warn}Found ${count} label change(s) since ${since}.`;
      const json = JSON.stringify(data, null, 2);

      return {
        content: [{ type: "text" as const, text: `${summary}\n\n${json}` }],
      };
    },
  );

  // ── Dataset stats ─────────────────────────────────────────────────────

  server.registerTool(
    "label_stats",
    {
      title: "Label Dataset Statistics",
      description:
        "Get statistics about the address label dataset: total labeled addresses, " +
        "categories covered, last updated timestamp. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<LabelStatsResponse>("/api/v1/labels/stats");

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
