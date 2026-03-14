/**
 * Aurex Cash Agent — Railway Web Server
  *
   * This is the public-facing server deployed on Railway.
    * It serves info/docs about the MCP agent.
     *
      * The MCP agent itself runs LOCALLY on each user's machine:
       *   npm install -g @aurexcash/agent
        *   aurex-agent setup        ← user enters THEIR OWN Aurex API key
         *   aurex-agent setup-mcp    ← connects to Claude Desktop
          *
           * No API keys are stored here. Each user manages their own credentials.
            */

            import { createServer } from "http";

            const PORT = process.env.PORT || 8080;

            const AGENT_INFO = {
              name: "Aurex Cash Agent",
                version: "2.1.0",
                  description: "AI agent that manages virtual Visa/Mastercard cards via Aurex. Works with Claude Desktop and Cursor via MCP.",
                    install: {
                        npm: "npm install -g @aurexcash/agent",
                            setup: "aurex-agent setup",
                                connect: "aurex-agent setup-mcp",
                                  },
                                    links: {
                                        homepage: "https://aurex.cash",
                                            npm: "https://www.npmjs.com/package/@aurexcash/agent",
                                                docs: "https://docs.aurex.cash",
                                                    github: "https://github.com/aurexcashagent/aurexcash-solana-agent",
                                                        twitter: "https://twitter.com/aurexcash",
                                                          },
                                                            tools: [
                                                                "aurex_balance",
                                                                    "aurex_create_card",
                                                                        "aurex_list_cards",
                                                                            "aurex_card_details",
                                                                                "aurex_topup_card",
                                                                                    "aurex_card_transactions",
                                                                                        "aurex_get_otp",
                                                                                            "aurex_calculate_fees",
                                                                                              ],
                                                                                                mcp: {
                                                                                                    transport: "stdio",
                                                                                                        protocol: "MCP 1.x",
                                                                                                            compatible: ["Claude Desktop", "Cursor", "any MCP client"],
                                                                                                              },
                                                                                                              };
                                                                                                              
                                                                                                              function handler(req, res) {
                                                                                                                const url = new URL(req.url, `http://localhost`);
                                                                                                                
                                                                                                                  // CORS
                                                                                                                    res.setHeader("Access-Control-Allow-Origin", "*");
                                                                                                                      res.setHeader("Content-Type", "application/json");
                                                                                                                      
                                                                                                                        if (url.pathname === "/health") {
                                                                                                                            return res.end(JSON.stringify({ ok: true, uptime: process.uptime() }));
                                                                                                                              }
                                                                                                                              
                                                                                                                                if (url.pathname === "/info" || url.pathname === "/") {
                                                                                                                                    return res.end(JSON.stringify({ ok: true, agent: AGENT_INFO }, null, 2));
                                                                                                                                      }
                                                                                                                                      
                                                                                                                                        if (url.pathname === "/install") {
                                                                                                                                            return res.end(JSON.stringify({
                                                                                                                                                  ok: true,
                                                                                                                                                        quickstart: [
                                                                                                                                                                "npm install -g @aurexcash/agent",
                                                                                                                                                                        "aurex-agent setup",
                                                                                                                                                                                "aurex-agent setup-mcp",
                                                                                                                                                                                        "# Restart Claude Desktop",
                                                                                                                                                                                                "# Then: 'Check my Aurex balance'",
                                                                                                                                                                                                      ],
                                                                                                                                                                                                          }, null, 2));
                                                                                                                                                                                                            }
                                                                                                                                                                                                            
                                                                                                                                                                                                              res.statusCode = 404;
                                                                                                                                                                                                                res.end(JSON.stringify({ ok: false, error: "Not found", routes: ["/", "/health", "/info", "/install"] }));
                                                                                                                                                                                                                }
                                                                                                                                                                                                                
                                                                                                                                                                                                                createServer(handler).listen(PORT, () => {
                                                                                                                                                                                                                  console.log(`Aurex Cash Agent info server running on port ${PORT}`);
                                                                                                                                                                                                                    console.log(`  GET /        — agent info`);
                                                                                                                                                                                                                      console.log(`  GET /health  — health check`);
                                                                                                                                                                                                                        console.log(`  GET /install — quickstart guide`);
                                                                                                                                                                                                                          console.log(``);
                                                                                                                                                                                                                            console.log(`MCP agent is installed locally by each user:`);
                                                                                                                                                                                                                              console.log(`  npm install -g @aurexcash/agent`);
                                                                                                                                                                                                                                console.log(`  aurex-agent setup`);
                                                                                                                                                                                                                                });
