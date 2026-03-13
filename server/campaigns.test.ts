import { describe, expect, it, beforeEach } from "vitest";
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

describe("Campaign Management", () => {
  it("creates a new campaign with archetype", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaign = await caller.campaigns.create({
      name: "Test Festival 2026",
      archetype: "festival",
    });

    expect(campaign).toBeDefined();
    expect(campaign.name).toBe("Test Festival 2026");
    expect(campaign.archetype).toBe("festival");
    expect(campaign.userId).toBe(ctx.user!.id);
    expect(campaign.status).toBe("draft");
  });

  it("lists campaigns for authenticated user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    // Create test campaigns
    await caller.campaigns.create({
      name: "Campaign 1",
      archetype: "club_night",
    });
    
    await caller.campaigns.create({
      name: "Campaign 2",
      archetype: "show",
    });

    const campaigns = await caller.campaigns.list();

    expect(campaigns.length).toBeGreaterThanOrEqual(2);
    expect(campaigns.every(c => c.userId === ctx.user!.id)).toBe(true);
  });

  it("gets campaign by ID with versions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaign = await caller.campaigns.create({
      name: "Test Campaign",
      archetype: "festival",
    });

    const result = await caller.campaigns.get({ id: campaign.id });

    expect(result.campaign).toBeDefined();
    expect(result.campaign.id).toBe(campaign.id);
    expect(result.versions).toBeDefined();
    expect(Array.isArray(result.versions)).toBe(true);
  });
});

describe("Campaign Version Management", () => {
  it("creates a campaign version with required fields", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaign = await caller.campaigns.create({
      name: "Test Event",
      archetype: "club_night",
    });

    const version = await caller.versions.create({
      campaignId: campaign.id,
      eventName: "Midnight Groove",
      eventStartDate: new Date("2026-06-15"),
      city: "Melbourne",
      primaryGenre: "Techno",
      headliners: ["DJ Shadow", "Bonobo"],
      brandColors: ["#0B0F1A", "#B21EFF", "#00E5FF"],
      tone: "underground",
      ctaPreference: "tickets",
      promotionalPlatforms: ["instagram", "facebook"],
      assetTypes: ["instagram_post", "instagram_story", "ticketing_banner"],
      ticketPhases: [],
    });

    expect(version).toBeDefined();
    expect(version.eventName).toBe("Midnight Groove");
    expect(version.primaryGenre).toBe("Techno");
    expect(version.brandColors).toEqual(["#0B0F1A", "#B21EFF", "#00E5FF"]);
    expect(version.versionNumber).toBe(1);
  });

  it("increments version number for subsequent versions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaign = await caller.campaigns.create({
      name: "Test Event",
      archetype: "festival",
    });

    const version1 = await caller.versions.create({
      campaignId: campaign.id,
      eventName: "Version 1",
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

    const version2 = await caller.versions.create({
      campaignId: campaign.id,
      eventName: "Version 2",
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

    expect(version1.versionNumber).toBe(1);
    expect(version2.versionNumber).toBe(2);
  });

  it("updates campaign currentVersionId when creating version", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);

    const campaign = await caller.campaigns.create({
      name: "Test Event",
      archetype: "show",
    });

    const version = await caller.versions.create({
      campaignId: campaign.id,
      eventName: "Test Version",
      eventStartDate: new Date("2026-06-15"),
      primaryGenre: "Rock",
      headliners: [],
      brandColors: ["#000000"],
      tone: "premium",
      ctaPreference: "tickets",
      promotionalPlatforms: ["instagram"],
      assetTypes: ["instagram_post"],
      ticketPhases: [],
    });

    const updatedCampaign = await db.getCampaignById(campaign.id);
    expect(updatedCampaign?.currentVersionId).toBe(version.id);
  });
});

describe("Authorization", () => {
  it("prevents accessing another user's campaign", async () => {
    const ctx1 = createAuthContext(1);
    const caller1 = appRouter.createCaller(ctx1);

    const campaign = await caller1.campaigns.create({
      name: "User 1 Campaign",
      archetype: "festival",
    });

    const ctx2 = createAuthContext(2);
    const caller2 = appRouter.createCaller(ctx2);

    await expect(
      caller2.campaigns.get({ id: campaign.id })
    ).rejects.toThrow("Campaign not found");
  });
});
