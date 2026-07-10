import z from 'zod';

/**
 * Numeric index into a board's per-package fee schedule (`boardFeePerLaunchPackageSchema`).
 * Matches `LaunchPackageType`: 0 = BASED (free), 1 = SUPER_BASED (sale alerts posted by
 * based.bid), 2 = ULTRA_BASED (sale + buy alerts posted by based.bid).
 */
export const packageIndexSchema = z
  .union([z.literal(0), z.literal(1), z.literal(2)])
  .describe(
    'Launch package index: 0 (BASED), 1 (SUPER_BASED), or 2 (ULTRA_BASED)',
  );
