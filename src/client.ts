// HTTP client for the Verilex API server.
// All MCP tools delegate to the API — this keeps the MCP server
// stateless and avoids duplicating DuckDB/PostgreSQL logic.

const DEFAULT_BASE_URL = "https://api.verilexdata.com";

const baseUrl = process.env.VERILEX_API_URL ?? DEFAULT_BASE_URL;

/** Build a full URL from a path and optional query parameters. */
function buildUrl(
  path: string,
  params?: Record<string, string | number | undefined>,
): string {
  const url = new URL(path, baseUrl);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      if (v !== undefined && v !== "") {
        url.searchParams.set(k, String(v));
      }
    }
  }
  return url.toString();
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  status: number;
  data: T;
}

/** Make a GET request to the Verilex API and return parsed JSON. */
export async function apiGet<T = unknown>(
  path: string,
  params?: Record<string, string | number | undefined>,
): Promise<ApiResponse<T>> {
  const url = buildUrl(path, params);

  const headers: Record<string, string> = {
    Accept: "application/json",
    "User-Agent": "verilex-mcp-server/0.1.0",
  };

  // Forward x402 payment token if present in env (for paid endpoints)
  const paymentToken = process.env.VERILEX_PAYMENT_TOKEN;
  if (paymentToken) {
    headers["X-Payment-Token"] = paymentToken;
  }

  const res = await fetch(url, { headers });
  const data = (await res.json()) as T;

  return {
    ok: res.ok,
    status: res.status,
    data,
  };
}
