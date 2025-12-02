/**
 * Schema command
 * hyrelog schema pull/push
 */
import { Command } from "commander";
import chalk from "chalk";
import fs from "fs";
import { loadProjectConfig } from "../lib/config.js";
// Use native fetch (Node 18+) or node-fetch fallback
async function getFetch() {
    if (typeof fetch !== "undefined") {
        return fetch;
    }
    const nodeFetch = await import("node-fetch");
    // Cast through unknown to handle type differences between native fetch and node-fetch
    return nodeFetch.default;
}
const schemaCommand = new Command("schema")
    .description("Manage event schemas")
    .alias("schemas");
schemaCommand
    .command("pull")
    .description("Pull schemas from workspace")
    .option("-o, --output <dir>", "Output directory", "./schemas")
    .action(async (options) => {
    try {
        const config = loadProjectConfig();
        if (!config.workspaceKey) {
            console.error(chalk.red("No workspace key found. Run 'hyrelog init' first."));
            process.exit(1);
        }
        console.log(chalk.blue("Pulling schemas..."));
        const fetchFn = await getFetch();
        const response = await fetchFn(`${config.baseUrl}/v1/key/workspace/schemas`, {
            headers: {
                "x-hyrelog-key": config.workspaceKey,
            },
        });
        if (!response.ok) {
            throw new Error(`Failed to fetch schemas: ${response.statusText}`);
        }
        const data = await response.json();
        if (!fs.existsSync(options.output)) {
            fs.mkdirSync(options.output, { recursive: true });
        }
        for (const schema of data.schemas) {
            const filename = `${schema.eventType.replace(/\./g, "-")}-v${schema.version}.json`;
            const filepath = `${options.output}/${filename}`;
            fs.writeFileSync(filepath, JSON.stringify(schema, null, 2));
            console.log(chalk.gray(`  ✓ ${filename}`));
        }
        console.log(chalk.green(`\n✅ Pulled ${data.schemas.length} schemas to ${options.output}`));
    }
    catch (error) {
        console.error(chalk.red("Failed to pull schemas:"));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
});
schemaCommand
    .command("push")
    .description("Push schema to workspace")
    .argument("<file>", "Schema file path")
    .action(async (file) => {
    try {
        const config = loadProjectConfig();
        if (!config.workspaceKey) {
            console.error(chalk.red("No workspace key found. Run 'hyrelog init' first."));
            process.exit(1);
        }
        if (!fs.existsSync(file)) {
            throw new Error(`Schema file not found: ${file}`);
        }
        const schema = JSON.parse(fs.readFileSync(file, "utf-8"));
        console.log(chalk.blue(`Pushing schema: ${schema.eventType} v${schema.version}...`));
        const fetchFn = await getFetch();
        const response = await fetchFn(`${config.baseUrl}/v1/key/workspace/schemas`, {
            method: "POST",
            headers: {
                "x-hyrelog-key": config.workspaceKey,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                eventType: schema.eventType,
                description: schema.description,
                jsonSchema: schema.jsonSchema,
                version: schema.version,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to push schema: ${response.statusText} - ${error}`);
        }
        console.log(chalk.green("✅ Schema pushed successfully"));
    }
    catch (error) {
        console.error(chalk.red("Failed to push schema:"));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
});
export { schemaCommand };
