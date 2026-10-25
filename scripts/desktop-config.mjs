// Prints the claude_desktop_config.json entry for the workouts MCP server,
// with absolute paths (Claude Desktop doesn't start in this repo or see your shell PATH).
// Pass --install to merge it into Claude Desktop's config (a backup is written first).
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const entry = {
  command: process.execPath,
  args: [join(root, 'node_modules/tsx/dist/cli.mjs'), join(root, 'apps/mcp/src/server.ts')],
  env: { WORKOUTS_ROOT: root },
};

if (!process.argv.includes('--install')) {
  console.log(JSON.stringify({ mcpServers: { workouts: entry } }, null, 2));
  console.log('\nAdd this to Claude Desktop → Settings → Developer → Edit Config, or rerun with --install.');
  process.exit(0);
}

const file = join(homedir(), 'Library/Application Support/Claude/claude_desktop_config.json');
const config = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
if (existsSync(file)) copyFileSync(file, `${file}.bak`);
config.mcpServers = { ...config.mcpServers, workouts: entry };
writeFileSync(file, JSON.stringify(config, null, 2) + '\n');
console.log(`Added "workouts" to ${file}${existsSync(`${file}.bak`) ? ' (backup: .bak)' : ''}. Restart Claude Desktop.`);
