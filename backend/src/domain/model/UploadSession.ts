import type { UploadStatus } from '@music-livereview/shared';
import { ShareToken } from './ShareToken.js';
import { ListeningPeriod } from './ListeningPeriod.js';

export class UploadSession {
  private constructor(
    readonly id: string,
    readonly shareToken: ShareToken,
    readonly createdAt: Date,
    private _status: UploadStatus,
    private _entryCount: number | null,
    private _totalMsPlayed: number | null,
    private _period: ListeningPeriod | null,
    readonly userHash: string | null,
    private _isActive: boolean,
  ) {}

  static create(id: string, shareToken: ShareToken, userHash: string | null = null, isActive: boolean = true): UploadSession {
    return new UploadSession(id, shareToken, new Date(), 'pending', null, null, null, userHash, isActive);
  }

  static reconstitute(
    id: string,
    shareToken: ShareToken,
    createdAt: Date,
    status: UploadStatus,
    entryCount: number | null,
    totalMsPlayed: number | null,
    period: ListeningPeriod | null,
    userHash: string | null = null,
    isActive: boolean = true,
  ): UploadSession {
    return new UploadSession(id, shareToken, createdAt, status, entryCount, totalMsPlayed, period, userHash, isActive);
  }

  get status(): UploadStatus {
    return this._status;
  }

  get entryCount(): number | null {
    return this._entryCount;
  }

  get totalMsPlayed(): number | null {
    return this._totalMsPlayed;
  }

  get period(): ListeningPeriod | null {
    return this._period;
  }

  markProcessing(): void {
    this._status = 'processing';
  }

  markCompleted(entryCount: number, totalMs: number, period: ListeningPeriod): void {
    this._status = 'completed';
    this._entryCount = entryCount;
    this._totalMsPlayed = totalMs;
    this._period = period;
  }

  markFailed(): void {
    this._status = 'failed';
  }

  get isActive(): boolean {
    return this._isActive;
  }

  deactivate(): void {
    this._isActive = false;
  }

  isAccessibleWith(token: ShareToken): boolean {
    return this.shareToken.equals(token);
  }
}
