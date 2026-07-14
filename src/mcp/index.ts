#!/usr/bin/env bun
/**
 * MarkTask MCP Server — stdio-based local server.
 * Thin adapter: wires MCP protocol to the shared TaskService.
 * stdout is JSON-RPC only; all logging goes to stderr.
 *
 * Usage: bun src/mcp/index.ts
 * Or via MCP client config pointing to this file.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import { loadConfig } from '../core/config.js';
import { resolvePaths } from '../core/config.js';
import { TaskRepository } from '../core/repository.js';
import { TaskService } from '../core/task-service.js';
import { TOOL_DEFS, dispatchTool } from './handlers.js';

/**
 * Bootstrap and run the MCP server.
 */
async function main(): Promise<void> {
  // Build service (same init path as CLI)
  const configResult = loadConfig();
  if (!configResult.ok) {
    process.stderr.write(`[marktask-mcp] Config error: ${configResult.error.message}\n`);
    process.exit(1);
  }

  const paths = resolvePaths(configResult.value, process.cwd());
  const repo = new TaskRepository(paths);
  repo.ensureDirs();
  const service = new TaskService(repo);

  // Create MCP server
  const server = new Server(
    { name: 'marktask', version: '0.1.0' },
    { capabilities: { tools: {} } },
  );

  // Register ListTools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOL_DEFS,
  }));

  // Register CallTool handler
  server.setRequestHandler(CallToolRequestSchema, async (req) => {
    const result = await dispatchTool(
      service,
      req.params.name,
      req.params.arguments,
    );
    return {
      content: [{ type: 'text', text: JSON.stringify(result) }],
    };
  });

  // Connect via stdio transport
  const transport = new StdioServerTransport();
  await server.connect(transport);

  process.stderr.write('[marktask-mcp] Server ready (stdio)\n');
}

main().catch((e: unknown) => {
  process.stderr.write(
    `[marktask-mcp] Fatal: ${e instanceof Error ? e.message : String(e)}\n`,
  );
  process.exit(1);
});
