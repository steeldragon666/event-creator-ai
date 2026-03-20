import * as db from "../db";
import { createJob } from "../jobQueue";

export async function submitBatchGeneration(
  versionId: number,
  campaignId: number,
  batchConfigId: number
): Promise<number> {
  // 1. Create master GENERATE_BATCH_ASSETS job
  const masterJobId = await createJob("GENERATE_BATCH_ASSETS", {
    campaignVersionId: versionId,
    campaignId,
    batchConfigId,
  }, 100);

  return masterJobId;
}

export async function processBatchGenerationMaster(payload: any): Promise<void> {
  const { campaignVersionId, campaignId, batchConfigId } = payload;
  
  const config = await db.getBatchConfig(batchConfigId);
  if (!config) throw new Error("Batch config not found");

  // Create a round variant job for each ticket round
  for (const round of config.ticketRounds) {
    await createJob("GENERATE_ROUND_VARIANTS", {
      campaignVersionId,
      campaignId,
      batchConfigId,
      roundNumber: round.roundNumber,
    }, 90);
  }
}

export async function processRoundVariants(payload: any): Promise<void> {
  const { campaignVersionId, batchConfigId, roundNumber } = payload;
  
  const config = await db.getBatchConfig(batchConfigId);
  if (!config) throw new Error("Batch config not found");

  const round = config.ticketRounds.find(r => r.roundNumber === roundNumber);
  if (!round) throw new Error("Ticket round not found");

  // Per platform, per variation -> RESIZE_AND_COMPOSITE
  for (const platform of config.platforms) {
    for (let v = 1; v <= config.variationCount; v++) {
      await createJob("RESIZE_AND_COMPOSITE", {
        campaignVersionId,
        batchConfigId,
        roundNumber,
        platform,
        variationNumber: v,
      }, 80);
    }
  }
}

export async function processResizeAndComposite(payload: any): Promise<void> {
  // 1. Fetch config, base asset option, DNA tokens
  // 2. Fetch or download base asset buffer from S3 -> using S3 or local mock?
  // 3. Call compositeAsset() from compositor.ts
  // 4. Upload generated composite to S3
  // 5. Insert into batchAssets table
  
  const { campaignVersionId, batchConfigId, roundNumber, platform, variationNumber } = payload;
  
  // NOTE: Stub for actual S3 download/upload and composite wiring
  // For the MVP, we just record a successful stub in db
  
  await db.createBatchAsset({
    batchConfigId,
    campaignVersionId,
    ticketRound: roundNumber,
    platform,
    variationNumber,
    assetUrl: `https://fake-s3-bucket.s3.amazonaws.com/batch_${batchConfigId}_r${roundNumber}_${platform}_v${variationNumber}.png`,
    assetKey: `batch_${batchConfigId}_r${roundNumber}_${platform}_v${variationNumber}.png`,
    width: 1080,
    height: 1080,
    format: "png",
  });
}
