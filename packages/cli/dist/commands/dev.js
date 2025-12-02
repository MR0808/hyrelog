/**
 * Dev command - Local development simulator
 * hyrelog dev
 */
import { Command } from "commander";
import chalk from "chalk";
import { startDevServer } from "../lib/dev-server.js";
import { loadProjectConfig } from "../lib/config.js";
export const devCommand = new Command("dev")
    .description("Start local HyreLog ingestion simulator")
    .option("-p, --port <port>", "Port to run the simulator on", "4040")
    .option("--no-ui", "Disable TUI interface")
    .action(async (options) => {
    try {
        const config = loadProjectConfig();
        if (!config.workspaceKey) {
            console.error(chalk.red("No workspace key found. Run 'hyrelog init' first."));
            process.exit(1);
        }
        console.log(chalk.blue("Starting HyreLog local simulator..."));
        console.log(chalk.gray(`Port: ${options.port}`));
        console.log(chalk.gray(`Workspace Key: ${config.workspaceKey.substring(0, 10)}...`));
        console.log(chalk.yellow("\nPress Ctrl+C to stop\n"));
        await startDevServer({
            port: parseInt(options.port, 10),
            workspaceKey: config.workspaceKey,
            showUI: options.ui !== false,
        });
    }
    catch (error) {
        console.error(chalk.red("Failed to start dev server:"));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
});
