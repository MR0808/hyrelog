/**
 * Configuration management for CLI
 */

import fs from "fs";
import path from "path";
import os from "os";

export interface ProjectConfig {
  workspaceKey?: string;
  companyKey?: string;
  baseUrl?: string;
}

export interface GlobalConfig {
  apiKey?: string; // Global API key for CLI operations
  baseUrl?: string;
  configPath: string;
}

const CONFIG_DIR = path.join(os.homedir(), ".hyrelog");
const GLOBAL_CONFIG_PATH = path.join(CONFIG_DIR, "config.json");

/**
 * Get global config
 */
export function getConfig(): GlobalConfig {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  if (!fs.existsSync(GLOBAL_CONFIG_PATH)) {
    return { configPath: GLOBAL_CONFIG_PATH };
  }

  try {
    const content = fs.readFileSync(GLOBAL_CONFIG_PATH, "utf-8");
    return { ...JSON.parse(content), configPath: GLOBAL_CONFIG_PATH };
  } catch {
    return { configPath: GLOBAL_CONFIG_PATH };
  }
}

/**
 * Save global config
 */
export function saveConfig(config: GlobalConfig): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  fs.writeFileSync(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2));
}

/**
 * Load project config from .hyrelogrc.json
 */
export function loadProjectConfig(): ProjectConfig {
  const configPath = path.join(process.cwd(), ".hyrelogrc.json");

  if (!fs.existsSync(configPath)) {
    return {
      baseUrl: process.env.HYRELOG_BASE_URL || "https://api.hyrelog.com",
    };
  }

  try {
    const content = fs.readFileSync(configPath, "utf-8");
    const config = JSON.parse(content) as ProjectConfig;
    return {
      baseUrl: process.env.HYRELOG_BASE_URL || config.baseUrl || "https://api.hyrelog.com",
      ...config,
    };
  } catch {
    return {
      baseUrl: process.env.HYRELOG_BASE_URL || "https://api.hyrelog.com",
    };
  }
}

