import {
  boardFeePerLaunchPackageSchema,
  metadataUrlSchema,
  numberStringSchema,
} from 'schema/common';
import { solanaChainIdSchema } from 'schema/common/sdk-input/solana-chain-id.schema';
import { z } from 'zod';

export const createSolanaBoardApiSchema = z.object({
  chainId: solanaChainIdSchema,
  signer: z.string(),
  seed: z.string(),
  metaData: metadataUrlSchema,
  fees: boardFeePerLaunchPackageSchema,
  flashLaunchFeePer: numberStringSchema,
});
