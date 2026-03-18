#!/usr/bin/env node

// Verilex Data MCP Server
// Supports both stdio (spawned by MCP client) and HTTP (containerized / Glama)
// Set MCP_TRANSPORT=http to use HTTP mode (default port 3000)

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "node:http";

import { registerNpiTools } from "./tools/npi.js";
import { registerSecTools } from "./tools/sec.js";
import { registerPacerTools } from "./tools/pacer.js";
import { registerWeatherTools } from "./tools/weather.js";
import { registerOtcTools } from "./tools/otc.js";
import { registerTrademarkTools } from "./tools/trademarks.js";
import { registerPatentTools } from "./tools/patents.js";
import { registerCompanyTools } from "./tools/company.js";
import { registerCryptoTools } from "./tools/crypto.js";
import { registerSanctionsTools } from "./tools/sanctions.js";
import { registerWhaleTools } from "./tools/whales.js";
import { registerLabelTools } from "./tools/labels.js";
import { registerHolderTools } from "./tools/holders.js";
import { registerDexTools } from "./tools/dex.js";
import { registerContractTools } from "./tools/contracts.js";
import { registerPmTools } from "./tools/pm.js";
import { registerPmArbTools } from "./tools/pm_arb.js";
import { registerPmResolutionTools } from "./tools/pm_resolution.js";
import { registerEconTools } from "./tools/econ.js";
import { registerPmMicroTools } from "./tools/pm_micro.js";

function createMcpServer() {
  const server = new McpServer({
    name: "verilex-data",
    version: "0.3.3",
  });

  registerNpiTools(server);
  registerSecTools(server);
  registerPacerTools(server);
  registerWeatherTools(server);
  registerOtcTools(server);
  registerTrademarkTools(server);
  registerPatentTools(server);
  registerCompanyTools(server);
  registerCryptoTools(server);
  registerSanctionsTools(server);
  registerWhaleTools(server);
  registerLabelTools(server);
  registerHolderTools(server);
  registerDexTools(server);
  registerContractTools(server);
  registerPmTools(server);
  registerPmArbTools(server);
  registerPmResolutionTools(server);
  registerEconTools(server);
  registerPmMicroTools(server);

  return server;
}

const transport = process.env.MCP_TRANSPORT ?? (process.stdin.isTTY ? "http" : "stdio");

if (transport === "http") {
  const port = parseInt(process.env.PORT ?? "3000", 10);

  const httpTransport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  const server = createMcpServer();
  await server.connect(httpTransport);

  const httpServer = createServer((req, res) => {
    httpTransport.handleRequest(req, res);
  });

  httpServer.listen(port, () => {
    process.stderr.write(`Verilex MCP server listening on port ${port}
`);
  });
} else {
  const server = createMcpServer();
  const stdioTransport = new StdioServerTransport();
  await server.connect(stdioTransport);
}
