export interface DynamicFeeConfig {
  minBaseFeeBpsBuy: number;
  minBaseFeeBpsSell: number;
  maxBaseFeeBpsBuy: number;
  maxBaseFeeBpsSell: number;
  baseFeeFactorBuy: number;
  baseFeeFactorSell: number;
  defaultBaseFeeBpsBuy: number;
  defaultBaseFeeBpsSell: number;
  surgeDecayPeriodSeconds: number;
  surgeMultiplierPpm: number;
  perSwapMode: boolean;
  capAutoTuneStepPpm: number;
  capAutoTuneIntervalSeconds: number;
}
