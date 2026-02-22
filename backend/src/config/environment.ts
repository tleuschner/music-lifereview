export interface AppConfig {
  port: number;
  databaseUrl: string;
  corsOrigin: string;
  maxUploadSizeMb: number;
}

export function loadConfig(): AppConfig {
  return {
    port: parseInt(process.env.PORT ?? '3000', 10),
    databaseUrl: process.env.DATABASE_URL ?? 'postgresql://dev:devpassword@localhost:5432/music_livereview',
    corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
    maxUploadSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB ?? '30', 10),
  };
}
