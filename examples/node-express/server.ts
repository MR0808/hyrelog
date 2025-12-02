/**
 * Express.js example with HyreLog integration
 */

import express from "express";
import dotenv from "dotenv";
import { hyrelogMiddleware } from "@hyrelog/node/adapters";
import { HyreLogWorkspaceClient } from "@hyrelog/node";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

// JSON middleware
app.use(express.json());

// HyreLog middleware - automatically logs all requests
app.use(
  hyrelogMiddleware({
    workspaceKey: process.env.HYRELOG_WORKSPACE_KEY!,
    baseUrl: process.env.HYRELOG_BASE_URL || "https://api.hyrelog.com",
    getActor: (req) => {
      // Extract actor from request (e.g., from session, JWT, etc.)
      const userId = (req as any).user?.id;
      const userEmail = (req as any).user?.email;
      if (userId || userEmail) {
        return {
          id: userId,
          email: userEmail,
        };
      }
      return null;
    },
    getProjectId: (req) => {
      // Extract project ID from request if available
      return (req as any).projectId || null;
    },
  })
);

// Example: Get users
app.get("/api/users", async (req, res) => {
  const client = (req as any).hyrelog as HyreLogWorkspaceClient;

  // Log custom event
  await client.logEvent({
    action: "users.list",
    category: "api",
    actor: {
      id: (req as any).user?.id,
      email: (req as any).user?.email,
    },
    payload: {
      filter: req.query.filter,
    },
  });

  const users = [
    { id: "1", name: "John Doe", email: "john@example.com" },
    { id: "2", name: "Jane Smith", email: "jane@example.com" },
  ];

  res.json({ users });
});

// Example: Create user
app.post("/api/users", async (req, res) => {
  const client = (req as any).hyrelog as HyreLogWorkspaceClient;

  try {
    const { name, email } = req.body;

    // Log creation event with changes tracking
    await client.logEvent({
      action: "user.created",
      category: "api",
      actor: {
        id: (req as any).user?.id,
        email: (req as any).user?.email,
      },
      payload: {
        name,
        email,
      },
      changes: [
        {
          field: "status",
          old: null,
          new: "active",
        },
      ],
    });

    const user = {
      id: Date.now().toString(),
      name,
      email,
      createdAt: new Date().toISOString(),
    };

    res.status(201).json({ user });
  } catch (error) {
    // Error is automatically logged by middleware
    res.status(500).json({ error: "Failed to create user" });
  }
});

// Example: Update user
app.put("/api/users/:id", async (req, res) => {
  const client = (req as any).hyrelog as HyreLogWorkspaceClient;

  try {
    const { id } = req.params;
    const { name, email } = req.body;

    // Log update event with changes
    await client.logEvent({
      action: "user.updated",
      category: "api",
      actor: {
        id: (req as any).user?.id,
        email: (req as any).user?.email,
      },
      payload: {
        userId: id,
      },
      changes: [
        ...(name ? [{ field: "name", old: "Old Name", new: name }] : []),
        ...(email ? [{ field: "email", old: "old@example.com", new: email }] : []),
      ],
    });

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to update user" });
  }
});

// Health check (excluded from logging)
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.listen(port, () => {
  console.log(`🚀 Express server running on http://localhost:${port}`);
  console.log(`📊 HyreLog events will be logged to ${process.env.HYRELOG_BASE_URL}`);
});

