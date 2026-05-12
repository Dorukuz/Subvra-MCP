import { Worker, type Job } from "bullmq";
import IORedis from "ioredis";

interface GenerationJobData {
  jobId: string;
  userId: string;
  prompt: string;
  presetId: string;
  referenceImageUrl?: string;
}

const QUEUE_NAME = "screenshot-generation";

function createWorker() {
  const connection = new IORedis(process.env.REDIS_URL || "redis://localhost:6379", {
    maxRetriesPerRequest: null,
  });

  const worker = new Worker<GenerationJobData>(
    QUEUE_NAME,
    async (job: Job<GenerationJobData>) => {
      const { jobId, userId, presetId } = job.data;

      console.log(`[worker] Processing job ${jobId} for user ${userId}, preset ${presetId}`);

      try {
        // 1. Generate image via OpenAI
        // const { generateImage } = await import("../lib/openai");
        // const { url } = await generateImage(prompt);

        // 2. Process with Sharp pipeline
        // const { processScreenshot } = await import("../lib/image-pipeline");
        // const outputUrl = await processScreenshot(imageBuffer, presetId, jobId);

        // 3. Update job status in MongoDB
        // await updateJobDeviceStatus(jobId, presetId, "completed", outputUrl);

        console.log(`[worker] Completed job ${jobId} preset ${presetId}`);

        return { success: true, presetId };
      } catch (error) {
        console.error(`[worker] Failed job ${jobId} preset ${presetId}:`, error);
        // In production: refund credits on failure
        throw error;
      }
    },
    {
      connection,
      concurrency: 2,
      limiter: {
        max: 5,
        duration: 60_000,
      },
    }
  );

  worker.on("completed", (job) => {
    console.log(`[worker] Job ${job.id} completed`);
  });

  worker.on("failed", (job, err) => {
    console.error(`[worker] Job ${job?.id} failed:`, err.message);
  });

  return worker;
}

// Only start worker when run directly
if (require.main === module) {
  console.log("[worker] Starting generation worker...");
  createWorker();
}

export { createWorker, QUEUE_NAME };
export type { GenerationJobData };
