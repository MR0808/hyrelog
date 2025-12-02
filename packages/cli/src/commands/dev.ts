/**
 * Dev command - Start local development simulator
 * hyrelog dev
 */

import { Command } from "commander";
import chalk from "chalk";
import { startDevServer } from "../lib/dev-server.js";
import { EventViewerTUI } from "../lib/tui.js";

export const devCommand = new Command("dev")
  .description("Start local HyreLog development simulator")
  .option("-p, --port <port>", "Port to run server on", "4040")
  .option("-k, --key <key>", "Workspace key to use", "dev-workspace-key")
  .option("--no-ui", "Disable TUI event viewer")
  .action(async (options) => {
    const port = parseInt(options.port, 10);
    const workspaceKey = options.key;
    const showUI = options.ui !== false;

    let tui: EventViewerTUI | undefined;

    if (showUI) {
      try {
        tui = new EventViewerTUI();
        console.log(chalk.green("\n✅ TUI Event Viewer started"));
        console.log(chalk.gray("   Press 'q' to quit, 'c' to clear events\n"));
      } catch (error) {
        console.warn(chalk.yellow("⚠️  Could not start TUI, falling back to console output"));
        console.warn(chalk.gray(error instanceof Error ? error.message : String(error)));
      }
    }

    try {
      await startDevServer({
        port,
        workspaceKey,
        showUI,
        tui,
      });
    } catch (error) {
      console.error(chalk.red("Failed to start dev server:"));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      if (tui) {
        tui.destroy();
      }
      process.exit(1);
    }
  });
