import { z } from "zod";
import { publicProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const batchRouter = router({
  createConfig: publicProcedure
    .input(z.object({
      campaignVersionId: z.number(),
      selectedOptionId: z.number(),
      variationCount: z.number().min(1).max(6).default(3),
      platforms: z.array(z.string()),
      ticketRounds: z.array(z.object({
        roundNumber: z.number(),
        label: z.string(),
        status: z.enum(["upcoming", "active", "completed"]),
        bannerText: z.string().optional(),
        price: z.string().optional(),
        dateRange: z.object({ start: z.string(), end: z.string() }).optional()
      })),
      eventNameOverride: z.string().optional(),
      customTagline: z.string().optional(),
      ticketUrl: z.string().optional(),
      ageRestriction: z.string().optional(),
      legalText: z.string().optional(),
      presentedBy: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const config = await db.createBatchConfig(input);
      return config;
    }),

  startBatchGeneration: publicProcedure
    .input(z.object({
      campaignId: z.number(),
      campaignVersionId: z.number(),
      batchConfigId: z.number()
    }))
    .mutation(async ({ input }) => {
      const { submitBatchGeneration } = await import("../services/batchGenerator");
      const jobId = await submitBatchGeneration(
        input.campaignVersionId,
        input.campaignId,
        input.batchConfigId
      );
      return { success: true, masterJobId: jobId };
    }),

  getAssets: publicProcedure
    .input(z.object({ batchConfigId: z.number() }))
    .query(async ({ input }) => {
      return db.getBatchAssets(input.batchConfigId);
    }),

  getConfigsByVersion: publicProcedure
    .input(z.object({ campaignVersionId: z.number() }))
    .query(async ({ input }) => {
      return db.getBatchConfigsByVersionId(input.campaignVersionId);
    }),
});
