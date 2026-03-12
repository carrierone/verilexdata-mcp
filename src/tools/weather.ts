// Weather tools
//
// Tools:
//   get_current_weather   — Current conditions by lat/lon or ZIP
//   get_weather_history   — Historical weather data for a location and date range
//   get_weather_forecast  — Weather forecast up to 16 days
//   weather_stats         — Get Weather dataset statistics
//
// Pipeline: collectors/weather.py + processors/weather.py (GHCN-Daily from NOAA NCEI)
// Data: 200 US weather stations, daily observations, partitioned by year/month

import { z } from "zod";
import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { apiGet } from "../client.js";

interface WeatherResponse {
  dataset: string;
  data: Record<string, unknown> | Record<string, unknown>[];
  count?: number;
}

interface WeatherStatsResponse {
  dataset: string;
  source: string;
  update_frequency: string;
  stats: Record<string, unknown>;
}

export function registerWeatherTools(server: McpServer): void {
  // ── Current weather ──────────────────────────────────────────────────────

  server.registerTool(
    "get_current_weather",
    {
      title: "Get Current Weather",
      description:
        "Get current weather conditions for a location. Provide latitude/longitude " +
        "or a US ZIP code. Returns temperature, humidity, wind, precipitation, and " +
        "conditions from the nearest weather station and latest model run. " +
        "Source: NOAA ISD + GFS. Note: This dataset is coming soon.",
      inputSchema: {
        lat: z
          .number()
          .min(-90)
          .max(90)
          .optional()
          .describe("Latitude (-90 to 90). Required if ZIP is not provided."),
        lon: z
          .number()
          .min(-180)
          .max(180)
          .optional()
          .describe("Longitude (-180 to 180). Required if ZIP is not provided."),
        zip: z
          .string()
          .optional()
          .describe(
            "US 5-digit ZIP code. Alternative to lat/lon. Maps to nearest station.",
          ),
      },
    },
    async ({ lat, lon, zip }) => {
      if (!zip && (lat === undefined || lon === undefined)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Please provide either lat+lon or a ZIP code.",
            },
          ],
          isError: true,
        };
      }

      const res = await apiGet<WeatherResponse>("/api/v1/weather/current", {
        lat,
        lon,
        zip,
      });

      if (!res.ok) {
        if (res.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Weather dataset is not yet available. This data source is coming soon.",
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

  // ── Historical weather ───────────────────────────────────────────────────

  server.registerTool(
    "get_weather_history",
    {
      title: "Get Weather History",
      description:
        "Get historical weather data for a location and date range. Returns hourly " +
        "observations including temperature, humidity, wind, precipitation, and " +
        "pressure. Source: NOAA ISD. Note: This dataset is coming soon.",
      inputSchema: {
        zip: z.string().optional().describe("US 5-digit ZIP code"),
        lat: z.number().min(-90).max(90).optional().describe("Latitude"),
        lon: z.number().min(-180).max(180).optional().describe("Longitude"),
        date_from: z
          .string()
          .describe("Start date (YYYY-MM-DD). Required."),
        date_to: z
          .string()
          .describe("End date (YYYY-MM-DD). Required."),
      },
    },
    async ({ zip, lat, lon, date_from, date_to }) => {
      if (!zip && (lat === undefined || lon === undefined)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Please provide either lat+lon or a ZIP code.",
            },
          ],
          isError: true,
        };
      }

      const res = await apiGet<WeatherResponse>("/api/v1/weather/history", {
        zip,
        lat,
        lon,
        date_from,
        date_to,
      });

      if (!res.ok) {
        if (res.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Weather dataset is not yet available. This data source is coming soon.",
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

      const data = res.data;
      const count = Array.isArray(data.data) ? data.data.length : 1;
      const summary = `Retrieved ${count} weather observation(s).`;

      return {
        content: [
          {
            type: "text" as const,
            text: `${summary}\n\n${JSON.stringify(data, null, 2)}`,
          },
        ],
      };
    },
  );

  // ── Forecast ─────────────────────────────────────────────────────────────

  server.registerTool(
    "get_weather_forecast",
    {
      title: "Get Weather Forecast",
      description:
        "Get weather forecast for a location, up to 16 days ahead. Returns hourly " +
        "or daily forecast data including temperature, humidity, wind, and precipitation " +
        "probability. Source: NOAA GFS model. Note: This dataset is coming soon.",
      inputSchema: {
        lat: z.number().min(-90).max(90).optional().describe("Latitude"),
        lon: z.number().min(-180).max(180).optional().describe("Longitude"),
        zip: z.string().optional().describe("US 5-digit ZIP code"),
      },
    },
    async ({ lat, lon, zip }) => {
      if (!zip && (lat === undefined || lon === undefined)) {
        return {
          content: [
            {
              type: "text" as const,
              text: "Please provide either lat+lon or a ZIP code.",
            },
          ],
          isError: true,
        };
      }

      const res = await apiGet<WeatherResponse>("/api/v1/weather/forecast", {
        lat,
        lon,
        zip,
      });

      if (!res.ok) {
        if (res.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Weather dataset is not yet available. This data source is coming soon.",
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
    "weather_stats",
    {
      title: "Weather Dataset Statistics",
      description:
        "Get statistics about the Weather dataset: stations covered, date range, " +
        "data sources, and last updated timestamp. Free endpoint.",
      inputSchema: {},
    },
    async () => {
      const res = await apiGet<WeatherStatsResponse>("/api/v1/weather/stats");

      if (!res.ok) {
        if (res.status === 404) {
          return {
            content: [
              {
                type: "text" as const,
                text: "Weather dataset is not yet available. This data source is coming soon.",
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
