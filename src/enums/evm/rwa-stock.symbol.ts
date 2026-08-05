/**
 * Tokenized stock symbols supported as Robinhood RWA reward assets.
 * Contract addresses from https://theindex.finance/#/docs.
 */
export enum RwaStockSymbol {
  AAPL = 'AAPL',
  AMD = 'AMD',
  AMZN = 'AMZN',
  BE = 'BE',
  COIN = 'COIN',
  GOOGL = 'GOOGL',
  INTC = 'INTC',
  META = 'META',
  MSFT = 'MSFT',
  MU = 'MU',
  NVDA = 'NVDA',
  PLTR = 'PLTR',
  SNDK = 'SNDK',
  SPCX = 'SPCX',
  TSLA = 'TSLA',
  USAR = 'USAR',
}

/** On-chain token addresses for {@link RwaStockSymbol} (Robinhood / The Index). */
export const RWA_STOCK_ADDRESSES: Record<RwaStockSymbol, `0x${string}`> = {
  [RwaStockSymbol.AAPL]: '0xaf3d76f1834a1d425780943c99ea8a608f8a93f9',
  [RwaStockSymbol.AMD]: '0x86923f96303d656e4aa86d9d42d1e57ad2023fdc',
  [RwaStockSymbol.AMZN]: '0x12f190a9f9d7d37a250758b26824b97ce941bf54',
  [RwaStockSymbol.BE]: '0x822cc93ffd030293e9842c30bbd678f530701867',
  [RwaStockSymbol.COIN]: '0x6330d8c3178a418788df01a47479c0ce7ccf450b',
  [RwaStockSymbol.GOOGL]: '0x2e0847e8910a9732eb3fb1bb4b70a580adad4fe3',
  [RwaStockSymbol.INTC]: '0xc72b96e0e48ecd4dc75e1e45396e26300bc39681',
  [RwaStockSymbol.META]: '0xc0d6457c16cc70d6790dd43521c899c87ce02f35',
  [RwaStockSymbol.MSFT]: '0xe93237c50d904957cf27e7b1133b510c669c2e74',
  [RwaStockSymbol.MU]: '0xff080c8ce2e5feadaca0da81314ae59d232d4afd',
  [RwaStockSymbol.NVDA]: '0xd0601ce157db5bdc3162bbac2a2c8af5320d9eec',
  [RwaStockSymbol.PLTR]: '0x894e1ec2d74ffe5aef8dc8a9e84686accb964f2a',
  [RwaStockSymbol.SNDK]: '0xb90a19ff0af67f7779aff50a882a9cff42446400',
  [RwaStockSymbol.SPCX]: '0x4a0e65a3eccec6dbe60ae065f2e7bb85fae35eea',
  [RwaStockSymbol.TSLA]: '0x322f0929c4625ed5bad873c95208d54e1c003b2d',
  [RwaStockSymbol.USAR]: '0xd917b029c761d264c6a312bbbcda868658ef86a6',
};

/**
 * Common company-name aliases → ticker (lowercase keys).
 * Lets agents/users say "Apple" / "Tesla" instead of only `AAPL` / `TSLA`.
 */
export const RWA_STOCK_NAME_ALIASES: Record<string, RwaStockSymbol> = {
  apple: RwaStockSymbol.AAPL,
  amd: RwaStockSymbol.AMD,
  amazon: RwaStockSymbol.AMZN,
  bloom: RwaStockSymbol.BE,
  bloomenergy: RwaStockSymbol.BE,
  coinbase: RwaStockSymbol.COIN,
  google: RwaStockSymbol.GOOGL,
  alphabet: RwaStockSymbol.GOOGL,
  intel: RwaStockSymbol.INTC,
  meta: RwaStockSymbol.META,
  facebook: RwaStockSymbol.META,
  microsoft: RwaStockSymbol.MSFT,
  micron: RwaStockSymbol.MU,
  nvidia: RwaStockSymbol.NVDA,
  palantir: RwaStockSymbol.PLTR,
  sandisk: RwaStockSymbol.SNDK,
  spacex: RwaStockSymbol.SPCX,
  tesla: RwaStockSymbol.TSLA,
  usar: RwaStockSymbol.USAR,
};

/** Resolve a ticker or company alias to {@link RwaStockSymbol}, or `undefined` if unknown. */
export const resolveRwaStockSymbol = (
  value: string,
): RwaStockSymbol | undefined => {
  const normalized = value.trim().toUpperCase();
  if ((Object.values(RwaStockSymbol) as string[]).includes(normalized)) {
    return normalized as RwaStockSymbol;
  }

  const alias = RWA_STOCK_NAME_ALIASES[value.trim().toLowerCase()];
  return alias;
};

/** Resolve a ticker/alias to its on-chain address. Throws if unknown. */
export const resolveRwaStockAddress = (
  stock: RwaStockSymbol | string,
): `0x${string}` => {
  const symbol =
    typeof stock === 'string' && !(stock in RWA_STOCK_ADDRESSES)
      ? resolveRwaStockSymbol(stock)
      : (stock as RwaStockSymbol);

  if (!symbol || !(symbol in RWA_STOCK_ADDRESSES)) {
    throw new Error(
      `Unknown RWA stock "${stock}". Supported: ${Object.values(RwaStockSymbol).join(', ')}`,
    );
  }

  return RWA_STOCK_ADDRESSES[symbol];
};
