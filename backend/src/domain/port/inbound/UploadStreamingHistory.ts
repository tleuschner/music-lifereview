import type { UploadResponse, UploadAggregatedRequest } from '@music-livereview/shared';

export interface UploadOptions {
  optOut?: boolean;
}

export interface UploadStreamingHistory {
  executeAggregated(data: UploadAggregatedRequest, options?: UploadOptions): Promise<UploadResponse>;
  getStatus(token: string): Promise<{ status: string; entryCount?: number; dateFrom?: string; dateTo?: string } | null>;
}
