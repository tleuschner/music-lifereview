-- Drop the raw stream_entries table now that all data is aggregated into monthly bucket tables.
-- Run this only after verifying the aggregated tables work correctly.
DROP TABLE IF EXISTS stream_entries CASCADE;
