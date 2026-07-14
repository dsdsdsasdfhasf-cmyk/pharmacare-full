import app from "./app";
import { logger } from "./lib/logger";

export default async function handler(req: unknown, res: unknown) {
  try {
    await app(req as any, res as any);
  } catch (err) {
    logger.error({ err }, "Unhandled error in serverless handler");
    const response = res as { status?: (c: number) => any; json?: (b: unknown) => void };
    if (response.status) {
      response.status(500).json({ error: "Internal server error" });
    }
  }
}
