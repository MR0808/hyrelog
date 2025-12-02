/**
 * Local development server for HyreLog
 *
 * This is a mock server that simulates the HyreLog API locally.
 * It doesn't require the @hyrelog/node SDK - it's self-contained.
 */
import http from "http";
import chalk from "chalk";
class MockEventStore {
    events = [];
    nextId = 1;
    add(event) {
        const mockEvent = {
            ...event,
            id: `mock-${this.nextId++}`,
            createdAt: new Date().toISOString(),
        };
        this.events.push(mockEvent);
        return mockEvent;
    }
    getAll() {
        return [...this.events];
    }
    count() {
        return this.events.length;
    }
}
export async function startDevServer(options) {
    const store = new MockEventStore();
    const server = http.createServer(async (req, res) => {
        // CORS headers
        res.setHeader("Access-Control-Allow-Origin", "*");
        res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
        res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-hyrelog-key");
        if (req.method === "OPTIONS") {
            res.writeHead(200);
            res.end();
            return;
        }
        // Mock ingestion endpoint
        if (req.method === "POST" && req.url === "/v1/key/workspace/events") {
            let body = "";
            req.on("data", (chunk) => {
                body += chunk.toString();
            });
            req.on("end", async () => {
                try {
                    const event = JSON.parse(body);
                    const result = store.add({
                        action: event.action,
                        category: event.category,
                        actor: event.actor,
                        payload: event.payload,
                        metadata: event.metadata,
                    });
                    console.log(chalk.green("✓ Event ingested:"), chalk.gray(event.action));
                    res.writeHead(200, { "Content-Type": "application/json" });
                    res.end(JSON.stringify(result));
                }
                catch (error) {
                    res.writeHead(400, { "Content-Type": "application/json" });
                    res.end(JSON.stringify({ error: error instanceof Error ? error.message : String(error) }));
                }
            });
            return;
        }
        // Health check
        if (req.url === "/healthz") {
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ status: "ok" }));
            return;
        }
        // Default 404
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Not found" }));
    });
    return new Promise((resolve, reject) => {
        server.listen(options.port, () => {
            console.log(chalk.green(`\n✅ Dev server running on http://localhost:${options.port}`));
            console.log(chalk.gray("\nEndpoints:"));
            console.log(chalk.gray(`  POST http://localhost:${options.port}/v1/key/workspace/events`));
            console.log(chalk.gray(`  GET  http://localhost:${options.port}/healthz`));
            console.log(chalk.gray(`\nEvents stored in memory: ${store.count()}`));
            // Handle shutdown
            process.on("SIGINT", () => {
                console.log(chalk.yellow("\n\nShutting down dev server..."));
                server.close(() => {
                    console.log(chalk.green("✅ Dev server stopped"));
                    resolve();
                });
            });
        });
        server.on("error", (error) => {
            reject(error);
        });
    });
}
