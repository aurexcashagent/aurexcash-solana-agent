#!/bin/bash
set -e

# Aurex Cash Agent — MCP Installer
# Usage: bash install-mcp.sh

echo ""
echo "  Aurex Cash Agent — MCP Setup"
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
  echo "  Error: Node.js 18+ is required."
    echo "  Install from: https://nodejs.org"
      exit 1
      fi

      NODE_VERSION=$(node -e "process.stdout.write(process.version.slice(1).split('.')[0])")
      if [ "$NODE_VERSION" -lt 18 ]; then
        echo "  Error: Node.js 18+ required (you have v${NODE_VERSION})"
          exit 1
          fi

          # Install the package
          echo "  Installing @aurexcash/agent..."
          npm install -g @aurexcash/agent

          echo ""
          echo "  Package installed."
          echo ""

          # Run interactive setup
          echo "  Running setup..."
          aurex-agent setup

          # Connect to Claude Desktop
          echo ""
          aurex-agent setup-mcp

          echo ""
          echo "  Done! Restart Claude Desktop and try:"
          echo "  'Check my Aurex balance'"
          echo ""
