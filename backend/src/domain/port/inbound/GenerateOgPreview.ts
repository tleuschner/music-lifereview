import type { OgPreviewData } from '@music-livereview/shared';

export interface GenerateOgPreview {
  getPreviewData(token: string): Promise<OgPreviewData | null>;
}
