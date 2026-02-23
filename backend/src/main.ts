import express from "express";
import cors from "cors";
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
import { createUploadController } from "./adapter/inbound/http/UploadController.js";
import { createPersonalStatsController } from "./adapter/inbound/http/PersonalStatsController.js";
import { createCommunityStatsController } from "./adapter/inbound/http/CommunityStatsController.js";
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
const communityStatsUseCase = new QueryCommunityStatsUseCase(
  statsStore,
  sessionRepo,
  entryRepo,
);

// Express app
const app = express();
app.use(cors({ origin: config.corsOrigin }));
app.use(express.json());

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ status: "ok" });
});

// Routes
app.use("/api", createUploadController(uploadUseCase, config.maxUploadSizeMb));
app.use("/api/stats", createPersonalStatsController(personalStatsUseCase, deleteUploadSessionUseCase));
app.use(
  "/api/community",
  createCommunityStatsController(communityStatsUseCase),
);

// Error handling
app.use(errorHandler);

app.listen(config.port, () => {
  console.log(`Server running on http://localhost:${config.port}`);
});
