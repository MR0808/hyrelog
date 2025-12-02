/**
 * Configuration management for CLI
 */
export interface ProjectConfig {
    workspaceKey?: string;
    companyKey?: string;
    baseUrl?: string;
}
export interface GlobalConfig {
    apiKey?: string;
    baseUrl?: string;
    configPath: string;
}
/**
 * Get global config
 */
export declare function getConfig(): GlobalConfig;
/**
 * Save global config
 */
export declare function saveConfig(config: GlobalConfig): void;
/**
 * Load project config from .hyrelogrc.json
 */
export declare function loadProjectConfig(): ProjectConfig;
