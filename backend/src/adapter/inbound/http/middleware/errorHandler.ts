import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error & { status?: number; type?: string }, req: Request, res: Response, _next: NextFunction): void {
  const isPoolTimeout = err.message?.includes('Timeout acquiring a connection');
  const isStatementTimeout = err.message?.includes('statement timeout');
  const isPayloadTooLarge = err.status === 413 || err.type === 'entity.too.large';

  const status = isPoolTimeout ? 503 : isPayloadTooLarge ? 413 : 500;
  const label = isPoolTimeout
    ? 'POOL_TIMEOUT'
    : isStatementTimeout
      ? 'STATEMENT_TIMEOUT'
      : isPayloadTooLarge
        ? 'PAYLOAD_TOO_LARGE'
        : 'UNHANDLED';

  console.error(
    `[${label}] ${req.method} ${req.originalUrl} — ${err.message}`,
    isPoolTimeout || isPayloadTooLarge ? '' : err.stack,
  );

  const message = isPoolTimeout
    ? 'Server is under heavy load, please try again shortly'
    : isPayloadTooLarge
      ? 'Upload payload too large (max 10 MB compressed). Try uploading fewer files at once.'
      : 'Internal server error';

  res.status(status).json({ error: message });
}
