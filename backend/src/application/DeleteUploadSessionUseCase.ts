import type { DeleteUploadSession } from '../domain/port/inbound/DeleteUploadSession.js';
import type { UploadSessionRepository } from '../domain/port/outbound/UploadSessionRepository.js';

export class DeleteUploadSessionUseCase implements DeleteUploadSession {
  constructor(private readonly sessionRepo: UploadSessionRepository) {}

  async execute(token: string): Promise<{ deleted: boolean }> {
    const deleted = await this.sessionRepo.deleteByToken(token);
    return { deleted };
  }
}
