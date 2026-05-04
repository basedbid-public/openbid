import { V4Fees } from '@interfaces/v4-fees';

export interface LbpFees {
  buyPoolCreator: number; // max 1%
  sellPoolCreator: number; // max 1%
  buyReferral: number; // max 1%
  graduation: number; // max 2.5%

  /** defined if LBP has `Fee Builder` enabled  */
  v4?: V4Fees;
}
