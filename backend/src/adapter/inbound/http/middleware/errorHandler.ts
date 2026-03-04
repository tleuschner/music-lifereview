import type { Request, Response, NextFunction } from 'express';

export function errorHandler(err: Error, req: Request, res: Response, _next: NextFunction): void {
  const isPoolTimeout = err.message?.includes('Timeout acquiring a connection');
  const isStatementTimeout = err.message?.includes('statement timeout');

  const status = isPoolTimeout ? 503 : 500;
  const label = isPoolTimeout
    ? 'POOL_TIMEOUT'
    : isStatementTimeout
      ? 'STATEMENT_TIMEOUT'
      : 'UNHANDLED';

  console.error(
    `[${label}] ${req.method} ${req.originalUrl} — ${err.message}`,
    isPoolTimeout ? '' : err.stack,
  );

  const message = isPoolTimeout
    ? 'Server is under heavy load, please try again shortly'
    : 'Internal server error';

  res.status(status).json({ error: message });
}
