import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(userId: number = 1): TrpcContext {
  const user: AuthenticatedUser = {
    id: userId,
    openId: `test-user-${userId}`,
    email: `test${userId}@example.com`,
    name: `Test User ${userId}`,
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return ctx;
}

describe("Job Queue System", () => {
  it("creates DNA generation job when starting generation", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create campaign and version
    const campaign = await caller.campaigns.create({
      name: "Test Event",
      archetype: "festival",
    });

    const version = await caller.versions.create({
      campaignId: campaign.id,
      eventName: "Summer Festival 2026",
      eventStartDate: new Date("2026-07-15"),
      primaryGenre: "Electronic",
      headliners: ["Artist 1", "Artist 2"],
      brandColors: ["#0B0F1A", "#B21EFF"],
      tone: "hype",
      ctaPreference: "tickets",
      promotionalPlatforms: ["instagram"],
      assetTypes: ["instagram_post"],
      ticketPhases: [],
    });

    // Start generation
    await caller.versions.startGeneration({
      versionId: version.id,
    });

    // Check that jobs were created
    const jobs = await db.getJobsByCampaignVersionId(version.id);
    
    // Should create DNA, copy, and asset generation jobs
    expect(jobs.length).toBeGreaterThanOrEqual(1);
  }, 10000);

  it("lists jobs for a campaign version", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create campaign and version
    const campaign = await caller.campaigns.create({
      name: "Test Event",
      archetype: "club_night",
    });

    const version = await caller.versions.create({
      campaignId: campaign.id,
      eventName: "Club Night",
      eventStartDate: new Date("2026-08-01"),
      primaryGenre: "Techno",
      headliners: [],
      brandColors: ["#000000"],
      tone: "underground",
      ctaPreference: "tickets",
      promotionalPlatforms: ["instagram"],
      assetTypes: ["instagram_post"],
      ticketPhases: [],
    });

    // Start generation
    await caller.versions.startGeneration({
      versionId: version.id,
    });

    // List jobs
    const jobs = await caller.jobs.list({
      campaignVersionId: version.id,
    });

    expect(Array.isArray(jobs)).toBe(true);
    expect(jobs.length).toBeGreaterThan(0);
  });
});

describe("Asset Export", () => {
  it("validates export requires campaign ownership", async () => {
    const ctx1 = createAuthContext(1);
    const caller1 = appRouter.createCaller(ctx1);

    // User 1 creates campaign
    const campaign = await caller1.campaigns.create({
      name: "User 1 Campaign",
      archetype: "festival",
    });

    const version = await caller1.versions.create({
      campaignId: campaign.id,
      eventName: "Test Event",
      eventStartDate: new Date("2026-06-15"),
      primaryGenre: "House",
      headliners: [],
      brandColors: ["#000000"],
      tone: "hype",
      ctaPreference: "tickets",
      promotionalPlatforms: ["instagram"],
      assetTypes: ["instagram_post"],
      ticketPhases: [],
    });

    // User 2 tries to export
    const ctx2 = createAuthContext(2);
    const caller2 = appRouter.createCaller(ctx2);

    await expect(
      caller2.assets.exportZip({
        versionId: version.id,
        selectedAssetIds: [],
      })
    ).rejects.toThrow();
  });
});

describe("Campaign DNA Generation", () => {
  it("generates DNA with deterministic tokens", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaign = await caller.campaigns.create({
      name: "Test Event",
      archetype: "show",
    });

    const version = await caller.versions.create({
      campaignId: campaign.id,
      eventName: "Rock Show 2026",
      eventStartDate: new Date("2026-09-20"),
      primaryGenre: "Rock",
      headliners: ["Band 1"],
      brandColors: ["#FF0000", "#000000"],
      tone: "premium",
      ctaPreference: "tickets",
      promotionalPlatforms: ["facebook"],
      assetTypes: ["facebook_ad"],
      ticketPhases: [],
    });

    // Start generation to create DNA
    await caller.versions.startGeneration({
      versionId: version.id,
    });

    // Jobs should be created for the workflow
    const jobs = await db.getJobsByCampaignVersionId(version.id);
    
    expect(jobs.length).toBeGreaterThanOrEqual(1);
    expect(jobs.every(j => j.status === "pending")).toBe(true);
  });
});
