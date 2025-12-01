import { ApiKeyType, BillingMeterType } from "@prisma/client";
import { authenticateApiKey } from "@/lib/apiKeyAuth";
import { prisma } from "@/lib/prisma";
export const keyCompanyUsageRoutes = async (app) => {
    app.get("/v1/key/company/usage", async (request, reply) => {
        const ctx = await authenticateApiKey(request, { allow: [ApiKeyType.COMPANY] });
        const now = new Date();
        const meter = await prisma.billingMeter.findFirst({
            where: {
                companyId: ctx.company.id,
                meterType: BillingMeterType.EVENTS,
                periodStart: { lte: now },
                periodEnd: { gt: now },
            },
            orderBy: { periodEnd: "desc" },
        });
        if (!meter) {
            throw reply.notFound("No billing meter configured");
        }
        const aggregate = await prisma.usageStats.aggregate({
            where: {
                companyId: ctx.company.id,
                periodStart: meter.periodStart,
                periodEnd: meter.periodEnd,
            },
            _sum: {
                eventsIngested: true,
                eventsQueried: true,
            },
        });
        const usage = {
            periodStart: meter.periodStart,
            periodEnd: meter.periodEnd,
            eventsIngested: aggregate._sum.eventsIngested ?? 0,
            eventsQueried: aggregate._sum.eventsQueried ?? 0,
        };
        return {
            meter,
            usage,
        };
    });
};
//# sourceMappingURL=key.company.usage.js.map