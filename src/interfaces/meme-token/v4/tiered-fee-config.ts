export interface TieredFeeConfig {
  buyFeesBps: number[];
  sellFeesBps: number[];
  buyFeeTierAmountLevels: bigint[];
  sellFeeTierAmountLevels: bigint[];
}
