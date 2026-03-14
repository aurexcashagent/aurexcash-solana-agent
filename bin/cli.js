#!/usr/bin/env node

/**
 * Aurex Cash Agent — CLI
 *
 * Commands:
 *   aurex-agent setup       Configure API key and User ID
 *   aurex-agent setup-mcp   Add to Claude Desktop MCP config
 *   aurex-agent run         Start MCP server directly
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { createInterface } from "readline";

const CONFIG_DIR = join(homedir(), ".aurex");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

function loadConfig() {
  if (!existsSync(CONFIG_FILE)) return {};
  return JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
}

function saveConfig(config) {
  if (!existsSync(CONFIG_DIR)) mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function prompt(question) {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function setup() {
  console.log("\n  Aurex Cash Agent Setup\n");

  const config = loadConfig();

  const apiKey = await prompt(
    `  Aurex API Key${config.apiKey ? ` [${config.apiKey.slice(0, 8)}...]` : ""}: `
  );
  const userId = await prompt(
    `  Aurex User ID${config.userId ? ` [${config.userId}]` : ""}: `
  );

  if (apiKey) config.apiKey = apiKey;
  if (userId) config.userId = userId;

  saveConfig(config);

  console.log(`\n  Config saved to ${CONFIG_FILE}`);
  console.log(`  Run 'aurex-agent setup-mcp' to connect to Claude Desktop.\n`);
}

async function setupMcp() {
  const config = loadConfig();

  if (!config.apiKey || !config.userId) {
    console.error("\n  Run 'aurex-agent setup' first to configure your keys.\n");
    process.exit(1);
  }

  // Find Claude Desktop config
  const platform = process.platform;
  let claudeConfigPath;

  if (platform === "darwin") {
    claudeConfigPath = join(
      homedir(),
      "Library",
      "Application Support",
      "Claude",
      "claude_desktop_config.json"
    );
  } else if (platform === "win32") {
    claudeConfigPath = join(
      process.env.APPDATA || "",
      "Claude",
      "claude_desktop_config.json"
    );
  } else {
    claudeConfigPath = join(
      homedir(),
      ".config",
      "Claude",
      "claude_desktop_config.json"
    );
  }

  let claudeConfig = {};
  if (existsSync(claudeConfigPath)) {
    claudeConfig = JSON.parse(readFileSync(claudeConfigPath, "utf-8"));
  }

  if (!claudeConfig.mcpServers) claudeConfig.mcpServers = {};

  claudeConfig.mcpServers["aurex-cash"] = {
    command: "npx",
    args: ["-y", "@aurexcash/agent"],
    env: {
      AUREX_API_KEY: config.apiKey,
      AUREX_USER_ID: config.userId,
    },
  };

  const configDir = join(claudeConfigPath, "..");
  if (!existsSync(configDir)) mkdirSync(configDir, { recursive: true });
  writeFileSync(claudeConfigPath, JSON.stringify(claudeConfig, null, 2));

  console.log("\n  Aurex Cash added to Claude Desktop.");
  console.log(`  Config: ${claudeConfigPath}`);
  console.log("\n  Restart Claude Desktop to activate.\n");
  console.log("  Then try: 'Check my Aurex balance'\n");
}

// ─── CLI Router ───

const command = process.argv[2];

switch (command) {
  case "setup":
    setup();
    break;
  case "setup-mcp":
    setupMcp();
    break;
  case "run":
    // Import and run the MCP server
    import("../index.js");
    break;
  default:
    console.log(`
  Aurex Cash Agent

  Commands:
    aurex-agent setup       Configure API key and User ID
    aurex-agent setup-mcp   Add to Claude Desktop / Cursor
    aurex-agent run         Start MCP server directly

  Usage with Claude Desktop:
    1. aurex-agent setup
    2. aurex-agent setup-mcp
    3. Restart Claude Desktop
    4. Ask Claude: "Check my Aurex balance"
`);
}
