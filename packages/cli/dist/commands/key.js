/**
 * Key management commands
 * hyrelog key create/rotate/revoke
 */
import { Command } from "commander";
import chalk from "chalk";
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
const keyCommand = new Command("key")
    .description("Manage API keys")
    .alias("keys");
keyCommand
    .command("create")
    .description("Create a new API key")
    .option("-t, --type <type>", "Key type: workspace, company", "workspace")
    .option("-n, --name <name>", "Key name")
    .option("-w, --workspace-id <id>", "Workspace ID (for workspace keys)")
    .action(async (options) => {
    try {
        const config = loadProjectConfig();
        if (!config.companyKey) {
            console.error(chalk.red("Company key required. Set it in .hyrelogrc.json"));
            process.exit(1);
        }
        console.log(chalk.blue("Creating API key..."));
        const fetchFn = await getFetch();
        const baseUrl = config.baseUrl || "https://api.hyrelog.com";
        const response = await fetchFn(`${baseUrl}/v1/key/company/keys`, {
            method: "POST",
            headers: {
                "x-hyrelog-key": config.companyKey,
                "content-type": "application/json",
            },
            body: JSON.stringify({
                type: options.type.toUpperCase(),
                name: options.name || `CLI Generated ${new Date().toISOString()}`,
                workspaceId: options.workspaceId || undefined,
            }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to create key: ${response.statusText} - ${error}`);
        }
        const data = await response.json();
        console.log(chalk.green("✅ API key created successfully"));
        console.log(chalk.yellow("\n⚠️  Save this key securely - it won't be shown again!"));
        console.log(chalk.gray(`Key ID: ${data.id}`));
        console.log(chalk.gray(`Key: ${data.key}`));
    }
    catch (error) {
        console.error(chalk.red("Failed to create key:"));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
});
keyCommand
    .command("rotate")
    .description("Rotate an API key")
    .argument("<key-id>", "Key ID to rotate")
    .action(async (keyId) => {
    try {
        const config = loadProjectConfig();
        if (!config.companyKey) {
            console.error(chalk.red("Company key required. Set it in .hyrelogrc.json"));
            process.exit(1);
        }
        console.log(chalk.blue(`Rotating key ${keyId}...`));
        const fetchFn = await getFetch();
        const baseUrl = config.baseUrl || "https://api.hyrelog.com";
        const response = await fetchFn(`${baseUrl}/v1/key/rotate`, {
            method: "POST",
            headers: {
                "x-hyrelog-key": config.companyKey,
                "content-type": "application/json",
            },
            body: JSON.stringify({ keyId }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to rotate key: ${response.statusText} - ${error}`);
        }
        const data = await response.json();
        console.log(chalk.green("✅ Key rotated successfully"));
        console.log(chalk.yellow("\n⚠️  Save this key securely - it won't be shown again!"));
        console.log(chalk.gray(`New Key: ${data.key}`));
    }
    catch (error) {
        console.error(chalk.red("Failed to rotate key:"));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
});
keyCommand
    .command("revoke")
    .description("Revoke an API key")
    .argument("<key-id>", "Key ID to revoke")
    .action(async (keyId) => {
    try {
        const config = loadProjectConfig();
        if (!config.companyKey) {
            console.error(chalk.red("Company key required. Set it in .hyrelogrc.json"));
            process.exit(1);
        }
        console.log(chalk.blue(`Revoking key ${keyId}...`));
        const fetchFn = await getFetch();
        const baseUrl = config.baseUrl || "https://api.hyrelog.com";
        const response = await fetchFn(`${baseUrl}/v1/key/revoke`, {
            method: "POST",
            headers: {
                "x-hyrelog-key": config.companyKey,
                "content-type": "application/json",
            },
            body: JSON.stringify({ keyId }),
        });
        if (!response.ok) {
            const error = await response.text();
            throw new Error(`Failed to revoke key: ${response.statusText} - ${error}`);
        }
        console.log(chalk.green("✅ Key revoked successfully"));
    }
    catch (error) {
        console.error(chalk.red("Failed to revoke key:"));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
});
export { keyCommand };
