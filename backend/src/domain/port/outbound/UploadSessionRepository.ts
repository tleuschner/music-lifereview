import { UploadSession } from '../../model/UploadSession.js';

export interface UploadSessionRepository {
  save(session: UploadSession): Promise<void>;
  findByToken(token: string): Promise<UploadSession | null>;
  findById(id: string): Promise<UploadSession | null>;
  countAll(): Promise<number>;
  deactivatePreviousSessions(userHash: string, currentSessionId: string): Promise<void>;
  deleteByToken(token: string): Promise<boolean>;
}
