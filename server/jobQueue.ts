import * as db from "./db";
import { generateCampaignDNA } from "./campaignDNA";
import { generateCopyVariants } from "./copyGeneration";
import { generateAssetOptions } from "./assetGeneration";

export type JobType = 
  | "GENERATE_CAMPAIGN_DNA"
  | "GENERATE_COPY_VARIANTS"
  | "GENERATE_ASSET_OPTIONS"
  | "RENDER_TEMPLATE"
  | "GENERATE_FINAL_ASSETS"
  | "EXPORT_ZIP";

export interface JobPayload {
  campaignVersionId: number;
  campaignId: number;
  archetype: string;
  assetType?: string;
  copy?: {
    headline?: string;
    subheadline?: string;
    body?: string;
    cta?: string;
  };
}

/**
 * Create a new job
 */
export async function createJob(
  type: JobType,
  payload: JobPayload,
  priority: number = 0
): Promise<number> {
  const job = await db.createJob({
    jobType: type,
    campaignId: payload.campaignId,
    campaignVersionId: payload.campaignVersionId,
    payload: payload as Record<string, any>,
    status: "pending",
    retries: 0
  });
  
  return job.id;
}

/**
 * Check if a job's dependencies are met
 */
async function checkJobDependencies(job: any): Promise<boolean> {
  const payload: JobPayload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload as JobPayload;
  
  // GENERATE_CAMPAIGN_DNA has no dependencies
  if (job.jobType === "GENERATE_CAMPAIGN_DNA") {
    return true;
  }
  
  // GENERATE_COPY_VARIANTS and GENERATE_ASSET_OPTIONS depend on DNA being completed
  if (job.jobType === "GENERATE_COPY_VARIANTS" || job.jobType === "GENERATE_ASSET_OPTIONS") {
    // Check if DNA exists for this version
    const dna = await db.getCampaignDNAByVersionId(payload.campaignVersionId);
    if (!dna) {
      // Check if DNA job is still pending/processing
      const jobs = await db.getJobsByCampaignVersionId(payload.campaignVersionId);
      const dnaJob = jobs.find(j => j.jobType === "GENERATE_CAMPAIGN_DNA");
      
      if (dnaJob && (dnaJob.status === "pending" || dnaJob.status === "processing")) {
        return false; // DNA job still running, wait
      }
      
      // DNA job failed or doesn't exist - this job will fail
      return true; // Let it try and fail with proper error message
    }
    return true; // DNA exists, can proceed
  }
  
  // Other job types have no dependencies for now
  return true;
}

/**
 * Process a single job
 */
async function processJob(jobId: number): Promise<void> {
  const job = await db.getJobById(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }
  
  // Check if dependencies are met before processing
  const canProcess = await checkJobDependencies(job);
  if (!canProcess) {
    console.log(`[JobWorker] Job ${jobId} (${job.jobType}) dependencies not met, skipping for now`);
    return; // Skip this job for now, will retry on next poll
  }
  
  // Update status to processing
  await db.updateJob(jobId, {
    status: "processing",
    startedAt: new Date()
  });
  
  try {
    const payload: JobPayload = typeof job.payload === 'string' ? JSON.parse(job.payload) : job.payload as JobPayload;
    
    switch (job.jobType) {
      case "GENERATE_CAMPAIGN_DNA":
        await processGenerateDNA(payload);
        break;
      
      case "GENERATE_COPY_VARIANTS":
        await processGenerateCopy(payload);
        break;
      
      case "GENERATE_ASSET_OPTIONS":
        await processGenerateAssetOptions(payload);
        break;
      
      case "GENERATE_FINAL_ASSETS":
        await processGenerateFinalAssets(payload);
        break;
      
      case "EXPORT_ZIP":
        await processExportZip(payload);
        break;
      
      default:
        throw new Error(`Unknown job type: ${job.jobType}`);
    }
    
    // Mark as completed
    await db.updateJob(jobId, {
      status: "completed",
      completedAt: new Date(),
      progress: 100
    });
    
  } catch (error) {
    console.error(`Job ${jobId} failed:`, error);
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    const maxRetries = 3;
    const currentRetries = job.retries || 0;
    
    if (currentRetries < maxRetries) {
      // Retry
      await db.updateJob(jobId, {
        status: "retrying",
        retries: currentRetries + 1,
        errorMessage
      });
    } else {
      // Mark as failed
      await db.updateJob(jobId, {
        status: "failed",
        completedAt: new Date(),
        errorMessage
      });
    }
  }
}

/**
 * Process GENERATE_DNA job
 */
async function processGenerateDNA(payload: JobPayload): Promise<void> {
  const version = await db.getCampaignVersionById(payload.campaignVersionId);
  if (!version) {
    throw new Error("Campaign version not found");
  }
  
  const generatedDNA = await generateCampaignDNA(version, payload.archetype);
  
  await db.createCampaignDNAVersion({
    campaignVersionId: version.id,
    raw: generatedDNA.raw,
    tokens: generatedDNA.tokens,
    basePrompt: generatedDNA.basePrompt,
    styleModifiers: generatedDNA.styleModifiers
  });
}

/**
 * Process GENERATE_COPY job
 */
async function processGenerateCopy(payload: JobPayload): Promise<void> {
  const version = await db.getCampaignVersionById(payload.campaignVersionId);
  if (!version) {
    throw new Error("Campaign version not found");
  }
  
  const dna = await db.getCampaignDNAByVersionId(version.id);
  if (!dna) {
    throw new Error("Campaign DNA not found");
  }
  
  if (!dna.tokens || typeof dna.tokens !== 'object') {
    throw new Error("Campaign DNA tokens are invalid or missing");
  }
  
  const variants = await generateCopyVariants(version, dna.tokens, payload.archetype);
  
  // Save variants
  for (const headline of variants.headlines) {
    await db.createCopyVariant({
      campaignVersionId: version.id,
      copyType: "headline",
      content: headline.content,
      variant: headline.variant
    });
  }
  
  for (const cta of variants.ctas) {
    await db.createCopyVariant({
      campaignVersionId: version.id,
      copyType: "cta",
      content: cta.content,
      variant: cta.variant
    });
  }
  
  for (const body of variants.bodyTexts) {
    await db.createCopyVariant({
      campaignVersionId: version.id,
      copyType: "body",
      platform: body.platform,
      content: body.content,
      variant: body.variant
    });
  }
  
  for (const hashtag of variants.hashtags) {
    await db.createCopyVariant({
      campaignVersionId: version.id,
      copyType: "hashtags",
      content: hashtag.content,
      variant: hashtag.variant
    });
  }
}

/**
 * Process GENERATE_ASSET_OPTIONS job
 */
async function processGenerateAssetOptions(payload: JobPayload): Promise<void> {
  if (!payload.assetType) {
    throw new Error("Asset type is required");
  }
  
  const version = await db.getCampaignVersionById(payload.campaignVersionId);
  if (!version) {
    throw new Error("Campaign version not found");
  }
  
  const dna = await db.getCampaignDNAByVersionId(version.id);
  if (!dna) {
    throw new Error("Campaign DNA not found");
  }
  
  if (!dna.tokens || typeof dna.tokens !== 'object') {
    throw new Error("Campaign DNA tokens are invalid or missing");
  }
  
  const { optionA, optionB } = await generateAssetOptions({
    campaignVersionId: version.id,
    version,
    archetype: payload.archetype,
    dnaTokens: dna.tokens,
    basePrompt: dna.basePrompt,
    styleModifiers: dna.styleModifiers || [],
    assetType: payload.assetType,
    copy: payload.copy || {},
    logos: version.logoUrl ? [{ url: version.logoUrl, position: dna.tokens.layout.logoZone }] : undefined
  });
  
  // Save options
  await db.createAssetOption({
    campaignVersionId: version.id,
    assetType: payload.assetType,
    generationEngine: "structured",
    assetUrl: optionA.assetUrl,
    assetKey: optionA.assetKey,
    thumbnailUrl: optionA.thumbnailUrl,
    width: optionA.width,
    height: optionA.height,
    format: optionA.format,
    templateId: optionA.templateId || undefined,
    optionLabel: "A"
  });
  
  await db.createAssetOption({
    campaignVersionId: version.id,
    assetType: payload.assetType,
    generationEngine: "generative",
    assetUrl: optionB.assetUrl,
    assetKey: optionB.assetKey,
    thumbnailUrl: optionB.thumbnailUrl,
    width: optionB.width,
    height: optionB.height,
    format: optionB.format,
    promptUsed: optionB.promptUsed || undefined,
    optionLabel: "B"
  });
}

/**
 * Process GENERATE_FINAL_ASSETS job
 */
async function processGenerateFinalAssets(payload: JobPayload): Promise<void> {
  // TODO: Implement final asset generation based on user selections
  // This would regenerate assets using the selected engine/style for each asset type
  throw new Error("Not implemented yet");
}

/**
 * Process EXPORT_ZIP job
 */
async function processExportZip(payload: JobPayload): Promise<void> {
  // TODO: Implement ZIP export
  // This would collect all selected assets and create a downloadable ZIP
  throw new Error("Not implemented yet");
}

/**
 * Job worker - polls for pending jobs and processes them
 */
export async function startJobWorker(): Promise<void> {
  console.log("[JobWorker] Starting job worker...");
  
  const pollInterval = 5000; // 5 seconds
  
  async function poll() {
    try {
      const pendingJobs = await db.getPendingJobs(); // Get all pending jobs
      const jobsToProcess = pendingJobs.slice(0, 5); // Process up to 5 at a time
      
      if (jobsToProcess.length > 0) {
        console.log(`[JobWorker] Processing ${jobsToProcess.length} pending jobs`);
        
        // Process jobs in parallel
        await Promise.all(
          jobsToProcess.map(job => processJob(job.id))
        );
      }
    } catch (error) {
      console.error("[JobWorker] Error polling jobs:", error);
    }
    
    // Schedule next poll
    setTimeout(poll, pollInterval);
  }
  
  // Start polling
  poll();
}

/**
 * Create a complete campaign generation workflow
 */
export async function createCampaignGenerationWorkflow(
  campaignVersionId: number,
  campaignId: number,
  archetype: string,
  assetTypes: string[]
): Promise<number[]> {
  const jobIds: number[] = [];
  
  // Step 1: Generate Campaign DNA
  const dnaJobId = await createJob("GENERATE_CAMPAIGN_DNA", {
    campaignVersionId,
    campaignId,
    archetype
  }, 100);
  jobIds.push(dnaJobId);
  
  // Step 2: Generate Copy Variants
  const copyJobId = await createJob("GENERATE_COPY_VARIANTS", {
    campaignVersionId,
    campaignId,
    archetype
  }, 90);
  jobIds.push(copyJobId);
  
  // Step 3: Generate Asset Options for each asset type
  for (const assetType of assetTypes) {
    const assetJobId = await createJob("GENERATE_ASSET_OPTIONS", {
      campaignVersionId,
      campaignId,
      archetype,
      assetType
    }, 80);
    jobIds.push(assetJobId);
  }
  
  return jobIds;
}
