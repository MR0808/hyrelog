import type { FastifyPluginAsync } from "fastify";
import { ApiKeyType } from "@prisma/client";
import { z } from "zod";

import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { prisma } from "@/lib/prisma";
import { getS3Client, generateArchiveKey, getFromS3 } from "@/lib/s3";
import { hasS3ArchivalAddOn } from "@/lib/archival";
import { gunzip } from "node:zlib";
import { promisify } from "node:util";

const archiveQuerySchema = z.object({
  from: z.string().optional(),
  to: z.string().optional(),
  workspaceId: z.string().optional(),
});

const gunzipAsync = promisify(gunzip);

export const keyCompanyArchiveRoutes: FastifyPluginAsync = async (app) => {
  app.get("/v1/key/company/export-archive.json", async (request, reply) => {
    const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });

    const hasAddOn = await hasS3ArchivalAddOn(ctx.company.id);
    if (!hasAddOn) {
      throw reply.forbidden("S3 archival add-on required");
    }

    const client = getS3Client();
    if (!client) {
      throw reply.internalServerError("S3 not configured");
    }

    const queryParams = archiveQuerySchema.parse(request.query);
    
    let from: Date | undefined;
    let to: Date | undefined;
    
    if (queryParams.from) {
      from = new Date(queryParams.from);
      if (isNaN(from.getTime())) {
        throw reply.badRequest(`Invalid 'from' date format: ${queryParams.from}. Use ISO 8601 format (e.g., 2024-01-01)`);
      }
    }
    
    if (queryParams.to) {
      to = new Date(queryParams.to);
      if (isNaN(to.getTime())) {
        throw reply.badRequest(`Invalid 'to' date format: ${queryParams.to}. Use ISO 8601 format (e.g., 2024-12-31)`);
      }
    }
    
    const workspaceId = queryParams.workspaceId;

    // Get workspaces
    const workspaces = workspaceId
      ? await prisma.workspace.findMany({
          where: {
            id: workspaceId,
            companyId: ctx.company.id,
          },
        })
      : await prisma.workspace.findMany({
          where: {
            companyId: ctx.company.id,
          },
        });

    // Validate date range BEFORE setting headers
    // Default to last year if no date range specified
    const defaultFrom = new Date();
    defaultFrom.setFullYear(defaultFrom.getFullYear() - 1);
    defaultFrom.setHours(0, 0, 0, 0);

    const startDate = from ?? defaultFrom;
    const endDate = to ?? new Date();

    // Validate date range
    if (startDate > endDate) {
      throw reply.badRequest(`Start date (${startDate.toISOString()}) must be before end date (${endDate.toISOString()})`);
    }

    // Limit date range to prevent excessive iterations (max 2 years)
    const maxDays = 730; // 2 years
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff > maxDays) {
      throw reply.badRequest(`Date range too large. Maximum ${maxDays} days (2 years) allowed. Your range is ${daysDiff} days.`);
    }

    // Now set headers after validation
    reply.header("Content-Type", "application/json");
    reply.header("Content-Disposition", `attachment; filename="hyrelog-archive-${Date.now()}.json"`);

    reply.raw.write("[\n");

    let first = true;

    // Stream archived events from S3
    for (const workspace of workspaces) {

      // Iterate through date range
      const currentDate = new Date(startDate);
      currentDate.setHours(0, 0, 0, 0);

      let filesFound = 0;
      while (currentDate <= endDate) {
        const key = generateArchiveKey(ctx.company.id, workspace.id, currentDate);

        try {
          // getFromS3 returns a Buffer containing gzipped data
          const compressedBuffer = await getFromS3(key);
          const decompressed = await gunzipAsync(compressedBuffer);
          const events = JSON.parse(decompressed.toString()) as Array<Record<string, unknown>>;

          filesFound++;
          for (const event of events) {
            if (!first) {
              reply.raw.write(",\n");
            }
            first = false;
            reply.raw.write(JSON.stringify(event));
          }
        } catch (error: unknown) {
          // Skip missing files silently
          const s3Error = error as { Code?: string; code?: string; name?: string };
          if (s3Error.Code !== "NoSuchKey" && s3Error.code !== "NoSuchKey" && s3Error.name !== "NoSuchKey") {
            console.error(`Error reading archive ${key}:`, error);
            // Don't throw - continue processing other files
          }
        }

        currentDate.setDate(currentDate.getDate() + 1);
      }

      if (filesFound === 0) {
        app.log.warn(`No archived files found for workspace ${workspace.id} in date range ${startDate.toISOString()} to ${endDate.toISOString()}`);
      }
    }

    reply.raw.write("\n]");
    reply.raw.end();
  });
};

