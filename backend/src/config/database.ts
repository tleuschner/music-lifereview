import knex, { Knex } from 'knex';

export function createDatabase(connectionString: string): Knex {
  return knex({
    client: 'pg',
    connection: connectionString,
    pool: { min: 2, max: 10 },
  });
}
