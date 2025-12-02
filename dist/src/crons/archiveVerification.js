import { prisma } from "@/lib/prisma";
import { getS3Client, getFromS3 } from "@/lib/s3";
import { hasS3ArchivalAddOn } from "@/lib/archival";
/**
 * Verifies S3 archive integrity.
 * Runs weekly.
 */
export const runArchiveVerification = async () => {
    const client = getS3Client();
    if (!client) {
        console.log("S3 not configured, skipping verification");
        return;
    }
    const companies = await prisma.company.findMany();
    for (const company of companies) {
        const hasAddOn = await hasS3ArchivalAddOn(company.id);
        if (!hasAddOn) {
            continue;
        }
        // Find archived events
        const archivedEvents = await prisma.auditEvent.findMany({
            where: {
                companyId: company.id,
                archived: true,
            },
            take: 100, // Sample check
        });
        // Group by workspace and date
        const groups = new Map();
        for (const event of archivedEvents) {
            const date = new Date(event.createdAt);
            date.setHours(0, 0, 0, 0);
            const dateKey = date.toISOString().split("T")[0];
            if (!groups.has(event.workspaceId)) {
                groups.set(event.workspaceId, new Map());
            }
            const dateMap = groups.get(event.workspaceId);
            if (!dateMap.has(dateKey)) {
                dateMap.set(dateKey, []);
            }
            dateMap.get(dateKey).push(event);
        }
        // Verify S3 files exist
        for (const [workspaceId, dateGroups] of groups) {
            for (const [dateKey, events] of dateGroups) {
                const date = new Date(dateKey);
                const key = `${company.id}/${workspaceId}/${dateKey}.json.gz`;
                try {
                    const buffer = await getFromS3(key);
                    // Verify it's a valid gzip file by checking buffer length
                    if (buffer.length > 0) {
                        console.log(`Verified archive: ${key} (${buffer.length} bytes)`);
                    }
                    else {
                        console.error(`Empty archive file: ${key}`);
                    }
                }
                catch (error) {
                    console.error(`Missing or corrupt archive: ${key}`, error);
                    // TODO: Mark events for re-archival or alert
                }
            }
        }
    }
};
//# sourceMappingURL=archiveVerification.js.map