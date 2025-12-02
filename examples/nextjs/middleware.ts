/**
 * Next.js middleware for HyreLog
 * Automatically logs API requests and responses
 */

import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { hyrelogNextMiddleware } from "@hyrelog/node/adapters";

const hyrelogMiddleware = hyrelogNextMiddleware({
  workspaceKey: process.env.HYRELOG_WORKSPACE_KEY!,
  baseUrl: process.env.HYRELOG_BASE_URL || "https://api.hyrelog.com",
  excludePaths: ["/api/health", "/_next", "/favicon.ico"],
  getActor: (req) => {
    // Extract actor from session/cookie if available
    const userId = req.cookies.get("userId")?.value;
    const userEmail = req.cookies.get("userEmail")?.value;
    if (userId || userEmail) {
      return {
        id: userId,
        email: userEmail,
      };
    }
    return null;
  },
});

export function middleware(request: NextRequest) {
  return hyrelogMiddleware(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};

