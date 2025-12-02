import { PrismaClient, Region } from "@prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { prisma } from "@/lib/prisma";

/**
 * Cache of Prisma clients per region.
 */
const regionClients = new Map<Region, PrismaClient>();

/**
 * Cache of region data store records.
 */
let regionDataStoreCache: Array<{
  region: Region;
  dbUrl: string;
  readOnlyUrl: string | null;
  coldStorageProvider: string;
  coldStorageBucket: string;
}> | null = null;

/**
 * Loads region data store records from the database.
 */
async function loadRegionDataStore(): Promise<void> {
  const stores = await prisma.regionDataStore.findMany();
  regionDataStoreCache = stores.map((store) => ({
    region: store.region,
    dbUrl: store.dbUrl,
    readOnlyUrl: store.readOnlyUrl,
    coldStorageProvider: store.coldStorageProvider,
    coldStorageBucket: store.coldStorageBucket,
  }));
}

/**
 * Gets the Prisma client for a specific region.
 * Creates the client if it doesn't exist.
 */
export async function getPrismaForRegion(region: Region): Promise<PrismaClient> {
  // Load region data store if not cached
  if (!regionDataStoreCache) {
    await loadRegionDataStore();
  }

  // Check cache first
  if (regionClients.has(region)) {
    return regionClients.get(region)!;
  }

  // Find region data store
  const store = regionDataStoreCache!.find((s) => s.region === region);
  if (!store) {
    throw new Error(`Region data store not found for region: ${region}`);
  }

  // Create Prisma client for this region
  const pool = new Pool({ connectionString: store.dbUrl });
  const adapter = new PrismaPg(pool);
  const client = new PrismaClient({ adapter });

  // Cache it
  regionClients.set(region, client);

  return client;
}

/**
 * Gets the region for a company.
 * Defaults to AU if not set.
 */
export async function getRegionForCompany(companyId: string): Promise<Region> {
  const company = await prisma.company.findUnique({
    where: { id: companyId },
    select: { dataRegion: true },
  });

  if (!company) {
    throw new Error(`Company not found: ${companyId}`);
  }

  return company.dataRegion;
}

/**
 * Gets the Prisma client for a company's region.
 */
export async function getPrismaForCompany(companyId: string): Promise<PrismaClient> {
  const region = await getRegionForCompany(companyId);
  return getPrismaForRegion(region);
}

/**
 * Gets cold storage client configuration for a region.
 */
export async function getColdStorageClientForRegion(region: Region): Promise<{
  provider: string;
  bucket: string;
}> {
  // Load region data store if not cached
  if (!regionDataStoreCache) {
    await loadRegionDataStore();
  }

  const store = regionDataStoreCache!.find((s) => s.region === region);
  if (!store) {
    throw new Error(`Region data store not found for region: ${region}`);
  }

  return {
    provider: store.coldStorageProvider,
    bucket: store.coldStorageBucket,
  };
}

/**
 * Gets all configured regions.
 */
export async function getAllRegions(): Promise<Region[]> {
  if (!regionDataStoreCache) {
    await loadRegionDataStore();
  }

  return regionDataStoreCache!.map((s) => s.region);
}

/**
 * Invalidates the region data store cache.
 * Call this after updating RegionDataStore records.
 */
export function invalidateRegionCache(): void {
  regionDataStoreCache = null;
}

/**
 * Closes all region Prisma clients.
 * Call this during graceful shutdown.
 */
export async function closeAllRegionClients(): Promise<void> {
  await Promise.all(
    Array.from(regionClients.values()).map((client) => client.$disconnect()),
  );
  regionClients.clear();
}

