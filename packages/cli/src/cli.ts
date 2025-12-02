#!/usr/bin/env node

/**
 * HyreLog CLI
 * 
 * Main entry point for the CLI tool
 */

import { Command } from "commander";
import { loginCommand } from "./commands/login.js";
import { initCommand } from "./commands/init.js";
import { devCommand } from "./commands/dev.js";
import { tailCommand } from "./commands/tail.js";
import { testCommand } from "./commands/test.js";
import { exportCommand } from "./commands/export.js";
import { schemaCommand } from "./commands/schema.js";
import { keyCommand } from "./commands/key.js";

const program = new Command();

program
  .name("hyrelog")
  .description("HyreLog CLI - Development and management tools for HyreLog")
  .version("1.0.0");

// Authentication
program.addCommand(loginCommand);

// Project setup
program.addCommand(initCommand);

// Development
program.addCommand(devCommand);
program.addCommand(tailCommand);
program.addCommand(testCommand);

// Data management
program.addCommand(exportCommand);

// Schema registry
program.addCommand(schemaCommand);

// API key management
program.addCommand(keyCommand);

program.parse(process.argv);

