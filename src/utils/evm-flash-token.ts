/** Wei of virtual ETH per marketCap unit, calibrated from based.bid Base responses. */
const VIRTUAL_ETH_WEI_PER_MARKET_CAP_UNIT = 5498997997986328383n;
const MARKET_CAP_UNIT = 10_000n;

const FLASH_LAUNCH_FUNCTION_NAMES = new Set([
  'customFlashLaunchV4',
  'simpleFlashLaunchV4',
  'customFlashLaunchV3',
  'simpleFlashLaunchV3',
]);

export const deriveVirtualEthWei = (marketCap: number): string => {
  return (
    (BigInt(marketCap) * VIRTUAL_ETH_WEI_PER_MARKET_CAP_UNIT) /
    MARKET_CAP_UNIT
  ).toString();
};

/** based.bid may return null virtualEth on newer EVM chains until backend support lands. */
export const patchFlashLaunchApiArgs = (
  functionName: string,
  args: unknown[],
  marketCap: number,
): void => {
  if (!FLASH_LAUNCH_FUNCTION_NAMES.has(functionName)) {
    return;
  }

  const poolInitialData = args[4];
  if (!Array.isArray(poolInitialData) || poolInitialData[5] != null) {
    return;
  }

  poolInitialData[5] = deriveVirtualEthWei(marketCap);
};
