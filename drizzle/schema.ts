import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, json, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Campaigns table - root entity for event campaigns
 */
export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  
  // Current active version
  currentVersionId: int("currentVersionId"),
  
  // Basic metadata
  name: varchar("name", { length: 255 }).notNull(),
  archetype: mysqlEnum("archetype", ["club_night", "festival", "show"]).notNull(),
  
  // Status
  status: mysqlEnum("status", ["draft", "generating", "completed", "archived"]).default("draft").notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = typeof campaigns.$inferInsert;

/**
 * Campaign versions - allows iteration and rollback
 */
export const campaignVersions = mysqlTable("campaignVersions", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  versionNumber: int("versionNumber").notNull(), // 1, 2, 3...
  
  // Event details
  eventName: varchar("eventName", { length: 255 }).notNull(),
  eventStartDate: timestamp("eventStartDate").notNull(),
  eventEndDate: timestamp("eventEndDate"),
  startTime: varchar("startTime", { length: 20 }),
  endTime: varchar("endTime", { length: 20 }),
  city: varchar("city", { length: 100 }),
  venue: varchar("venue", { length: 255 }),
  
  // Genre and vibe
  primaryGenre: varchar("primaryGenre", { length: 100 }).notNull(),
  subGenres: json("subGenres").$type<string[]>(),
  vibeKeywords: json("vibeKeywords").$type<string[]>(), // ["energetic", "underground", "euphoric"]
  
  // Artist and lineup
  headliners: json("headliners").$type<string[]>().notNull(),
  supportLineup: json("supportLineup").$type<string[]>(),
  billingOrder: mysqlEnum("billingOrder", ["headliner_prominent", "equal"]).default("headliner_prominent"),
  
  // Branding
  brandColors: json("brandColors").$type<string[]>().notNull(),
  logoUrl: text("logoUrl"),
  logoKey: text("logoKey"),
  sponsorLogos: json("sponsorLogos").$type<Array<{ url: string; key: string; name: string }>>(),
  venueLogoUrl: text("venueLogoUrl"),
  venueLogoKey: text("venueLogoKey"),
  mustIncludeText: text("mustIncludeText"), // Age limit, sponsors, etc.
  
  // Copy and CTA
  tone: mysqlEnum("tone", ["hype", "premium", "underground", "family_friendly"]).notNull(),
  ctaPreference: mysqlEnum("ctaPreference", ["tickets", "rsvp", "register"]).notNull(),
  includeHashtags: boolean("includeHashtags").default(true),
  includePresentedBy: boolean("includePresentedBy").default(false),
  presentedByText: varchar("presentedByText", { length: 255 }),
  
  // Platforms and asset pack
  promotionalPlatforms: json("promotionalPlatforms").$type<string[]>().notNull(),
  assetTypes: json("assetTypes").$type<string[]>().notNull(), // ["instagram_post", "instagram_story", etc.]
  
  // Ticket phases
  ticketPhases: json("ticketPhases").$type<Array<{
    name: string;
    dateRange: { start: string; end: string };
    price?: string;
  }>>().notNull(),
  
  // Milestones
  milestones: json("milestones").$type<Array<{
    type: string; // "headliner_announcement", "venue_reveal", "lineup_drop", "set_times", "final_call"
    date?: string;
    enabled: boolean;
  }>>(),
  
  // Layout preferences
  layoutPreference: mysqlEnum("layoutPreference", ["ai_decide", "text_heavy", "image_heavy", "balanced"]).default("ai_decide"),
  artistPhotoUsage: mysqlEnum("artistPhotoUsage", ["high", "medium", "none"]).default("medium"),
  sponsorLockup: mysqlEnum("sponsorLockup", ["footer", "corner", "none"]).default("footer"),
  safeZoneStrictness: mysqlEnum("safeZoneStrictness", ["strict", "moderate", "relaxed"]).default("moderate"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignVersion = typeof campaignVersions.$inferSelect;
export type InsertCampaignVersion = typeof campaignVersions.$inferInsert;

/**
 * Campaign DNA versions - visual identity system with deterministic tokens
 */
export const campaignDNAVersions = mysqlTable("campaignDNAVersions", {
  id: int("id").autoincrement().primaryKey(),
  campaignVersionId: int("campaignVersionId").notNull().unique(),
  
  // Raw LLM output (human-readable, descriptive)
  raw: json("raw").$type<{
    moodDescriptors: string[];
    references: string[];
    motifSuggestions: string[];
    typographyStyleSuggestions: string[];
    compositionGuidance: Record<string, string>; // per platform
    doNots: string[];
  }>().notNull(),
  
  // Deterministic design tokens (machine-readable)
  tokens: json("tokens").$type<{
    palette: {
      primary: string;
      secondary: string;
      accent: string;
      background: string;
      text: string;
    };
    typography: {
      headlineFont: string;
      bodyFont: string;
      scale: { h1: number; h2: number; h3: number; body: number };
      tracking: { headline: number; body: number };
      style: string;
    };
    spacing: {
      unit: number; // base spacing unit in px
      scale: number[]; // [4, 8, 16, 24, 32, 48, 64]
    };
    layout: {
      density: "tight" | "medium" | "spacious";
      safeZonePct: number; // 0.05 = 5% margin
      logoZone: "header" | "footer" | "corner";
      ctaStyle: "pill" | "sharp" | "outline";
    };
    imagery: {
      style: string; // "neon-noir", "minimal", "maximalist"
      grain: "none" | "low" | "medium" | "high";
      lighting: "flat" | "high-contrast" | "dramatic";
      avoid: string[];
    };
    visualMotifs: string[];
    emotionalTone: string;
  }>().notNull(),
  
  // Master prompt for consistent generation
  basePrompt: text("basePrompt").notNull(),
  styleModifiers: json("styleModifiers").$type<string[]>(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CampaignDNAVersion = typeof campaignDNAVersions.$inferSelect;
export type InsertCampaignDNAVersion = typeof campaignDNAVersions.$inferInsert;

/**
 * Copy variants - generated headlines, CTAs, and platform-specific copy
 */
export const copyVariants = mysqlTable("copyVariants", {
  id: int("id").autoincrement().primaryKey(),
  campaignVersionId: int("campaignVersionId").notNull(),
  
  // Copy type
  copyType: mysqlEnum("copyType", ["headline", "cta", "body", "hashtags"]).notNull(),
  platform: varchar("platform", { length: 50 }), // "instagram", "facebook", null for generic
  ticketPhase: varchar("ticketPhase", { length: 100 }), // "early_bird", "final_release", null
  
  // Content
  content: text("content").notNull(),
  variant: int("variant").notNull(), // 1, 2, 3 for A/B/C testing
  
  // Selection
  isSelected: boolean("isSelected").default(false),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type CopyVariant = typeof copyVariants.$inferSelect;
export type InsertCopyVariant = typeof copyVariants.$inferInsert;

/**
 * Assets table - generated promotional materials
 */
export const assets = mysqlTable("assets", {
  id: int("id").autoincrement().primaryKey(),
  campaignVersionId: int("campaignVersionId").notNull(),
  
  // Asset metadata
  assetType: mysqlEnum("assetType", [
    "instagram_post",
    "instagram_story", 
    "facebook_ad",
    "facebook_banner",
    "ticketing_banner",
    "website_banner",
    "flyer_a4",
    "flyer_a3"
  ]).notNull(),
  
  // Storage
  assetUrl: text("assetUrl").notNull(),
  assetKey: text("assetKey").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  
  // Specifications
  width: int("width").notNull(),
  height: int("height").notNull(),
  format: varchar("format", { length: 20 }).notNull(),
  
  // Generation context
  generatedFrom: mysqlEnum("generatedFrom", ["option_selection", "batch_generation", "regeneration"]).notNull(),
  selectedOptionId: int("selectedOptionId"), // References asset_options.id
  
  // Attribution
  sourceAttribution: text("sourceAttribution"), // "spotify", "user-upload", "generated"
  usageRightsConfirmed: boolean("usageRightsConfirmed").default(false),
  creditsRequired: text("creditsRequired"),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Asset = typeof assets.$inferSelect;
export type InsertAsset = typeof assets.$inferInsert;

/**
 * Asset options - A/B options for user selection
 */
export const assetOptions = mysqlTable("assetOptions", {
  id: int("id").autoincrement().primaryKey(),
  campaignVersionId: int("campaignVersionId").notNull(),
  assetType: varchar("assetType", { length: 50 }).notNull(),
  
  // Engine used
  generationEngine: mysqlEnum("generationEngine", ["structured", "generative"]).notNull(),
  
  // Storage
  assetUrl: text("assetUrl").notNull(),
  assetKey: text("assetKey").notNull(),
  thumbnailUrl: text("thumbnailUrl"),
  
  // Specifications
  width: int("width").notNull(),
  height: int("height").notNull(),
  format: varchar("format", { length: 20 }).notNull(),
  
  // Generation details
  promptUsed: text("promptUsed"),
  templateId: varchar("templateId", { length: 100 }), // For structured engine
  
  // Selection
  isSelected: boolean("isSelected").default(false),
  optionLabel: varchar("optionLabel", { length: 10 }).notNull(), // "A", "B"
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AssetOption = typeof assetOptions.$inferSelect;
export type InsertAssetOption = typeof assetOptions.$inferInsert;

/**
 * Uploads table - user-uploaded files tracking
 */
export const uploads = mysqlTable("uploads", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  campaignId: int("campaignId"),
  
  // File metadata
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileSize: int("fileSize").notNull(), // bytes
  mimeType: varchar("mimeType", { length: 100 }).notNull(),
  
  // Storage
  fileUrl: text("fileUrl").notNull(),
  fileKey: text("fileKey").notNull(),
  
  // Purpose
  purpose: mysqlEnum("purpose", ["logo", "sponsor_logo", "venue_logo", "artist_photo", "other"]).notNull(),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Upload = typeof uploads.$inferSelect;
export type InsertUpload = typeof uploads.$inferInsert;

/**
 * Jobs table - batch generation queue
 */
export const jobs = mysqlTable("jobs", {
  id: int("id").autoincrement().primaryKey(),
  
  // Job identification
  jobType: mysqlEnum("jobType", [
    "GENERATE_CAMPAIGN_DNA",
    "GENERATE_COPY_VARIANTS",
    "GENERATE_ASSET_OPTIONS",
    "RENDER_TEMPLATE",
    "GENERATE_FINAL_ASSETS",
    "EXPORT_ZIP"
  ]).notNull(),
  
  // Related entities
  campaignId: int("campaignId"),
  campaignVersionId: int("campaignVersionId"),
  
  // Job data
  payload: json("payload").$type<Record<string, any>>().notNull(),
  result: json("result").$type<Record<string, any>>(),
  
  // Status
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed", "retrying"]).default("pending").notNull(),
  progress: int("progress").default(0), // 0-100
  errorMessage: text("errorMessage"),
  
  // Retry logic
  retries: int("retries").default(0),
  maxRetries: int("maxRetries").default(3),
  
  // Timing
  startedAt: timestamp("startedAt"),
  completedAt: timestamp("completedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Job = typeof jobs.$inferSelect;
export type InsertJob = typeof jobs.$inferInsert;

/**
 * Linked sources table - future brand ingestion (Spotify, Ticketmaster, etc.)
 */
export const linkedSources = mysqlTable("linkedSources", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  
  // Source details
  provider: mysqlEnum("provider", ["spotify", "ticketmaster", "bandsintown", "soundcloud", "custom"]).notNull(),
  sourceUrl: text("sourceUrl").notNull(),
  
  // Auth tokens (encrypted in production)
  accessToken: text("accessToken"),
  refreshToken: text("refreshToken"),
  tokenExpiresAt: timestamp("tokenExpiresAt"),
  
  // Sync status
  lastSyncedAt: timestamp("lastSyncedAt"),
  syncEnabled: boolean("syncEnabled").default(true),
  
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type LinkedSource = typeof linkedSources.$inferSelect;
export type InsertLinkedSource = typeof linkedSources.$inferInsert;
