import type { SpotifyStreamEntry, UploadResponse } from '@music-livereview/shared';

export interface UploadOptions {
  userHash?: string | null;
  optOut?: boolean;
}

export interface UploadStreamingHistory {
  execute(rawEntries: SpotifyStreamEntry[], options?: UploadOptions): Promise<UploadResponse>;
  getStatus(token: string): Promise<{ status: string; entryCount?: number; dateFrom?: string; dateTo?: string } | null>;
}
