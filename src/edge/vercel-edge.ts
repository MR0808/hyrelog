/**
 * Vercel Edge Function for event ingestion
 * Phase 4: Edge Ingestion Endpoints
 * 
 * Deploy to: api/ingest.ts (or similar)
 */

import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Handle CORS
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-hyrelog-key");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const apiKey = req.headers["x-hyrelog-key"] as string;
    if (!apiKey) {
      return res.status(401).json({ error: "API key required" });
    }

    // Get geo metadata from Vercel
    const country = req.headers["x-vercel-ip-country"] as string || "unknown";
    const city = req.headers["x-vercel-ip-city"] as string || "unknown";
    const region = req.headers["x-vercel-ip-country-region"] as string || "unknown";

    // Enhance event with geo metadata
    const enhancedBody = {
      ...req.body,
      metadata: {
        ...req.body.metadata,
        _edge: {
          provider: "vercel",
          country,
          city,
          region,
        },
      },
    };

    // Forward to primary API
    const apiUrl = process.env.HYRELOG_API_URL || "https://api.hyrelog.com";
    const response = await fetch(`${apiUrl}/v1/key/workspace/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-hyrelog-key": apiKey,
      },
      body: JSON.stringify(enhancedBody),
    });

    const data = await response.json();

    return res.status(response.status).json(data);
  } catch (error) {
    return res.status(500).json({
      error: "Internal server error",
      message: error instanceof Error ? error.message : String(error),
    });
  }
}

