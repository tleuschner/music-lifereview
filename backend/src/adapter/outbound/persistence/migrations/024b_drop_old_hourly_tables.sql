-- Migration 024b: Drop old monthly_heatmap and monthly_stamina tables
--
-- Run ONLY after:
--   1. Migration 024 has been applied (monthly_hourly_stats exists and is populated)
--   2. The updated application code (reading/writing monthly_hourly_stats) is deployed
--   3. Integrity checks from the test plan have been verified:
--        - Row counts match between monthly_hourly_stats and monthly_heatmap
--        - ms_played sums are equal
--        - total_chain_length sums are equal

DROP TABLE IF EXISTS monthly_heatmap;
DROP TABLE IF EXISTS monthly_stamina;
