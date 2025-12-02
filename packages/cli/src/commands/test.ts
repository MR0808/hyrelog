/**
 * Test command
 * hyrelog test
 */

import { Command } from "commander";
import chalk from "chalk";
import { loadProjectConfig } from "../lib/config.js";

async function getFetch(): Promise<typeof fetch> {
  if (typeof fetch !== "undefined") {
    return fetch;
  }
  const nodeFetch = await import("node-fetch");
  // Cast through unknown to handle type differences between native fetch and node-fetch
  return nodeFetch.default as unknown as typeof fetch;
}

export const testCommand = new Command("test")
  .description("Test event ingestion with mock client")
  .option("-c, --count <count>", "Number of test events to send", "10")
  .action(async (options) => {
    try {
      const config = loadProjectConfig();
      const count = parseInt(options.count, 10);

      if (!config.workspaceKey) {
        console.error(chalk.red("No workspace key found. Run 'hyrelog init' first."));
        process.exit(1);
      }

      console.log(chalk.blue(`Sending ${count} test events...`));

      const fetchFn = await getFetch();
      const baseUrl = config.baseUrl || "https://api.hyrelog.com";

      for (let i = 0; i < count; i++) {
        try {
          const response = await fetchFn(`${baseUrl}/v1/key/workspace/events`, {
            method: "POST",
            headers: {
              "x-hyrelog-key": config.workspaceKey,
              "content-type": "application/json",
            },
            body: JSON.stringify({
              action: `test.event.${i}`,
              category: "test",
              actor: {
                id: `test-user-${i}`,
                email: `test${i}@example.com`,
                name: `Test User ${i}`,
              },
              payload: {
                index: i,
                timestamp: new Date().toISOString(),
              },
            }),
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${await response.text()}`);
          }

          process.stdout.write(".");
        } catch (error) {
          console.error(chalk.red(`\nFailed to send event ${i + 1}:`));
          console.error(chalk.red(error instanceof Error ? error.message : String(error)));
          process.exit(1);
        }
      }

      console.log(chalk.green(`\n✅ Successfully sent ${count} test events`));
    } catch (error) {
      console.error(chalk.red("Failed to send test events:"));
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    }
  });

