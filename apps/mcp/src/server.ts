#!/usr/bin/env node
/*
  Workouts MCP server (stdio). Claude Code loads it from .mcp.json; Claude
  Desktop from claude_desktop_config.json (see `npm run mcp:desktop-config`).
  WORKOUTS_ROOT overrides the repo root, which defaults to this file's repo.
*/
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { WorkoutService } from '@workouts/core';
import { FsWorkoutRepository } from '@workouts/core/node';
import { createServer } from './tools.ts';

const root = process.env.WORKOUTS_ROOT ?? resolve(fileURLToPath(import.meta.url), '../../../..');
const server = createServer(new WorkoutService(new FsWorkoutRepository(root)), { root });
await server.connect(new StdioServerTransport());
