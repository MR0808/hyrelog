/**
 * Local development server for HyreLog
 *
 * This is a mock server that simulates the HyreLog API locally.
 * It doesn't require the @hyrelog/node SDK - it's self-contained.
 */
export interface DevServerOptions {
    port: number;
    workspaceKey: string;
    showUI: boolean;
}
export declare function startDevServer(options: DevServerOptions): Promise<void>;
