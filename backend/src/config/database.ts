import knex, { Knex } from 'knex';

export function createDatabase(connectionString: string): Knex {
  const db = knex({
    client: 'pg',
    connection: connectionString,
    pool: {
      min: 2,
      max: 30,
      acquireTimeoutMillis: 15_000,   // fail fast instead of waiting 60s (default)
      idleTimeoutMillis: 30_000,      // release idle connections after 30s
      reapIntervalMillis: 5_000,      // check for idle connections every 5s
      createTimeoutMillis: 5_000,     // give up creating a connection after 5s
      propagateCreateError: false,    // don't fail the pool on transient create errors
      afterCreate(conn: { query: (sql: string, cb: (err: Error | null) => void) => void }, done: (err: Error | null, conn: unknown) => void) {
        // Set a 30s statement timeout per connection so long queries don't hold the pool
        conn.query('SET statement_timeout = 30000', (err) => {
          done(err, conn);
        });
      },
    },
  });

  // Pool monitoring — log when pool is under pressure
  const pool = db.client.pool;
  let lastWarningAt = 0;

  const WARN_INTERVAL_MS = 10_000; // throttle warnings to every 10s
  const WARN_THRESHOLD = 0.8;      // warn at 80% pool usage

  setInterval(() => {
    try {
      const numUsed: number = typeof pool.numUsed === 'function' ? pool.numUsed() : 0;
      const numFree: number = typeof pool.numFree === 'function' ? pool.numFree() : 0;
      const numPending: number = typeof pool.numPendingAcquires === 'function' ? pool.numPendingAcquires() : 0;
      const total = numUsed + numFree;
      const utilization = total > 0 ? numUsed / total : 0;
      const now = Date.now();

      if ((utilization >= WARN_THRESHOLD || numPending > 0) && now - lastWarningAt > WARN_INTERVAL_MS) {
        lastWarningAt = now;
        console.warn(
          `[pool] HIGH USAGE — used=${numUsed} free=${numFree} pending=${numPending} utilization=${(utilization * 100).toFixed(0)}%`,
        );
      }
    } catch (e) {
      // Never let pool monitoring crash the process
    }
  }, 5_000);

  return db;
}
