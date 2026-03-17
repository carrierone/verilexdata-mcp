#!/usr/bin/env node

// Verilex Data MCP Server
// Exposes NPI, SEC, PACER, Weather, OTC, Trademarks, Patents,
// Company Intelligence, Crypto Intelligence, Sanctions, Whales,
// Labels, Holders, DEX, Government Contracts, Polymarket,
// Economic Indicators, and more datasets as MCP tools
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

const server = new McpServer({
  name: "verilex-data",
  version: "0.3.0",
});

// Register all dataset tools
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

// Connect via stdio
const transport = new StdioServerTransport();
await server.connect(transport);
