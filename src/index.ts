#!/usr/bin/env node

// Verilex Data MCP Server
// Exposes NPI, SEC, PACER, Weather, and OTC datasets as MCP tools
// for use in Claude Desktop, VS Code, Cursor, and other MCP clients.
//
// Transport: stdio (spawned by the MCP client as a child process)
// Data source: Verilex API (HTTP) — configurable via VERILEX_API_URL env var

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { registerNpiTools } from "./tools/npi.js";
import { registerSecTools } from "./tools/sec.js";
import { registerPacerTools } from "./tools/pacer.js";
import { registerWeatherTools } from "./tools/weather.js";
import { registerOtcTools } from "./tools/otc.js";

const server = new McpServer({
  name: "verilex-data",
  version: "0.1.0",
});

// Register all dataset tools
registerNpiTools(server);
registerSecTools(server);
registerPacerTools(server);
registerWeatherTools(server);
registerOtcTools(server);

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
