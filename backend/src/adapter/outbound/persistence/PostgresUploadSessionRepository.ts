import type { Knex } from 'knex';
import type { UploadSessionRepository } from '../../../domain/port/outbound/UploadSessionRepository.js';
import { UploadSession } from '../../../domain/model/UploadSession.js';
import { ShareToken } from '../../../domain/model/ShareToken.js';
import { ListeningPeriod } from '../../../domain/model/ListeningPeriod.js';

interface SessionRow {
  id: string;
  share_token: string;
  status: string;
  entry_count: number | null;
  total_ms: string | null;
  date_from: Date | null;
  date_to: Date | null;
  created_at: Date;
  user_hash: string | null;
  is_active: boolean;
}

export class PostgresUploadSessionRepository implements UploadSessionRepository {
  constructor(private readonly db: Knex) {}

  async save(session: UploadSession): Promise<void> {
    await this.db('upload_sessions')
      .insert({
        id: session.id,
        share_token: session.shareToken.toString(),
        status: session.status,
        entry_count: session.entryCount,
        total_ms: session.totalMsPlayed,
        date_from: session.period?.from ?? null,
        date_to: session.period?.to ?? null,
        created_at: session.createdAt,
        updated_at: new Date(),
        user_hash: session.userHash,
        is_active: session.isActive,
      })
      .onConflict('id')
      .merge(['status', 'entry_count', 'total_ms', 'date_from', 'date_to', 'updated_at', 'is_active']);
  }

  async findByToken(token: string): Promise<UploadSession | null> {
    const row = await this.db<SessionRow>('upload_sessions')
      .where('share_token', token)
      .first();
    return row ? this.toDomain(row) : null;
  }

  async findById(id: string): Promise<UploadSession | null> {
    const row = await this.db<SessionRow>('upload_sessions')
      .where('id', id)
      .first();
    return row ? this.toDomain(row) : null;
  }

  async countAll(): Promise<number> {
    const result = await this.db('upload_sessions').where('status', 'completed').count('id as count').first();
    return Number(result?.count ?? 0);
  }

  private toDomain(row: SessionRow): UploadSession {
    const period = row.date_from && row.date_to
      ? new ListeningPeriod(new Date(row.date_from), new Date(row.date_to))
      : null;

    return UploadSession.reconstitute(
      row.id,
      ShareToken.fromString(row.share_token),
      new Date(row.created_at),
      row.status as UploadSession['status'],
      row.entry_count,
      row.total_ms ? Number(row.total_ms) : null,
      period,
      row.user_hash,
      row.is_active,
    );
  }

  async deactivatePreviousSessions(userHash: string, currentSessionId: string): Promise<void> {
    await this.db('upload_sessions')
      .where('user_hash', userHash)
      .whereNot('id', currentSessionId)
      .where('is_active', true)
      .update({ is_active: false, updated_at: new Date() });
  }

  async deleteByToken(token: string): Promise<boolean> {
    const deleted = await this.db('upload_sessions')
      .where('share_token', token)
      .del();
    return deleted > 0;
  }

  async deleteExpiredSessions(daysOld: number): Promise<number> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);

    return this.db.transaction(async (trx) => {
      // marathon_sessions has no FK cascade — delete first
      const expiring = await trx<{ id: string }>('upload_sessions')
        .where('created_at', '<', cutoff)
        .select('id');

      if (expiring.length > 0) {
        const ids = expiring.map(r => r.id);
        await trx('marathon_sessions').whereIn('session_id', ids).del();
      }

      const count = await trx('upload_sessions')
        .where('created_at', '<', cutoff)
        .del();

      return count;
    });
  }
}
