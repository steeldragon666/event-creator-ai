import { startJobWorker } from "./jobQueue";

console.log("[Worker] Starting job worker process...");

startJobWorker();

console.log("[Worker] Job worker started successfully");

// Keep the process running
process.on("SIGINT", () => {
  console.log("[Worker] Received SIGINT, shutting down gracefully...");
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("[Worker] Received SIGTERM, shutting down gracefully...");
  process.exit(0);
});
