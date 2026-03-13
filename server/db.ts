import { eq, desc, and } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, 
  users,
  campaigns,
  Campaign,
  InsertCampaign,
  campaignVersions,
  CampaignVersion,
  InsertCampaignVersion,
  campaignDNAVersions,
  CampaignDNAVersion,
  InsertCampaignDNAVersion,
  copyVariants,
  CopyVariant,
  InsertCopyVariant,
  assets,
  Asset,
  InsertAsset,
  assetOptions,
  AssetOption,
  InsertAssetOption,
  uploads,
  Upload,
  InsertUpload,
  jobs,
  Job,
  InsertJob,
  linkedSources,
  LinkedSource,
  InsertLinkedSource
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================
// User Operations
// ============================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

// ============================================
// Campaign Operations
// ============================================

export async function createCampaign(campaign: InsertCampaign): Promise<Campaign> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(campaigns).values(campaign);
  const insertedId = Number(result[0].insertId);
  
  const created = await db.select().from(campaigns).where(eq(campaigns.id, insertedId)).limit(1);
  if (!created[0]) throw new Error("Failed to retrieve created campaign");
  
  return created[0];
}

export async function getCampaignById(id: number): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  return result[0];
}

export async function getCampaignsByUserId(userId: number): Promise<Campaign[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(campaigns)
    .where(eq(campaigns.userId, userId))
    .orderBy(desc(campaigns.updatedAt));
}

export async function getAllCampaigns(): Promise<Campaign[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(campaigns)
    .orderBy(desc(campaigns.updatedAt));
}

export async function updateCampaign(id: number, updates: Partial<InsertCampaign>): Promise<Campaign | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(campaigns).set(updates).where(eq(campaigns.id, id));
  
  return getCampaignById(id);
}

export async function deleteCampaign(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Get all versions
  const versions = await db.select().from(campaignVersions).where(eq(campaignVersions.campaignId, id));
  
  // Delete related records for each version
  for (const version of versions) {
    await db.delete(copyVariants).where(eq(copyVariants.campaignVersionId, version.id));
    await db.delete(assets).where(eq(assets.campaignVersionId, version.id));
    await db.delete(assetOptions).where(eq(assetOptions.campaignVersionId, version.id));
    await db.delete(campaignDNAVersions).where(eq(campaignDNAVersions.campaignVersionId, version.id));
  }
  
  await db.delete(campaignVersions).where(eq(campaignVersions.campaignId, id));
  await db.delete(uploads).where(eq(uploads.campaignId, id));
  await db.delete(linkedSources).where(eq(linkedSources.campaignId, id));
  await db.delete(jobs).where(eq(jobs.campaignId, id));
  await db.delete(campaigns).where(eq(campaigns.id, id));
}

// ============================================
// Campaign Version Operations
// ============================================

export async function createCampaignVersion(version: InsertCampaignVersion): Promise<CampaignVersion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(campaignVersions).values(version);
  const insertedId = Number(result[0].insertId);
  
  const created = await db.select().from(campaignVersions).where(eq(campaignVersions.id, insertedId)).limit(1);
  if (!created[0]) throw new Error("Failed to retrieve created campaign version");
  
  return created[0];
}

export async function getCampaignVersionById(id: number): Promise<CampaignVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(campaignVersions).where(eq(campaignVersions.id, id)).limit(1);
  return result[0];
}

export async function getCampaignVersionsByCampaignId(campaignId: number): Promise<CampaignVersion[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(campaignVersions)
    .where(eq(campaignVersions.campaignId, campaignId))
    .orderBy(desc(campaignVersions.versionNumber));
}

export async function getLatestCampaignVersion(campaignId: number): Promise<CampaignVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(campaignVersions)
    .where(eq(campaignVersions.campaignId, campaignId))
    .orderBy(desc(campaignVersions.versionNumber))
    .limit(1);
  
  return result[0];
}

// ============================================
// Campaign DNA Version Operations
// ============================================

export async function createCampaignDNAVersion(dna: InsertCampaignDNAVersion): Promise<CampaignDNAVersion> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  // Check if DNA already exists for this version
  const existing = await getCampaignDNAByVersionId(dna.campaignVersionId);
  
  // Explicitly serialize JSON fields for MySQL compatibility
  const serializedDna = {
    ...dna,
    raw: JSON.stringify(dna.raw),
    tokens: JSON.stringify(dna.tokens),
    styleModifiers: JSON.stringify(dna.styleModifiers),
  };

  if (existing) {
    // Update existing DNA
    await db.update(campaignDNAVersions)
      .set(serializedDna as any)
      .where(eq(campaignDNAVersions.id, existing.id));
    
    const updated = await db.select().from(campaignDNAVersions).where(eq(campaignDNAVersions.id, existing.id)).limit(1);
    if (!updated[0]) throw new Error("Failed to retrieve updated DNA version");
    return updated[0];
  } else {
    // Insert new DNA
    const result = await db.insert(campaignDNAVersions).values(serializedDna as any);
    const insertedId = Number(result[0].insertId);
    
    const created = await db.select().from(campaignDNAVersions).where(eq(campaignDNAVersions.id, insertedId)).limit(1);
    if (!created[0]) throw new Error("Failed to retrieve created DNA version");
    
    return created[0];
  }
}

export async function getCampaignDNAByVersionId(campaignVersionId: number): Promise<CampaignDNAVersion | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(campaignDNAVersions)
    .where(eq(campaignDNAVersions.campaignVersionId, campaignVersionId))
    .limit(1);
  
  if (!result[0]) return undefined;
  
  // Parse JSON fields if they're strings
  const dna = result[0];
  return {
    ...dna,
    raw: typeof dna.raw === 'string' ? JSON.parse(dna.raw) : dna.raw,
    tokens: typeof dna.tokens === 'string' ? JSON.parse(dna.tokens) : dna.tokens,
    styleModifiers: typeof dna.styleModifiers === 'string' ? JSON.parse(dna.styleModifiers) : dna.styleModifiers,
  } as CampaignDNAVersion;
}

// ============================================
// Copy Variant Operations
// ============================================

export async function createCopyVariant(copy: InsertCopyVariant): Promise<CopyVariant> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(copyVariants).values(copy);
  const insertedId = Number(result[0].insertId);
  
  const created = await db.select().from(copyVariants).where(eq(copyVariants.id, insertedId)).limit(1);
  if (!created[0]) throw new Error("Failed to retrieve created copy variant");
  
  return created[0];
}

export async function getCopyVariantsByVersionId(campaignVersionId: number): Promise<CopyVariant[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(copyVariants)
    .where(eq(copyVariants.campaignVersionId, campaignVersionId))
    .orderBy(desc(copyVariants.createdAt));
}

export async function selectCopyVariant(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(copyVariants).set({ isSelected: true }).where(eq(copyVariants.id, id));
}

// ============================================
// Asset Operations
// ============================================

export async function createAsset(asset: InsertAsset): Promise<Asset> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(assets).values(asset);
  const insertedId = Number(result[0].insertId);
  
  const created = await db.select().from(assets).where(eq(assets.id, insertedId)).limit(1);
  if (!created[0]) throw new Error("Failed to retrieve created asset");
  
  return created[0];
}

export async function getAssetsByVersionId(campaignVersionId: number): Promise<Asset[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(assets)
    .where(eq(assets.campaignVersionId, campaignVersionId))
    .orderBy(desc(assets.createdAt));
}

// ============================================
// Asset Option Operations
// ============================================

export async function createAssetOption(option: InsertAssetOption): Promise<AssetOption> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(assetOptions).values(option);
  const insertedId = Number(result[0].insertId);
  
  const created = await db.select().from(assetOptions).where(eq(assetOptions.id, insertedId)).limit(1);
  if (!created[0]) throw new Error("Failed to retrieve created asset option");
  
  return created[0];
}

export async function getAssetOptionsByVersionId(campaignVersionId: number): Promise<AssetOption[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(assetOptions)
    .where(eq(assetOptions.campaignVersionId, campaignVersionId))
    .orderBy(desc(assetOptions.createdAt));
}

export async function selectAssetOption(id: number): Promise<void> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(assetOptions).set({ isSelected: true }).where(eq(assetOptions.id, id));
}

// ============================================
// Upload Operations
// ============================================

export async function createUpload(upload: InsertUpload): Promise<Upload> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(uploads).values(upload);
  const insertedId = Number(result[0].insertId);
  
  const created = await db.select().from(uploads).where(eq(uploads.id, insertedId)).limit(1);
  if (!created[0]) throw new Error("Failed to retrieve created upload");
  
  return created[0];
}

export async function getUploadsByUserId(userId: number): Promise<Upload[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(uploads)
    .where(eq(uploads.userId, userId))
    .orderBy(desc(uploads.createdAt));
}

export async function getAllUploads(): Promise<Upload[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(uploads)
    .orderBy(desc(uploads.createdAt));
}

// ============================================
// Job Operations
// ============================================

export async function createJob(job: InsertJob): Promise<Job> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const result = await db.insert(jobs).values(job);
  const insertedId = Number(result[0].insertId);
  
  const created = await db.select().from(jobs).where(eq(jobs.id, insertedId)).limit(1);
  if (!created[0]) throw new Error("Failed to retrieve created job");
  
  return created[0];
}

export async function getJobById(id: number): Promise<Job | undefined> {
  const db = await getDb();
  if (!db) return undefined;

  const result = await db.select().from(jobs).where(eq(jobs.id, id)).limit(1);
  return result[0];
}

export async function getPendingJobs(): Promise<Job[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(jobs)
    .where(eq(jobs.status, "pending"))
    .orderBy(jobs.createdAt);
}

export async function updateJob(id: number, updates: Partial<InsertJob>): Promise<Job | undefined> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  await db.update(jobs).set(updates).where(eq(jobs.id, id));
  
  return getJobById(id);
}

export async function getJobsByCampaignVersionId(campaignVersionId: number): Promise<Job[]> {
  const db = await getDb();
  if (!db) return [];

  return db.select().from(jobs)
    .where(eq(jobs.campaignVersionId, campaignVersionId))
    .orderBy(desc(jobs.createdAt));
}
