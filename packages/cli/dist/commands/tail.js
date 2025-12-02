/**
 * Tail command - Real-time event tailing via SSE
 * hyrelog tail
 */
import { Command } from "commander";
import chalk from "chalk";
import { loadProjectConfig } from "../lib/config.js";
export const tailCommand = new Command("tail")
    .description("Tail events in real-time via Server-Sent Events")
    .option("-w, --workspace-id <id>", "Workspace ID (optional)")
    .option("--format <format>", "Output format: json, pretty", "pretty")
    .action(async (options) => {
    try {
        const config = loadProjectConfig();
        if (!config.workspaceKey) {
            console.error(chalk.red("No workspace key found. Run 'hyrelog init' first."));
            process.exit(1);
        }
        const baseUrl = config.baseUrl || "https://api.hyrelog.com";
        const tailUrl = `${baseUrl}/v1/key/workspace/tail${options.workspaceId ? `?workspaceId=${options.workspaceId}` : ""}`;
        console.log(chalk.blue("Tailing events..."));
        console.log(chalk.gray("Press Ctrl+C to stop\n"));
        console.log(chalk.yellow("Note: Real-time tailing requires SSE endpoint support"));
        console.log(chalk.gray(`Endpoint: ${tailUrl}`));
        console.log(chalk.gray("\nSSE/WebSocket client implementation coming soon."));
        console.log(chalk.gray("For now, use 'hyrelog export' to fetch events."));
    }
    catch (error) {
        console.error(chalk.red("Failed to tail events:"));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
});
