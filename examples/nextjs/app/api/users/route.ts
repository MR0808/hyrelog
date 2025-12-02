/**
 * Example API route with HyreLog event logging
 */

import { NextRequest, NextResponse } from "next/server";
import { HyreLogWorkspaceClient } from "@hyrelog/node";

const client = new HyreLogWorkspaceClient({
  workspaceKey: process.env.HYRELOG_WORKSPACE_KEY!,
  baseUrl: process.env.HYRELOG_BASE_URL || "https://api.hyrelog.com",
});

export async function GET(request: NextRequest) {
  try {
    // Log the query event
    await client.logEvent({
      action: "users.list",
      category: "api",
      actor: {
        id: request.cookies.get("userId")?.value,
        email: request.cookies.get("userEmail")?.value,
      },
      payload: {
        method: "GET",
        endpoint: "/api/users",
      },
      metadata: {
        source: "nextjs-api",
        userAgent: request.headers.get("user-agent"),
      },
    });

    // Simulate fetching users
    const users = [
      { id: "1", name: "John Doe", email: "john@example.com" },
      { id: "2", name: "Jane Smith", email: "jane@example.com" },
    ];

    return NextResponse.json({ users });
  } catch (error) {
    // Log error event
    await client.logEvent({
      action: "users.list.error",
      category: "error",
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Log the creation event
    await client.logEvent({
      action: "user.created",
      category: "api",
      actor: {
        id: request.cookies.get("userId")?.value,
        email: request.cookies.get("userEmail")?.value,
      },
      payload: {
        userId: body.id,
        name: body.name,
        email: body.email,
      },
      metadata: {
        source: "nextjs-api",
      },
    });

    // Simulate creating user
    const user = {
      id: body.id || Date.now().toString(),
      name: body.name,
      email: body.email,
    };

    return NextResponse.json({ user }, { status: 201 });
  } catch (error) {
    await client.logEvent({
      action: "user.create.error",
      category: "error",
      payload: {
        error: error instanceof Error ? error.message : String(error),
      },
    });

    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

