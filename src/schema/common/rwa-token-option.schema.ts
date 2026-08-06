import {
  resolveRwaStockAddress,
  resolveRwaStockSymbol,
  RwaStockSymbol,
} from '@enums';
import { z } from 'zod';
import { evmAddressSchema } from './evm-address.schema';

/** Seconds since midnight UTC for stock-window trading bounds (0–86399). */
export const secondsSinceMidnightSchema = z
  .number()
  .int()
  .min(0)
  .max(86_399)
  .describe('Seconds since midnight UTC (0-86399)');

/**
 * Rewards basket mode for Robinhood RWA launches.
 * - `rotate` / `rotating` — cycle through reward assets
 * - `all-at-once` / `all` — split across assets by weightBps
 */
export const rwaBasketModeSchema = z
  .enum(['rotate', 'rotating', 'all-at-once', 'all'])
  .describe('Rewards basket mode: "rotate"/"rotating" or "all-at-once"/"all"');

const rwaStockInputSchema = z
  .string()
  .min(1)
  .describe(
    `Stock ticker or company alias (e.g. "AAPL", "Apple", "TSLA"). Supported: ${Object.values(RwaStockSymbol).join(', ')}`,
  );

/** Single asset in an RWA rewards basket — pass `stock` (ticker/alias) or raw `address`. */
export const rwaRewardAssetSchema = z
  .object({
    stock: rwaStockInputSchema
      .optional()
      .describe(
        'Preferred: The Index stock ticker or company name (AAPL / Apple). Mapped to the on-chain CA before the API call.',
      ),
    address: evmAddressSchema
      .optional()
      .describe(
        'Raw reward-asset token address. Use when the asset is not a known The Index stock; otherwise prefer `stock`.',
      ),
    weightBps: z
      .number()
      .int()
      .min(0)
      .max(10_000)
      .optional()
      .describe(
        'Weight in basis points (required for all-at-once with 2+ assets; sum must be 10000)',
      ),
  })
  .superRefine((data, ctx) => {
    const hasStock = data.stock !== undefined && data.stock.length > 0;
    const hasAddress = data.address !== undefined;
    if (hasStock === hasAddress) {
      ctx.addIssue({
        code: 'invalid_type',
        message: 'Provide exactly one of stock or address',
        path: hasStock ? ['address'] : ['stock'],
        expected: 'string',
      });
      return;
    }
    if (hasStock && !resolveRwaStockSymbol(data.stock!)) {
      ctx.addIssue({
        code: 'custom',
        message: `Unknown RWA stock "${data.stock}". Supported: ${Object.values(RwaStockSymbol).join(', ')} (or aliases like Apple, Tesla)`,
        path: ['stock'],
      });
    }
  });

/** Native / unset reward-asset sentinel included in every RWA basket by default. */
export const RWA_DEFAULT_REWARD_ASSET_ADDRESS =
  '0x0000000000000000000000000000000000000000' as const;

/** Wire form after stock→address resolution (what the API expects). */
export type ResolvedRwaRewardAsset = {
  address: `0x${string}`;
  weightBps?: number;
};

export const resolveRwaRewardAsset = (
  asset: z.infer<typeof rwaRewardAssetSchema>,
): ResolvedRwaRewardAsset => {
  if (asset.address) {
    return {
      address: asset.address as `0x${string}`,
      ...(asset.weightBps !== undefined && { weightBps: asset.weightBps }),
    };
  }
  return {
    address: resolveRwaStockAddress(asset.stock!),
    ...(asset.weightBps !== undefined && { weightBps: asset.weightBps }),
  };
};

const withDefaultNativeRewardAsset = (
  assets: ResolvedRwaRewardAsset[],
): ResolvedRwaRewardAsset[] => {
  const hasZero = assets.some(
    (asset) =>
      asset.address.toLowerCase() ===
      RWA_DEFAULT_REWARD_ASSET_ADDRESS.toLowerCase(),
  );
  if (hasZero) {
    return assets;
  }
  return [{ address: RWA_DEFAULT_REWARD_ASSET_ADDRESS }, ...assets];
};

const validateBasketWeights = (
  basketMode: z.infer<typeof rwaBasketModeSchema>,
  assets: Array<{ weightBps?: number }>,
  ctx: z.RefinementCtx,
  assetsPath: (string | number)[],
) => {
  const isAllAtOnce = basketMode === 'all-at-once' || basketMode === 'all';
  if (!isAllAtOnce || assets.length < 2) {
    return;
  }

  const weights = assets.map((asset) => asset.weightBps);
  if (weights.some((w) => w === undefined)) {
    ctx.addIssue({
      code: 'custom',
      message:
        'weightBps is required on every asset for all-at-once baskets with 2+ assets',
      path: assetsPath,
    });
    return;
  }

  const sum = weights.reduce<number>((acc, w) => acc + (w ?? 0), 0);
  if (sum !== 10_000) {
    ctx.addIssue({
      code: 'custom',
      message:
        'weightBps must sum to 10000 for all-at-once baskets with 2+ assets',
      path: assetsPath,
    });
  }
};

const validateStockWindow = (
  data: {
    hasStockProtection?: boolean;
    tradingStart?: number;
    tradingEnd?: number;
  },
  ctx: z.RefinementCtx,
  pathPrefix: (string | number)[] = [],
) => {
  if (!data.hasStockProtection) {
    return;
  }
  if (data.tradingStart === undefined || data.tradingEnd === undefined) {
    ctx.addIssue({
      code: 'custom',
      message:
        'tradingStart and tradingEnd are required when hasStockProtection is true',
      path: [
        ...pathPrefix,
        data.tradingStart === undefined ? 'tradingStart' : 'tradingEnd',
      ],
    });
    return;
  }
  if (data.tradingEnd <= data.tradingStart) {
    ctx.addIssue({
      code: 'custom',
      message: 'tradingEnd must be greater than tradingStart',
      path: [...pathPrefix, 'tradingEnd'],
    });
  }
};

/** One rewards basket: mode + assets (plain object; weights refined on parent). */
export const rwaBasketObjectSchema = z.object({
  basketMode: rwaBasketModeSchema,
  assets: z
    .array(rwaRewardAssetSchema)
    .min(1)
    .describe('Reward assets in this basket'),
});

/** One rewards basket with weight validation. */
export const rwaBasketSchema = rwaBasketObjectSchema.superRefine((data, ctx) =>
  validateBasketWeights(data.basketMode, data.assets, ctx, ['assets']),
);

/**
 * Optional RWA rewards config for Robinhood flash / LBP launches.
 * Omit when rewards fee is 0 (empty baskets).
 */
export const rwaObjectSchema = z
  .object({
    basketMode: rwaBasketModeSchema.describe(
      'Rewards basket mode for holder rewardAssets',
    ),
    rewardAssets: z
      .array(rwaRewardAssetSchema)
      .min(1)
      .describe(
        'Holder reward assets. Required when rewards fee > 0; for all-at-once with 2+ assets, weightBps must sum to 10000',
      ),
    customWalletRewards: z
      .record(
        z.string().describe('Custom-wallet id or address'),
        rwaBasketObjectSchema,
      )
      .optional()
      .describe(
        'Per custom-wallet reward routes, keyed by custom-wallet id or address',
      ),
  })
  .describe(
    'Robinhood RWA rewards basket; omit for defaults (empty when rewards fee is 0)',
  );

export const rwaSchema = rwaObjectSchema.superRefine((data, ctx) => {
  validateBasketWeights(data.basketMode, data.rewardAssets, ctx, [
    'rewardAssets',
  ]);
  if (data.customWalletRewards) {
    for (const [key, basket] of Object.entries(data.customWalletRewards)) {
      validateBasketWeights(basket.basketMode, basket.assets, ctx, [
        'customWalletRewards',
        key,
        'assets',
      ]);
    }
  }
});

/**
 * Token CREATE2 option flags (cooldown + optional UTC stock trading window).
 * May be nested under `tokenOption` or sent as flat root fields.
 */
export const tokenOptionObjectSchema = z
  .object({
    cooldownSeconds: z
      .number()
      .int()
      .min(0)
      .optional()
      .describe(
        'Token transfer cooldown duration (seconds). When > 0 and hasCoolDownProtection is omitted, cooldown is treated as on',
      ),
    hasCoolDownProtection: z
      .boolean()
      .optional()
      .describe(
        'Explicit cooldown on/off. If omitted, inferred from cooldownSeconds > 0. If false, cooldown stays off even when seconds are present',
      ),
    hasStockProtection: z
      .boolean()
      .optional()
      .describe(
        'When true, enables a daily UTC trading window via tradingStart / tradingEnd',
      ),
    tradingStart: secondsSinceMidnightSchema
      .optional()
      .describe(
        'Daily UTC trading window start (seconds since midnight); required when hasStockProtection is true',
      ),
    tradingEnd: secondsSinceMidnightSchema
      .optional()
      .describe(
        'Daily UTC trading window end (seconds since midnight); must be > tradingStart when hasStockProtection is true',
      ),
  })
  .describe(
    'Token option flags selecting CREATE2 bytecode variants (cooldown / stock window)',
  );

export const tokenOptionSchema = tokenOptionObjectSchema.superRefine(
  (data, ctx) => validateStockWindow(data, ctx),
);

/**
 * Flat root fields that are equivalent to nesting under `tokenOption`,
 * plus optional nested `tokenOption` and `rwa` for Robinhood launches.
 * Kept as a plain ZodObject so it can be `.merge()`d into launch schemas.
 */
export const evmRobinhoodLaunchOptionsSchema = z.object({
  cooldownSeconds: tokenOptionObjectSchema.shape.cooldownSeconds,
  hasCoolDownProtection: tokenOptionObjectSchema.shape.hasCoolDownProtection,
  hasStockProtection: tokenOptionObjectSchema.shape.hasStockProtection,
  tradingStart: tokenOptionObjectSchema.shape.tradingStart,
  tradingEnd: tokenOptionObjectSchema.shape.tradingEnd,
  tokenOption: tokenOptionObjectSchema
    .optional()
    .describe(
      'Optional nested token options (equivalent to flat root cooldown/stock fields)',
    ),
  rwa: rwaObjectSchema.optional(),
});

/**
 * Refines flat + nested tokenOption stock windows and RWA basket weights
 * after merging `evmRobinhoodLaunchOptionsSchema` into a launch schema.
 */
export const refineRobinhoodLaunchOptions = (
  data: z.infer<typeof evmRobinhoodLaunchOptionsSchema>,
  ctx: z.RefinementCtx,
) => {
  validateStockWindow(data, ctx);
  if (data.tokenOption) {
    validateStockWindow(data.tokenOption, ctx, ['tokenOption']);
  }
  if (data.rwa) {
    validateBasketWeights(data.rwa.basketMode, data.rwa.rewardAssets, ctx, [
      'rwa',
      'rewardAssets',
    ]);
    if (data.rwa.customWalletRewards) {
      for (const [key, basket] of Object.entries(
        data.rwa.customWalletRewards,
      )) {
        validateBasketWeights(basket.basketMode, basket.assets, ctx, [
          'rwa',
          'customWalletRewards',
          key,
          'assets',
        ]);
      }
    }
  }
};

/** @deprecated Use refineRobinhoodLaunchOptions */
export const refineFlatTokenOptionFields = refineRobinhoodLaunchOptions;

/**
 * Map SDK RWA config (`stock` tickers/aliases or raw addresses) to the API wire
 * shape (addresses only). Call before POSTing flash / LBP create payloads.
 */
export const resolveRwaConfigForApi = (
  rwa: z.infer<typeof rwaObjectSchema>,
): {
  basketMode: z.infer<typeof rwaBasketModeSchema>;
  rewardAssets: ResolvedRwaRewardAsset[];
  customWalletRewards?: Record<
    string,
    {
      basketMode: z.infer<typeof rwaBasketModeSchema>;
      assets: ResolvedRwaRewardAsset[];
    }
  >;
} => ({
  basketMode: rwa.basketMode,
  rewardAssets: withDefaultNativeRewardAsset(
    rwa.rewardAssets.map(resolveRwaRewardAsset),
  ),
  ...(rwa.customWalletRewards && {
    customWalletRewards: Object.fromEntries(
      Object.entries(rwa.customWalletRewards).map(([key, basket]) => [
        key,
        {
          basketMode: basket.basketMode,
          assets: withDefaultNativeRewardAsset(
            basket.assets.map(resolveRwaRewardAsset),
          ),
        },
      ]),
    ),
  }),
});

export type RwaBasketMode = z.infer<typeof rwaBasketModeSchema>;
export type RwaRewardAsset = z.infer<typeof rwaRewardAssetSchema>;
export type RwaBasket = z.infer<typeof rwaBasketSchema>;
export type RwaConfig = z.infer<typeof rwaSchema>;
export type TokenOption = z.infer<typeof tokenOptionSchema>;
