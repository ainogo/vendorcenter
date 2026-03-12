import { initializeDatabase } from "../db/init.js";
import { processQueuedEmailJobs } from "../modules/notifications/notifications.repository.js";

const intervalMs = Number(process.env.EMAIL_WORKER_INTERVAL_MS ?? 15000);

async function runCycle() {
  try {
    const processed = await processQueuedEmailJobs(50);
    if (processed > 0) {
      console.log(`[email-worker] processed ${processed} queued email job(s)`);
    }
  } catch (error) {
    console.error("[email-worker] cycle failed", error);
  }
}

async function bootstrap() {
  try {
    await initializeDatabase();
    console.log("[email-worker] started");
    await runCycle();
    setInterval(() => {
      void runCycle();
    }, intervalMs);
  } catch (error) {
    console.error("[email-worker] failed to initialize", error);
    process.exit(1);
  }
}

void bootstrap();
