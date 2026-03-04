import type { Request, Response, NextFunction } from 'express';

function ts(): string {
  return new Date().toISOString();
}

// Patch console methods once at module load to prepend ISO timestamps to every line.
// This means all console.log/warn/error calls across the app get timestamps for free.
const _log   = console.log.bind(console);
const _warn  = console.warn.bind(console);
const _error = console.error.bind(console);
console.log   = (...a) => _log(ts(),   ...a);
console.warn  = (...a) => _warn(ts(),  ...a);
console.error = (...a) => _error(ts(), ...a);

export function requestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const status = res.statusCode;
    const line = `[http] ${req.method} ${req.originalUrl} ${status} ${duration}ms`;

    if (status >= 500) {
      console.error(line);
    } else if (status >= 400 || duration > 1000) {
      console.warn(line);
    } else {
      console.log(line);
    }
  });

  next();
}