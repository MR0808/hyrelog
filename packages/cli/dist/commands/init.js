/**
 * Init command
 * hyrelog init
 */
import { Command } from "commander";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fs from "fs";
import path from "path";
export const initCommand = new Command("init")
    .description("Initialize a new HyreLog project")
    .option("-w, --workspace-key <key>", "Workspace API key")
    .option("-c, --company-key <key>", "Company API key")
    .action(async (options) => {
    const spinner = ora("Initializing project...").start();
    try {
        let workspaceKey = options.workspaceKey;
        let companyKey = options.companyKey;
        if (!workspaceKey || !companyKey) {
            spinner.stop();
            const answers = await inquirer.prompt([
                {
                    type: "input",
                    name: "workspaceKey",
                    message: "Workspace API Key:",
                    default: workspaceKey,
                    when: !workspaceKey,
                    validate: (input) => (input.length > 0 ? true : "Workspace key is required"),
                },
                {
                    type: "input",
                    name: "companyKey",
                    message: "Company API Key (optional):",
                    default: companyKey,
                    when: !companyKey,
                },
            ]);
            workspaceKey = workspaceKey || answers.workspaceKey;
            companyKey = companyKey || answers.companyKey;
        }
        // Create .hyrelogrc.json
        const configPath = path.join(process.cwd(), ".hyrelogrc.json");
        const config = {
            workspaceKey,
            companyKey: companyKey || undefined,
            baseUrl: process.env.HYRELOG_BASE_URL || "https://api.hyrelog.com",
        };
        fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
        spinner.succeed(chalk.green("Project initialized!"));
        console.log(chalk.gray(`Configuration saved to ${configPath}`));
        console.log(chalk.yellow("\nNext steps:"));
        console.log(chalk.gray("  - Run 'hyrelog dev' to start the local simulator"));
        console.log(chalk.gray("  - Run 'hyrelog tail' to tail events in real-time"));
    }
    catch (error) {
        spinner.fail(chalk.red("Initialization failed"));
        console.error(chalk.red(error instanceof Error ? error.message : String(error)));
        process.exit(1);
    }
});
