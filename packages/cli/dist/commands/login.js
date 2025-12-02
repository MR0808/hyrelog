/**
 * Login command
 * hyrelog login
 *
 * Note: HyreLog uses API key authentication. This command validates
 * and stores your API key (workspace or company key) for CLI use.
 */
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import { saveConfig, getConfig } from "../lib/config.js";
import { validateApiKey } from "../lib/auth.js";
export const loginCommand = new Command("login")
    .description("Validate and store your HyreLog API key")
    .option("-k, --key <key>", "API key (workspace or company key)")
    .option("-u, --url <url>", "Base URL for API (default: https://api.hyrelog.com, use http://localhost:4040 for local dev)")
    .action(async (options) => {
    const spinner = ora("Validating API key...").start();
    try {
        let apiKey = options.key;
        if (!apiKey) {
            spinner.stop();
            const answers = await inquirer.prompt([
                {
                    type: "password",
                    name: "apiKey",
                    message: "Enter your API key (workspace or company key):",
                    mask: "*",
                    validate: (input) => (input.length > 0 ? true : "API key is required"),
                },
            ]);
            apiKey = answers.apiKey;
            spinner.start("Validating API key...");
        }
        // Validate the API key
        const validation = await validateApiKey(apiKey, options.url);
        if (!validation.valid) {
            throw new Error(validation.error || "Invalid API key");
        }
        // Save API key to config
        const config = getConfig();
        config.apiKey = apiKey;
        config.baseUrl = options.url;
        saveConfig(config);
        spinner.succeed(chalk.green("Successfully authenticated!"));
        console.log(chalk.gray(`API key type: ${validation.type}`));
        console.log(chalk.gray(`Saved to: ${config.configPath}`));
        console.log(chalk.yellow("\nNote: Use 'hyrelog init' to set up project-specific workspace/company keys."));
    }
    catch (error) {
        spinner.fail(chalk.red("Authentication failed"));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        console.error(chalk.gray("\nMake sure you have a valid workspace or company API key."));
        console.error(chalk.gray("You can create API keys in your HyreLog dashboard."));
        process.exit(1);
    }
});
