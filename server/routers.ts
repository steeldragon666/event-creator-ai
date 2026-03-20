import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { generateCampaignDNA } from "./campaignDNA";
import { generateCopyVariants } from "./copyGeneration";
import { generateAssetOptions } from "./assetGeneration";
import { generateZipExport } from "./zipExport";
import { batchRouter } from "./routers/batch";

export const appRouter = router({
  system: systemRouter,
  batch: batchRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // Campaign management
  campaigns: router({
    // List all campaigns for current user
    list: publicProcedure.query(async ({ ctx }) => {
      // For demo mode, return all campaigns
      return db.getAllCampaigns();
    }),

    // Get campaign by ID with latest version
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign) {
          throw new Error("Campaign not found");
        }
        
        const latestVersion = await db.getLatestCampaignVersion(campaign.id);
        const versions = await db.getCampaignVersionsByCampaignId(campaign.id);
        
        return {
          campaign,
          latestVersion,
          versions
        };
      }),

    // Create new campaign
    create: publicProcedure
      .input(z.object({
        name: z.string(),
        archetype: z.enum(["club_night", "festival", "show"])
      }))
      .mutation(async ({ input, ctx }) => {
        const campaign = await db.createCampaign({
          userId: 1,
          name: input.name,
          archetype: input.archetype,
          status: "draft"
        });
        
        return campaign;
      }),

    // Update campaign
    update: publicProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().optional(),
        status: z.enum(["draft", "generating", "completed", "archived"]).optional()
      }))
      .mutation(async ({ input, ctx }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign ) {
          throw new Error("Campaign not found");
        }
        
        const { id, ...updates } = input;
        return db.updateCampaign(id, updates);
      }),

    // Delete campaign
    delete: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const campaign = await db.getCampaignById(input.id);
        if (!campaign ) {
          throw new Error("Campaign not found");
        }
        
        await db.deleteCampaign(input.id);
        return { success: true };
      }),
  }),

  // Campaign version management
  versions: router({
    // Create new campaign version
    create: publicProcedure
      .input(z.object({
        campaignId: z.number(),
        eventName: z.string(),
        eventStartDate: z.date(),
        eventEndDate: z.date().optional(),
        startTime: z.string().optional(),
        endTime: z.string().optional(),
        city: z.string().optional(),
        venue: z.string().optional(),
        primaryGenre: z.string(),
        subGenres: z.array(z.string()).optional(),
        vibeKeywords: z.array(z.string()).optional(),
        headliners: z.array(z.string()),
        supportLineup: z.array(z.string()).optional(),
        billingOrder: z.enum(["headliner_prominent", "equal"]).optional(),
        brandColors: z.array(z.string()),
        logoUrl: z.string().optional(),
        logoKey: z.string().optional(),
        sponsorLogos: z.array(z.object({
          url: z.string(),
          key: z.string(),
          name: z.string()
        })).optional(),
        venueLogoUrl: z.string().optional(),
        venueLogoKey: z.string().optional(),
        mustIncludeText: z.string().optional(),
        tone: z.enum(["hype", "premium", "underground", "family_friendly"]),
        ctaPreference: z.enum(["tickets", "rsvp", "register"]),
        includeHashtags: z.boolean().optional(),
        includePresentedBy: z.boolean().optional(),
        presentedByText: z.string().optional(),
        promotionalPlatforms: z.array(z.string()),
        assetTypes: z.array(z.string()),
        ticketPhases: z.array(z.object({
          name: z.string(),
          dateRange: z.object({
            start: z.string(),
            end: z.string()
          }),
          price: z.string().optional()
        })),
        milestones: z.array(z.object({
          type: z.string(),
          date: z.string().optional(),
          enabled: z.boolean()
        })).optional(),
        layoutPreference: z.enum(["ai_decide", "text_heavy", "image_heavy", "balanced"]).optional(),
        artistPhotoUsage: z.enum(["high", "medium", "none"]).optional(),
        sponsorLockup: z.enum(["footer", "corner", "none"]).optional(),
        safeZoneStrictness: z.enum(["strict", "moderate", "relaxed"]).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const campaign = await db.getCampaignById(input.campaignId);
        if (!campaign ) {
          throw new Error("Campaign not found");
        }
        
        // Get next version number
        const versions = await db.getCampaignVersionsByCampaignId(input.campaignId);
        const versionNumber = versions.length + 1;
        
        const version = await db.createCampaignVersion({
          ...input,
          versionNumber
        });
        
        // Update campaign's current version
        await db.updateCampaign(input.campaignId, {
          currentVersionId: version.id
        });
        
        return version;
      }),

    // Get version by ID
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getCampaignVersionById(input.id);
      }),

    // Start generation workflow for a version
    startGeneration: publicProcedure
      .input(z.object({ versionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const version = await db.getCampaignVersionById(input.versionId);
        if (!version) {
          throw new Error("Campaign version not found");
        }
        
        const campaign = await db.getCampaignById(version.campaignId);
        if (!campaign ) {
          throw new Error("Unauthorized");
        }
        
        // Import job queue functions
        const { createCampaignGenerationWorkflow } = await import("./jobQueue");
        
        // Create generation workflow jobs
        const jobIds = await createCampaignGenerationWorkflow(
          version.id,
          campaign.id,
          campaign.archetype,
          version.assetTypes
        );
        
        return { success: true, jobIds };
      }),
  }),

  // Campaign DNA management
  dna: router({
    // Generate Campaign DNA for a version
    generate: publicProcedure
      .input(z.object({ campaignVersionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const version = await db.getCampaignVersionById(input.campaignVersionId);
        if (!version) {
          throw new Error("Campaign version not found");
        }
        
        const campaign = await db.getCampaignById(version.campaignId);
        if (!campaign ) {
          throw new Error("Unauthorized");
        }
        
        // Generate DNA using Claude
        const generatedDNA = await generateCampaignDNA(version, campaign.archetype);
        
        // Save to database
        const dna = await db.createCampaignDNAVersion({
          campaignVersionId: version.id,
          raw: generatedDNA.raw,
          tokens: generatedDNA.tokens,
          basePrompt: generatedDNA.basePrompt,
          styleModifiers: generatedDNA.styleModifiers
        });
        
        return dna;
      }),

    // Get DNA for a version
    get: publicProcedure
      .input(z.object({ campaignVersionId: z.number() }))
      .query(async ({ input }) => {
        return db.getCampaignDNAByVersionId(input.campaignVersionId);
      }),
  }),

  // Copy variant management
  copy: router({
    // Generate copy variants for a version
    generate: publicProcedure
      .input(z.object({ campaignVersionId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const version = await db.getCampaignVersionById(input.campaignVersionId);
        if (!version) {
          throw new Error("Campaign version not found");
        }
        
        const campaign = await db.getCampaignById(version.campaignId);
        if (!campaign ) {
          throw new Error("Unauthorized");
        }
        
        const dna = await db.getCampaignDNAByVersionId(version.id);
        if (!dna) {
          throw new Error("Campaign DNA not found. Generate DNA first.");
        }
        
        // Generate copy variants using Claude
        const variants = await generateCopyVariants(version, dna.tokens, campaign.archetype);
        
        // Save to database
        const savedVariants = [];
        
        for (const headline of variants.headlines) {
          const saved = await db.createCopyVariant({
            campaignVersionId: version.id,
            copyType: "headline",
            content: headline.content,
            variant: headline.variant
          });
          savedVariants.push(saved);
        }
        
        for (const cta of variants.ctas) {
          const saved = await db.createCopyVariant({
            campaignVersionId: version.id,
            copyType: "cta",
            content: cta.content,
            variant: cta.variant
          });
          savedVariants.push(saved);
        }
        
        for (const body of variants.bodyTexts) {
          const saved = await db.createCopyVariant({
            campaignVersionId: version.id,
            copyType: "body",
            platform: body.platform,
            content: body.content,
            variant: body.variant
          });
          savedVariants.push(saved);
        }
        
        for (const hashtag of variants.hashtags) {
          const saved = await db.createCopyVariant({
            campaignVersionId: version.id,
            copyType: "hashtags",
            content: hashtag.content,
            variant: hashtag.variant
          });
          savedVariants.push(saved);
        }
        
        return savedVariants;
      }),

    // Get copy variants for a version
    list: publicProcedure
      .input(z.object({ campaignVersionId: z.number() }))
      .query(async ({ input }) => {
        return db.getCopyVariantsByVersionId(input.campaignVersionId);
      }),

    // Select a copy variant
    select: publicProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await db.selectCopyVariant(input.id);
        return { success: true };
      }),
  }),

  // Asset management
  assets: router({
    // Get assets for a version
    list: publicProcedure
      .input(z.object({ campaignVersionId: z.number() }))
      .query(async ({ input }) => {
        return db.getAssetsByVersionId(input.campaignVersionId);
      }),

    // Get asset options for a version
    listOptions: publicProcedure
      .input(z.object({ campaignVersionId: z.number() }))
      .query(async ({ input }) => {
        return db.getAssetOptionsByVersionId(input.campaignVersionId);
      }),

    // Generate asset options (A/B) for a specific asset type
    generateOptions: publicProcedure
      .input(z.object({
        campaignVersionId: z.number(),
        assetType: z.string(),
        copy: z.object({
          headline: z.string().optional(),
          subheadline: z.string().optional(),
          body: z.string().optional(),
          cta: z.string().optional()
        })
      }))
      .mutation(async ({ input, ctx }) => {
        const version = await db.getCampaignVersionById(input.campaignVersionId);
        if (!version) {
          throw new Error("Campaign version not found");
        }
        
        const campaign = await db.getCampaignById(version.campaignId);
        if (!campaign ) {
          throw new Error("Unauthorized");
        }
        
        const dna = await db.getCampaignDNAByVersionId(version.id);
        if (!dna) {
          throw new Error("Campaign DNA not found");
        }
        
        // Generate both options
        const { optionA, optionB } = await generateAssetOptions({
          campaignVersionId: version.id,
          version,
          archetype: campaign.archetype,
          dnaTokens: dna.tokens,
          basePrompt: dna.basePrompt,
          styleModifiers: dna.styleModifiers || [],
          assetType: input.assetType,
          copy: input.copy,
          logos: version.logoUrl ? [{ url: version.logoUrl, position: dna.tokens.layout.logoZone }] : undefined
        });
        
        // Save options to database
        const savedOptionA = await db.createAssetOption({
          campaignVersionId: version.id,
          assetType: input.assetType,
          generationEngine: "structured",
          assetUrl: optionA.assetUrl,
          assetKey: optionA.assetKey,
          thumbnailUrl: optionA.thumbnailUrl,
          width: optionA.width,
          height: optionA.height,
          format: optionA.format,
          templateId: optionA.templateId,
          optionLabel: "A"
        });
        
        const savedOptionB = await db.createAssetOption({
          campaignVersionId: version.id,
          assetType: input.assetType,
          generationEngine: "generative",
          assetUrl: optionB.assetUrl,
          assetKey: optionB.assetKey,
          thumbnailUrl: optionB.thumbnailUrl,
          width: optionB.width,
          height: optionB.height,
          format: optionB.format,
          promptUsed: optionB.promptUsed,
          optionLabel: "B"
        });
        
        return {
          optionA: savedOptionA,
          optionB: savedOptionB
        };
      }),

    // Select an asset option
    selectOption: publicProcedure
      .input(z.object({ optionId: z.number() }))
      .mutation(async ({ input }) => {
        await db.selectAssetOption(input.optionId);
        return { success: true };
      }),

    // Export selected assets as ZIP
    exportZip: publicProcedure
      .input(z.object({
        campaignVersionId: z.number(),
        selectedAssetIds: z.array(z.number())
      }))
      .mutation(async ({ input, ctx }) => {
        const version = await db.getCampaignVersionById(input.campaignVersionId);
        if (!version) {
          throw new Error("Campaign version not found");
        }
        
        const campaign = await db.getCampaignById(version.campaignId);
        if (!campaign ) {
          throw new Error("Unauthorized");
        }
        
        return generateZipExport({
          campaignVersionId: input.campaignVersionId,
          selectedAssetIds: input.selectedAssetIds
        });
      }),
  }),

  // Upload management
  uploads: router({
    // Create upload record
    create: publicProcedure
      .input(z.object({
        campaignId: z.number().optional(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        fileUrl: z.string(),
        fileKey: z.string(),
        purpose: z.enum(["logo", "sponsor_logo", "venue_logo", "artist_photo", "other"])
      }))
      .mutation(async ({ input, ctx }) => {
        return db.createUpload({
          userId: 1,
          ...input
        });
      }),

    // List uploads for current user
    list: publicProcedure.query(async ({ ctx }) => {
      // For demo mode, return all uploads
      return db.getAllUploads();
    }),
  }),

  // Job management
  jobs: router({
    // Get jobs for a campaign version
    list: publicProcedure
      .input(z.object({ campaignVersionId: z.number() }))
      .query(async ({ input }) => {
        return db.getJobsByCampaignVersionId(input.campaignVersionId);
      }),

    // Get job by ID
    get: publicProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return db.getJobById(input.id);
      }),
      
    // Process next pending job
    processNext: publicProcedure
      .mutation(async () => {
        const { processNextPendingJob } = await import("./jobQueue");
        const processed = await processNextPendingJob();
        return { success: true, processed };
      }),
  }),
});

export type AppRouter = typeof appRouter;
