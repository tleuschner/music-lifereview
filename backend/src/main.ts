import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { loadConfig } from "./config/environment.js";
import { createDatabase } from "./config/database.js";
import { CryptoTokenGenerator } from "./adapter/outbound/token/CryptoTokenGenerator.js";
import { PostgresUploadSessionRepository } from "./adapter/outbound/persistence/PostgresUploadSessionRepository.js";
import { PostgresStreamEntryRepository } from "./adapter/outbound/persistence/PostgresStreamEntryRepository.js";
import { PostgresAggregatedStatsStore } from "./adapter/outbound/persistence/PostgresAggregatedStatsStore.js";
import { UploadStreamingHistoryUseCase } from "./application/UploadStreamingHistoryUseCase.js";
import { QueryPersonalStatsUseCase } from "./application/QueryPersonalStatsUseCase.js";
import { QueryCommunityStatsUseCase } from "./application/QueryCommunityStatsUseCase.js";
import { DeleteUploadSessionUseCase } from "./application/DeleteUploadSessionUseCase.js";
import { GenerateOgPreviewUseCase } from "./application/GenerateOgPreviewUseCase.js";
import { createUploadController } from "./adapter/inbound/http/UploadController.js";
import { createPersonalStatsController } from "./adapter/inbound/http/PersonalStatsController.js";
import { createCommunityStatsController } from "./adapter/inbound/http/CommunityStatsController.js";
import { createShareController } from "./adapter/inbound/http/ShareController.js";
import { errorHandler } from "./adapter/inbound/http/middleware/errorHandler.js";

const config = loadConfig();
const db = createDatabase(config.databaseUrl);

// Adapters
const tokenGenerator = new CryptoTokenGenerator();
const sessionRepo = new PostgresUploadSessionRepository(db);
const entryRepo = new PostgresStreamEntryRepository(db);
const statsStore = new PostgresAggregatedStatsStore(db);

// Use cases
const uploadUseCase = new UploadStreamingHistoryUseCase(
  sessionRepo,
  entryRepo,
  tokenGenerator,
  statsStore,
);
const personalStatsUseCase = new QueryPersonalStatsUseCase(
  sessionRepo,
  entryRepo,
);
const deleteUploadSessionUseCase = new DeleteUploadSessionUseCase(sessionRepo);
const ogPreviewUseCase = new GenerateOgPreviewUseCase(sessionRepo, entryRepo);
const communityStatsUseCase = new QueryCommunityStatsUseCase(
  statsStore,
  sessionRepo,
  entryRepo,
);

// Rate limiters
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many uploads from this IP, please try again later.' },
});

const statsLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 240,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

const communityLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

const shareLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' },
});

// Express app
const app = express();
app.set('trust proxy', 1); // trust Caddy's X-Forwarded-For
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api/upload", uploadLimiter);
app.use("/api", createUploadController(uploadUseCase));
app.use("/api/stats", statsLimiter, createPersonalStatsController(personalStatsUseCase, deleteUploadSessionUseCase));
app.use(
  "/api/community",
  communityLimiter,
  createCommunityStatsController(communityStatsUseCase),
);
app.use("/share", shareLimiter, createShareController(ogPreviewUseCase));

// Error handling
app.use(errorHandler);

// Data retention: delete sessions older than 30 days
const RETENTION_DAYS = 30;

async function runCleanup() {
  try {
    const deleted = await sessionRepo.deleteExpiredSessions(RETENTION_DAYS);
    if (deleted > 0) {
      console.log(`Cleanup: deleted ${deleted} session(s) older than ${RETENTION_DAYS} days`);
    }
  } catch (err) {
    console.error('Cleanup error:', err);
  }
}

runCleanup();
setInterval(runCleanup, 24 * 60 * 60 * 1000);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
