/**
 * Export command
 * hyrelog export
 */
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs";
import { loadProjectConfig } from "../lib/config.js";
async function getFetch() {
    if (typeof fetch !== "undefined") {
        return fetch;
    }
    const nodeFetch = await import("node-fetch");
    // Cast through unknown to handle type differences between native fetch and node-fetch
    return nodeFetch.default;
}
export const exportCommand = new Command("export")
    .description("Export events locally")
    .option("-f, --format <format>", "Export format: json, csv", "json")
    .option("-o, --output <file>", "Output file path", "hyrelog-export.json")
    .option("--from <date>", "Start date (ISO 8601)")
    .option("--to <date>", "End date (ISO 8601)")
    .option("--action <action>", "Filter by action")
    .option("--category <category>", "Filter by category")
    .action(async (options) => {
    try {
        const config = loadProjectConfig();
        if (!config.workspaceKey) {
            console.error(chalk.red("No workspace key found. Run 'hyrelog init' first."));
            process.exit(1);
        }
        const fetchFn = await getFetch();
        const baseUrl = config.baseUrl || "https://api.hyrelog.com";
        console.log(chalk.blue("Exporting events..."));
        const queryParams = new URLSearchParams();
        if (options.from)
            queryParams.set("from", options.from);
        if (options.to)
            queryParams.set("to", options.to);
        if (options.action)
            queryParams.set("action", options.action);
        if (options.category)
            queryParams.set("category", options.category);
        let allEvents = [];
        let page = 1;
        let hasMore = true;
        while (hasMore) {
            queryParams.set("page", page.toString());
            queryParams.set("limit", "100");
            const response = await fetchFn(`${baseUrl}/v1/key/workspace/events?${queryParams.toString()}`, {
                headers: {
                    "x-hyrelog-key": config.workspaceKey,
                },
            });
            if (!response.ok) {
                throw new Error(`Failed to fetch events: ${response.statusText}`);
            }
            const result = await response.json();
            allEvents = allEvents.concat(result.data);
            hasMore = result.pagination.page < result.pagination.totalPages;
            page++;
            process.stdout.write(`\rExported ${allEvents.length} events...`);
        }
        let output;
        if (options.format === "csv") {
            // Convert to CSV
            const headers = ["id", "action", "category", "actor.id", "actor.email", "createdAt"];
            const rows = allEvents.map((event) => [
                event.id,
                event.action,
                event.category,
                event.actor?.id || "",
                event.actor?.email || "",
                event.createdAt,
            ]);
            output = [headers.join(","), ...rows.map((row) => row.join(","))].join("\n");
        }
        else {
            output = JSON.stringify(allEvents, null, 2);
        }
        fs.writeFileSync(options.output, output);
        console.log(chalk.green(`\n✅ Exported ${allEvents.length} events to ${options.output}`));
    }
    catch (error) {
        console.error(chalk.red("Failed to export events:"));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
});
